// hooks/useAgent.ts
import { useReducer, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PlanStep, StepResult } from "../shared/types";
import { executeTool } from "../shared/tools";
import { PlanSchema } from "../shared/schema";

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

// Words that mean "stop planning, get urgent help". English + Urdu.
const EMERGENCY_WORDS = [
  "swell", "fever", "breath", "swallow", "trauma", "accident", "blood", "unconscious", "chest pain", "knocked out",
  "سوجن", "بخار", "خون", "سانس", "نگل",
];
const isEmergency = (text: string) => {
  const lower = text.toLowerCase();
  return EMERGENCY_WORDS.some((w) => lower.includes(w));
};

function friendlyError(err: any): string {
  if (err?.name === "AbortError") return "The request took too long.";
  if (err?.name === "ZodError") return "The AI returned a plan we couldn't read.";
  const msg = String(err?.message ?? "");
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
    async (input: string) => {
      dispatch({ type: "PLAN_START", input });
      audit("PLAN_REQUESTED", "Asked for a care plan", { input });

      if (isEmergency(input)) {
        audit("EMERGENCY_DETECTED", "Emergency keywords found, sent to urgent-care screen");
        dispatch({ type: "PLAN_FAILED", reason: "Emergency detected." });
        router.replace("/emergency"); // replace, so "Go back" returns home instead of a dead plan screen
        return;
      }

      const fetchPlan = async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 45000);
        try {
          const res = await fetch(optsRef.current.planEndpoint, {
            method: "POST",
            headers: { Authorization: `Bearer ${optsRef.current.anonKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ input }),
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(`Server error (${res.status})`);
          return await res.json();
        } finally {
          clearTimeout(timer);
        }
      };

      try {
        let body: any = await fetchPlan();
        if (!body?.choices?.[0]?.message?.content) body = await fetchPlan();

        const content: string = body.choices[0].message.content;
        const firstBrace = content.indexOf("{");
        const lastBrace = content.lastIndexOf("}");
        if (firstBrace === -1 || lastBrace === -1) throw new Error("The AI didn't return a plan.");

        const parsed = PlanSchema.parse(JSON.parse(content.substring(firstBrace, lastBrace + 1)));
        audit("PLAN_GENERATED", `AI proposed ${parsed.steps.length} steps`, { tools: parsed.steps.map((s: PlanStep) => s.tool) });
        dispatch({ type: "PLAN_SUCCESS", plan: parsed.steps });
      } catch (err: any) {
        const reason = friendlyError(err);
        audit("PLAN_FAILED", `Plan failed: ${reason}`);
        dispatch({ type: "PLAN_FAILED", reason });
      }
    },
    [audit, router]
  );

  const removeStep = useCallback(
    (stepId: string) => {
      audit("PLAN_EDITED", "Removed a step from the plan", { stepId });
      dispatch({ type: "REMOVE_STEP", stepId });
    },
    [audit]
  );

  const editStep = useCallback(
    (stepId: string, newArgs: Record<string, any>) => {
      audit("PLAN_EDITED", "Edited a step", { stepId, newArgs });
      dispatch({ type: "EDIT_STEP", stepId, newArgs });
    },
    [audit]
  );

  const approve = useCallback(
    (stepByStep: boolean) => {
      const s = stateRef.current;
      if (s.status === "AWAITING_APPROVAL") {
        audit("PLAN_APPROVED", `Approved ${s.plan.length} steps`, { stepByStep, tools: s.plan.map((p) => p.tool) });
      }
      dispatch({ type: "APPROVE", stepByStep });
    },
    [audit]
  );

  const reject = useCallback(() => {
    audit("PLAN_REJECTED", "Cancelled the plan");
    dispatch({ type: "REJECT" });
  }, [audit]);

  const skip = useCallback(() => {
    audit("STEP_SKIPPED", "Skipped a failed step");
    dispatch({ type: "SKIP_STEP" });
  }, [audit]);

  const retry = useCallback(() => {
    audit("STEP_RETRIED", "Retried a failed step");
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
      audit("RUN_COMPLETED", "All steps finished", { steps: s.plan.length });
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
        audit("STEP_SUCCEEDED", step.description, { tool: step.tool, durationMs });
        dispatch({ type: "STEP_SUCCESS", result: { stepId: step.id, status: "success", output: result.output, durationMs } });
      } else {
        audit("STEP_FAILED", `${step.description}: ${result.error}`, { tool: step.tool, durationMs });
        dispatch({ type: "STEP_FAILURE", result: { stepId: step.id, status: "failure", error: result.error, durationMs }, reason: result.error });
      }
    } catch (e: any) {
      // A tool that throws used to leave the screen stuck on "Running..." forever.
      const reason = e?.message || "Unexpected error";
      audit("STEP_FAILED", `${step.description}: ${reason}`, { tool: step.tool });
      dispatch({ type: "STEP_FAILURE", result: { stepId: step.id, status: "failure", error: reason, durationMs: Date.now() - started }, reason });
    } finally {
      runningRef.current = false;
    }
  }, [audit]);

  return { state, plan, approve, reject, skip, retry, resume, abort, reset, executeCurrent, removeStep, editStep };
}