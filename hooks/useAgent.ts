// hooks/useAgent.ts
import { useReducer, useCallback, useRef } from "react";
import type { PlanStep, StepResult, AuditEntry, AuditEventType, ToolName } from "../shared/types";
import { executeTool } from "../shared/tools";

export type AgentState =
  | { status: "IDLE" }
  | { status: "PLANNING"; input: string }
  | { status: "FAILED_PLANNING"; input: string; reason: string }
  | { status: "PLAN_READY"; input: string; plan: PlanStep[] }
  | { status: "AWAITING_APPROVAL"; input: string; plan: PlanStep[] }
  | { status: "REJECTED"; input: string }
  | {
      status: "EXECUTING";
      input: string;
      plan: PlanStep[];
      currentIndex: number;
      results: StepResult[];
    }
  | {
      status: "STEP_FAILED";
      input: string;
      plan: PlanStep[];
      currentIndex: number;
      results: StepResult[];
      reason: string;
    }
  | {
      status: "COMPLETED";
      input: string;
      plan: PlanStep[];
      results: StepResult[];
      startedAt: number;
      endedAt: number;
    }
  | {
      status: "ABORTED";
      input: string;
      plan: PlanStep[];
      results: StepResult[];
    };

export type AgentAction =
  | { type: "PLAN_START"; input: string }
  | { type: "PLAN_SUCCESS"; plan: PlanStep[] }
  | { type: "PLAN_FAILED"; reason: string }
  | { type: "APPROVE" }
  | { type: "REJECT" }
  | { type: "STEP_SUCCESS"; result: StepResult }
  | { type: "STEP_FAILURE"; result: StepResult; reason: string }
  | { type: "SKIP_STEP" }
  | { type: "ABORT" }
  | { type: "COMPLETE"; endedAt: number }
  | { type: "RESET" };

function reducer(state: AgentState, action: AgentAction): AgentState {
  switch (action.type) {
    case "PLAN_START":
      return { status: "PLANNING", input: action.input };

    case "PLAN_SUCCESS":
      if (state.status !== "PLANNING") return state;
      return { status: "AWAITING_APPROVAL", input: state.input, plan: action.plan };

    case "PLAN_FAILED":
      if (state.status !== "PLANNING") return state;
      return { status: "FAILED_PLANNING", input: state.input, reason: action.reason };

    case "APPROVE":
      if (state.status !== "AWAITING_APPROVAL") return state;
      return {
        status: "EXECUTING",
        input: state.input,
        plan: state.plan,
        currentIndex: 0,
        results: [],
      };

    case "REJECT":
      if (state.status !== "AWAITING_APPROVAL") return state;
      return { status: "REJECTED", input: state.input };

    case "STEP_SUCCESS":
      if (state.status !== "EXECUTING") return state;
      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        results: [...state.results, action.result],
      };

    case "STEP_FAILURE":
      if (state.status !== "EXECUTING") return state;
      return {
        status: "STEP_FAILED",
        input: state.input,
        plan: state.plan,
        currentIndex: state.currentIndex,
        results: [...state.results, action.result],
        reason: action.reason,
      };

    case "SKIP_STEP":
      if (state.status !== "STEP_FAILED") return state;
      return {
        status: "EXECUTING",
        input: state.input,
        plan: state.plan,
        currentIndex: state.currentIndex + 1,
        results: [
          ...state.results,
          {
            stepId: state.plan[state.currentIndex].id,
            status: "skipped",
            durationMs: 0,
          },
        ],
      };

    case "ABORT":
      if (state.status !== "STEP_FAILED" && state.status !== "EXECUTING") return state;
      return {
        status: "ABORTED",
        input: state.input,
        plan: state.plan,
        results: state.status === "EXECUTING" ? state.results : state.results,
      };

    case "COMPLETE":
      if (state.status !== "EXECUTING") return state;
      return {
        status: "COMPLETED",
        input: state.input,
        plan: state.plan,
        results: state.results,
        startedAt: 0,
        endedAt: action.endedAt,
      };

    case "RESET":
      return { status: "IDLE" };

    default:
      return state;
  }
}

export interface UseAgentOptions {
  /** Supabase Edge Function URL, e.g. https://<ref>.supabase.co/functions/v1/plan */
  planEndpoint: string;
  /** Anon key for Authorization header */
  anonKey: string;
  /** Called for every audit-worthy transition */
  onAudit?: (entry: Omit<AuditEntry, "id" | "timestamp" | "userId">) => void;
  /** Current user id, used to stamp audit entries */
  userId?: string;
}

