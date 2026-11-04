// hooks/useAgent.ts
import { useReducer, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PlanStep, StepResult } from "../shared/types";
import { executeTool } from "../shared/tools";
import { PlanSchema } from "../shared/schema";
import { getDefaultCurrency } from "../constants/pricing";
import { isEmergency } from "../constants/emergency";

export type AgentState =
  | { status: "IDLE" }
  | { status: "PLANNING"; input: string }
  | { status: "FAILED_PLANNING"; input: string; reason: string }
  | { status: "AWAITING_APPROVAL"; input: string; plan: PlanStep[]; stepByStep: boolean }
  | { status: "EXECUTING"; input: string; plan: PlanStep[]; currentIndex: number; results: StepResult[]; stepByStep: boolean }
  | { status: "STEP_FAILED"; input: string; plan: PlanStep[]; currentIndex: number; results: StepResult[]; reason: string; stepByStep: boolean }
  | { status: "PAUSED"; input: string; plan: PlanStep[]; currentIndex: number; results: StepResult[] }
  | { status: "COMPLETED"; input: string; plan: PlanStep[]; results: StepResult[]; startedAt: number; endedAt: number }
  | { status: "ABORTED"; input: string; plan: PlanStep[]; results: StepResult[] };

export type AgentAction =
  | { type: "PLAN_START"; input: string }
  | { type: "PLAN_SUCCESS"; plan: PlanStep[] }
  | { type: "PLAN_FAILED"; reason: string }
  | { type: "REMOVE_STEP"; stepId: string }
  | { type: "EDIT_STEP"; stepId: string; newArgs: Record<string, any> }
  | { type: "APPROVE"; stepByStep: boolean }
  | { type: "REJECT" }
  | { type: "STEP_SUCCESS"; result: StepResult }
  | { type: "STEP_FAILURE"; result: StepResult; reason: string }
  | { type: "SKIP_STEP" }
  | { type: "RETRY_STEP" }
  | { type: "RESUME_PAUSED" }
  | { type: "ABORT" }
  | { type: "COMPLETE"; endedAt: number }
  | { type: "RESET" };

function reducer(state: AgentState, action: AgentAction): AgentState {
  switch (action.type) {
    case "PLAN_START":
      return { status: "PLANNING", input: action.input };

    case "PLAN_SUCCESS":
      if (state.status !== "PLANNING") return state;
      return { status: "AWAITING_APPROVAL", input: state.input, plan: action.plan, stepByStep: false };

    case "PLAN_FAILED":
      if (state.status !== "PLANNING") return state;
      return { status: "FAILED_PLANNING", input: state.input, reason: action.reason };

    case "REMOVE_STEP":
      if (state.status !== "AWAITING_APPROVAL") return state;
      return { ...state, plan: state.plan.filter((s) => s.id !== action.stepId) };

    case "EDIT_STEP":
      if (state.status !== "AWAITING_APPROVAL") return state;
      return {
        ...state,
        plan: state.plan.map((s) => (s.id === action.stepId ? { ...s, args: { ...s.args, ...action.newArgs } } : s)),
      };

    case "APPROVE":
      if (state.status !== "AWAITING_APPROVAL") return state;
      return { status: "EXECUTING", input: state.input, plan: state.plan, currentIndex: 0, results: [], stepByStep: action.stepByStep };

    case "REJECT":
      if (state.status !== "AWAITING_APPROVAL") return state;
      return { status: "IDLE" };

    case "STEP_SUCCESS": {
      if (state.status !== "EXECUTING") return state;
      const nextIndex = state.currentIndex + 1;
      const newResults = [...state.results, action.result];

      if (state.stepByStep && nextIndex < state.plan.length) {
        return { status: "PAUSED", input: state.input, plan: state.plan, currentIndex: nextIndex, results: newResults };
      }
      return { ...state, currentIndex: nextIndex, results: newResults };
    }

    case "STEP_FAILURE":
      if (state.status !== "EXECUTING") return state;
      return {
        status: "STEP_FAILED",
        input: state.input,
        plan: state.plan,
        currentIndex: state.currentIndex,
        results: [...state.results, action.result],
        reason: action.reason,
        stepByStep: state.stepByStep,
      };

    case "SKIP_STEP":
      if (state.status !== "STEP_FAILED") return state;
      return {
        status: "EXECUTING",
        input: state.input,
        plan: state.plan,
        currentIndex: state.currentIndex + 1,
        results: [...state.results, { stepId: state.plan[state.currentIndex].id, status: "skipped", durationMs: 0 }],
        stepByStep: state.stepByStep,
      };

    case "RETRY_STEP":
      if (state.status !== "STEP_FAILED") return state;
      return {
        status: "EXECUTING",
        input: state.input,
        plan: state.plan,
        currentIndex: state.currentIndex,
        results: state.results.slice(0, -1),
        stepByStep: state.stepByStep,
      };

    case "RESUME_PAUSED":
      if (state.status !== "PAUSED") return state;
      return { status: "EXECUTING", input: state.input, plan: state.plan, currentIndex: state.currentIndex, results: state.results, stepByStep: false };

    case "ABORT":
      if (!("plan" in state)) return state;
      return {
        status: "ABORTED",
        input: state.input,
        plan: state.plan,
        results: "results" in state ? state.results : [],
      };

    case "COMPLETE":
      if (state.status !== "EXECUTING") return state;
      return { status: "COMPLETED", input: state.input, plan: state.plan, results: state.results, startedAt: 0, endedAt: action.endedAt };

    case "RESET":
      return { status: "IDLE" };

    default:
      return state;
  }
}

