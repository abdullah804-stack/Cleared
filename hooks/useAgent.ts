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
  planEndpoint: string;
  anonKey: string;
  onAudit?: (entry: Omit<AuditEntry, "id" | "timestamp" | "userId">) => void;
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

  const plan = useCallback(
    async (input: string) => {
      startedAtRef.current = Date.now();
      dispatch({ type: "PLAN_START", input });
      audit("request.received", `User submitted: "${input.slice(0, 60)}..."`);

      // Helper function for the network call so we can retry
      const fetchPlan = async () => {
        const res = await fetch(opts.planEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${opts.anonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input }),
        });
        if (!res.ok) throw new Error(`Plan request failed (${res.status})`);
        return await res.json();
      };

      try {
        let body: any;
        try {
          body = await fetchPlan();
          // If the model returns an empty content string, throw to trigger a retry
          if (!body?.choices?.[0]?.message?.content) {
            throw new Error("Model returned empty response");
          }
        } catch (err) {
          // RETRY ONCE silently
          audit("plan.failed", "First attempt failed, retrying...", { error: String(err) });
          body = await fetchPlan();
          if (!body?.choices?.[0]?.message?.content) {
            throw new Error("Model returned empty response again after retry");
          }
        }

        const content: string = body.choices[0].message.content;

        // Aggressive extraction to find the JSON object
        const firstBrace = content.indexOf("{");
        const lastBrace = content.lastIndexOf("}");
        
        if (firstBrace === -1 || lastBrace === -1) {
          dispatch({ type: "PLAN_FAILED", reason: "Planner did not return a JSON object" });
          audit("plan.failed", "No JSON braces found", { raw: content.slice(0, 200) });
          return;
        }

        const cleanJson = content.substring(firstBrace, lastBrace + 1);

        let parsed: any;
        try {
          parsed = JSON.parse(cleanJson);
        } catch (e: any) {
          dispatch({ type: "PLAN_FAILED", reason: `Invalid JSON: ${e.message}` });
          audit("plan.failed", "Planner returned invalid JSON", { raw: content.slice(0, 200) });
          return;
        }

        if ("error" in parsed) {
          dispatch({ type: "PLAN_FAILED", reason: parsed.error });
          audit("plan.failed", parsed.error);
          return;
        }

        if (!Array.isArray(parsed.steps) || parsed.steps.length < 1) {
          dispatch({ type: "PLAN_FAILED", reason: "Plan has no valid steps" });
          audit("plan.failed", "Plan has no steps");
          return;
        }

        const steps = parsed.steps as PlanStep[];
        dispatch({ type: "PLAN_SUCCESS", plan: steps });
        audit("plan.created", `Plan with ${steps.length} steps`, {
          tools: steps.map((s) => s.tool),
        });

      } catch (err) {
        // If it fails twice, catch it here and show a clean message
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

    const result = await executeTool(step.tool as ToolName, step.args, opts.userId);
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