export function useAgent(opts: UseAgentOptions) {
  const [state, dispatch] = useReducer(reducer, { status: "IDLE" });
  const startedAtRef = useRef<number>(0);

  const audit = useCallback(
    (type: AuditEventType, description: string, detail?: Record<string, unknown>) => {
      opts.onAudit?.({ type, description, detail });
    },
    [opts],
  );

  /** Call /plan Edge Function and transition to AWAITING_APPROVAL or FAILED_PLANNING */
  const plan = useCallback(
    async (input: string) => {
      startedAtRef.current = Date.now();
      dispatch({ type: "PLAN_START", input });
      audit("request.received", `User submitted: "${input.slice(0, 60)}..."`);

      try {
        const res = await fetch(opts.planEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${opts.anonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input }),
        });

        const body = await res.json();

        if (!res.ok) {
          const reason =
            typeof body?.error === "string" ? body.error : `Plan request failed (${res.status})`;
          dispatch({ type: "PLAN_FAILED", reason });
          audit("plan.failed", reason, { status: res.status });
          return;
        }

        // Extract content from OpenRouter response
        const content: string | undefined = body?.choices?.[0]?.message?.content;
        if (!content) {
          dispatch({ type: "PLAN_FAILED", reason: "Empty response from planner" });
          audit("plan.failed", "Empty response from planner");
          return;
        }

        // Strip markdown fences if the model added them despite the prompt
        const cleaned = content.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

        let parsed: unknown;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          dispatch({ type: "PLAN_FAILED", reason: "Planner returned invalid JSON" });
          audit("plan.failed", "Planner returned invalid JSON", { raw: content.slice(0, 200) });
          return;
        }

        if (
          typeof parsed !== "object" ||
          parsed === null ||
          "error" in parsed ||
          !Array.isArray((parsed as { steps?: unknown }).steps)
        ) {
          const errMsg =
            (parsed as { error?: string })?.error ?? "Planner returned an unexpected shape";
          dispatch({ type: "PLAN_FAILED", reason: errMsg });
          audit("plan.failed", errMsg);
          return;
        }

        const steps = (parsed as { steps: PlanStep[] }).steps;
        if (steps.length < 1) {
          dispatch({ type: "PLAN_FAILED", reason: "Plan has no steps" });
          audit("plan.failed", "Plan has no steps");
          return;
        }

        dispatch({ type: "PLAN_SUCCESS", plan: steps });
        audit("plan.created", `Plan with ${steps.length} steps`, {
          tools: steps.map((s) => s.tool),
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Network error";
        dispatch({ type: "PLAN_FAILED", reason });
        audit("plan.failed", reason);
      }
    },
    [opts.planEndpoint, opts.anonKey, audit],
  );

  const approve = useCallback(() => {
    dispatch({ type: "APPROVE" });
    audit("user.approved", "User approved the plan");
  }, [audit]);

  const reject = useCallback(() => {
    dispatch({ type: "REJECT" });
    audit("user.rejected", "User rejected the plan");
  }, [audit]);

  const skip = useCallback(() => {
    dispatch({ type: "SKIP_STEP" });
    audit("user.skipped", "User skipped the failed step");
  }, [audit]);

  const abort = useCallback(() => {
    dispatch({ type: "ABORT" });
    audit("user.aborted", "User aborted the run");
  }, [audit]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  /**
   * Executes the current step. Called by the screen after APPROVE and after each SKIP.
   * The reducer advances currentIndex; the caller is responsible for re-invoking
   * `executeCurrent` until the state becomes COMPLETED or STEP_FAILED.
   */
  const executeCurrent = useCallback(async () => {
    if (state.status !== "EXECUTING") return;

    const step = state.plan[state.currentIndex];
    if (!step) {
      dispatch({ type: "COMPLETE", endedAt: Date.now() });
      audit("run.completed", "Run completed");
      return;
    }

    audit("tool.started", `Starting ${step.tool}`, { stepId: step.id });
    const start = Date.now();

    const result = await executeTool(step.tool as ToolName, step.args);
    const durationMs = Date.now() - start;

    if (result.ok) {
      dispatch({
        type: "STEP_SUCCESS",
        result: { stepId: step.id, status: "success", output: result.output, durationMs },
      });
      audit("tool.completed", `${step.tool} completed`, { stepId: step.id, durationMs });
    } else {
      dispatch({
        type: "STEP_FAILURE",
        result: { stepId: step.id, status: "failure", error: result.error, durationMs },
        reason: result.error,
      });
      audit("tool.failed", `${step.tool} failed: ${result.error}`, {
        stepId: step.id,
        durationMs,
      });
    }
  }, [state, audit]);

  return {
    state,
    plan,
    approve,
    reject,
    skip,
    abort,
    reset,
    executeCurrent,
  };
}