interface UseAgentOptions {
  planEndpoint: string;
  anonKey: string;
  userId: string;
  userEmail?: string;
  onAudit?: (entry: { type: string; description: string; detail?: Record<string, unknown> }) => void | Promise<void>;
}

function friendlyError(err: any): string {
  if (err?.name === "AbortError") return "The request took too long.";
  if (err?.name === "ZodError") return "The AI returned a plan we couldn't read.";
  const msg = String(err?.message ?? "");
  if (/JSON Parse error|Unexpected end of input|Unexpected token/i.test(msg)) return "The AI is busy right now. Please try again in a moment.";
  if (/network request failed|failed to fetch|network/i.test(msg)) return "No internet connection.";
  return msg || "Something went wrong.";
}

export function useAgent(opts: UseAgentOptions) {
  const [state, dispatch] = useReducer(reducer, { status: "IDLE" } as AgentState);
  const router = useRouter();

  // Keep latest values in refs so every callback below stays stable.
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const stateRef = useRef(state);
  stateRef.current = state;
  const runningRef = useRef(false); // blocks double-running a step (e.g. booking twice)

  // Every meaningful event goes to the audit log. (Previously this was defined but never called,
  // so the Audit Log screen was always empty.)
  const audit = useCallback((type: string, description: string, detail?: Record<string, unknown>) => {
    try {
      Promise.resolve(optsRef.current.onAudit?.({ type, description, detail })).catch(() => {});
    } catch {}
  }, []);

  const plan = useCallback(
    // emergencyText = ONLY what the person typed. The text sent to the AI also contains triage lines like
    // "Swelling: No", and scanning that would flag every single request as an emergency.
    async (input: string, opts?: { emergencyText?: string }) => {
      dispatch({ type: "PLAN_START", input });
      audit("request.received", "Asked for a care plan", { input });

      if (isEmergency(opts?.emergencyText ?? input)) {
        audit("emergency.detected", "Emergency keywords found, sent to urgent-care screen");
        dispatch({ type: "PLAN_FAILED", reason: "Emergency detected." });
        router.replace("/emergency"); // replace, so "Go back" returns home instead of a dead plan screen
        return;
      }

      // One attempt = ask the server, then read the plan out of the reply.
      // Free AI models sometimes answer with nothing, half a JSON, or a markdown fence. Those are
      // temporary, so we retry quietly instead of showing "JSON Parse error" to the user.
      class Retryable extends Error {}

      const attempt = async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 40000);
        try {
          const res = await fetch(optsRef.current.planEndpoint, {
            method: "POST",
            headers: { Authorization: `Bearer ${optsRef.current.anonKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ input, currency: getDefaultCurrency().code }),
            signal: controller.signal,
          });
          const text = await res.text();
          let body: any = null;
          try {
            body = text.trim() ? JSON.parse(text) : null;
          } catch {}

          if (!res.ok) {
            const msg = body?.error ? String(body.error) : `Server error (${res.status})`;
            if (res.status >= 500) throw new Retryable(msg);
            throw new Error(msg); // 4xx (too long, bad request): retrying won't help
          }

          const content: string | undefined = body?.choices?.[0]?.message?.content;
          if (!content || !content.trim()) throw new Retryable("The AI sent an empty reply.");

          const first = content.indexOf("{");
          const last = content.lastIndexOf("}");
          if (first === -1 || last <= first) throw new Retryable("The AI didn't return a plan.");

          let json: any;
          try {
            json = JSON.parse(content.substring(first, last + 1));
          } catch {
            throw new Retryable("The AI sent a broken plan.");
          }
          const checked = PlanSchema.safeParse(json);
          if (!checked.success) throw new Retryable("The AI returned a plan we couldn't read.");
          return { parsed: checked.data, body };
        } finally {
          clearTimeout(timer);
        }
      };

      try {
        let result: Awaited<ReturnType<typeof attempt>> | null = null;
        let lastErr: any = null;
        for (let i = 0; i < 3 && !result; i++) {
          try {
            result = await attempt();
          } catch (e: any) {
            lastErr = e;
            const retryable = e instanceof Retryable || e?.name === "AbortError" || /network request failed|failed to fetch/i.test(String(e?.message));
            if (!retryable || i === 2) break;
            await new Promise((r) => setTimeout(r, 800 * (i + 1)));
          }
        }
        if (!result) throw lastErr ?? new Error("Something went wrong.");
        const { parsed, body } = result;

        // The AI thinks in dollars ("budget 150"). On a PKR phone that would read "Rs 150",
        // so convert dollar-sized budgets to a rough rupee amount (rounded to the nearest 500).
        // (Skipped when the updated plan function already answered in rupees.)
        if (getDefaultCurrency().code === "PKR" && body.currency_applied !== "PKR") {
          for (const s of parsed.steps as PlanStep[]) {
            const p = Number((s.args as any)?.max_price);
            if (Number.isFinite(p) && p > 0 && p < 2000) {
              (s.args as any).max_price = Math.max(500, Math.round((p * 280) / 500) * 500);
            }
          }
        }
        audit("plan.created", `AI proposed ${parsed.steps.length} steps`, { tools: parsed.steps.map((s: PlanStep) => s.tool) });
        dispatch({ type: "PLAN_SUCCESS", plan: parsed.steps });
      } catch (err: any) {
        const reason = friendlyError(err);
        audit("plan.failed", `Plan failed: ${reason}`);
        dispatch({ type: "PLAN_FAILED", reason });
      }
    },
    [audit, router]
  );

  const removeStep = useCallback(
    (stepId: string) => {
      audit("plan.edited", "Removed a step from the plan", { stepId });
      dispatch({ type: "REMOVE_STEP", stepId });
    },
    [audit]
  );

  const editStep = useCallback(
    (stepId: string, newArgs: Record<string, any>) => {
      audit("plan.edited", "Edited a step", { stepId, newArgs });
      dispatch({ type: "EDIT_STEP", stepId, newArgs });
    },
    [audit]
  );

  const approve = useCallback(
    (stepByStep: boolean) => {
      const s = stateRef.current;
      if (s.status === "AWAITING_APPROVAL") {
        audit("user.approved", `Approved ${s.plan.length} steps`, { stepByStep, tools: s.plan.map((p) => p.tool) });
      }
      dispatch({ type: "APPROVE", stepByStep });
    },
    [audit]
  );

  const reject = useCallback(() => {
    audit("user.rejected", "Cancelled the plan");
    dispatch({ type: "REJECT" });
  }, [audit]);

  const skip = useCallback(() => {
    audit("user.skipped", "Skipped a failed step");
    dispatch({ type: "SKIP_STEP" });
  }, [audit]);

  const retry = useCallback(() => {
    audit("user.retried", "Retried a failed step");
    dispatch({ type: "RETRY_STEP" });
  }, [audit]);

  const resume = useCallback(() => dispatch({ type: "RESUME_PAUSED" }), []);
  const abort = useCallback(() => dispatch({ type: "ABORT" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const executeCurrent = useCallback(async () => {
    const s = stateRef.current;
    if (s.status !== "EXECUTING" || runningRef.current) return;

    const step = s.plan[s.currentIndex];
    if (!step) {
      audit("run.completed", "All steps finished", { steps: s.plan.length });
      dispatch({ type: "COMPLETE", endedAt: Date.now() });
      return;
    }

    runningRef.current = true;
    const started = Date.now();
    try {
      const result = await executeTool(step.tool, step.args, optsRef.current.userId, optsRef.current.userEmail);
      const durationMs = Date.now() - started;

      if (result.ok) {
        if (step.tool === "generate_care_plan") {
          await AsyncStorage.setItem("current_care_plan", result.output);
        }
        // The appointment screen reads this; without it it always showed "tomorrow 10:00".
        if (step.tool === "book_appointment") {
          await AsyncStorage.setItem("current_booking", result.output);
        }
        audit("tool.completed", step.description, { tool: step.tool, durationMs });
        dispatch({ type: "STEP_SUCCESS", result: { stepId: step.id, status: "success", output: result.output, durationMs } });
      } else {
        audit("tool.failed", `${step.description}: ${result.error}`, { tool: step.tool, durationMs });
        dispatch({ type: "STEP_FAILURE", result: { stepId: step.id, status: "failure", error: result.error, durationMs }, reason: result.error });
      }
    } catch (e: any) {
      // A tool that throws used to leave the screen stuck on "Running..." forever.
      const reason = e?.message || "Unexpected error";
      audit("tool.failed", `${step.description}: ${reason}`, { tool: step.tool });
      dispatch({ type: "STEP_FAILURE", result: { stepId: step.id, status: "failure", error: reason, durationMs: Date.now() - started }, reason });
    } finally {
      runningRef.current = false;
    }
  }, [audit]);

  return { state, plan, approve, reject, skip, retry, resume, abort, reset, executeCurrent, removeStep, editStep };
}