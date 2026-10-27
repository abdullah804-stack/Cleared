// hooks/useAgent.ts
import { useReducer, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PlanStep, StepResult, AuditEntry, AuditEventType } from "../shared/types";
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
        plan: state.plan.map(s => s.id === action.stepId ? { ...s, args: { ...s.args, ...action.newArgs } } : s)
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
      return { status: "STEP_FAILED", input: state.input, plan: state.plan, currentIndex: state.currentIndex, results: [...state.results, action.result], reason: action.reason, stepByStep: state.stepByStep };

    case "SKIP_STEP":
      if (state.status !== "STEP_FAILED") return state;
      return {
        status: "EXECUTING", input: state.input, plan: state.plan, currentIndex: state.currentIndex + 1,
        results: [...state.results, { stepId: state.plan[state.currentIndex].id, status: "skipped", durationMs: 0 }], stepByStep: state.stepByStep
      };

    case "RETRY_STEP":
      if (state.status !== "STEP_FAILED") return state;
      return { status: "EXECUTING", input: state.input, plan: state.plan, currentIndex: state.currentIndex, results: state.results.slice(0, -1), stepByStep: state.stepByStep };

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

export function useAgent(opts: any) {
  const [state, dispatch] = useReducer(reducer, { status: "IDLE" });
  const router = useRouter();
  const startedAtRef = useRef<number>(0);

  const audit = useCallback((type: AuditEventType, description: string, detail?: Record<string, unknown>) => {
    opts.onAudit?.({ type, description, detail });
  }, [opts]);

  const plan = useCallback(async (input: string) => {
    startedAtRef.current = Date.now();
    dispatch({ type: "PLAN_START", input });
    
    const emergencyKeywords = ["swelling", "fever", "breathing", "swallow", "trauma", "accident", "blood"];
    if (emergencyKeywords.some(k => input.toLowerCase().includes(k))) {
      dispatch({ type: "PLAN_FAILED", reason: "Emergency detected." });
      router.push("/emergency");
      return;
    }

    const fetchPlan = async () => {
      const res = await fetch(opts.planEndpoint, {
        method: "POST", headers: { Authorization: `Bearer ${opts.anonKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      return await res.json();
    };

    try {
      let body: any = await fetchPlan();
      if (!body?.choices?.[0]?.message?.content) body = await fetchPlan();

      const content: string = body.choices[0].message.content;
      const firstBrace = content.indexOf("{");
      const lastBrace = content.lastIndexOf("}");
      if (firstBrace === -1) throw new Error("No JSON");

      const parsed = PlanSchema.parse(JSON.parse(content.substring(firstBrace, lastBrace + 1)));
      dispatch({ type: "PLAN_SUCCESS", plan: parsed.steps });
    } catch (err: any) {
      dispatch({ type: "PLAN_FAILED", reason: err.message || "Invalid JSON" });
    }
  }, [opts.planEndpoint, opts.anonKey, router]);

  const removeStep = useCallback((stepId: string) => dispatch({ type: "REMOVE_STEP", stepId }), []);
  const editStep = useCallback((stepId: string, newArgs: any) => dispatch({ type: "EDIT_STEP", stepId, newArgs }), []);
  const approve = useCallback((stepByStep: boolean) => dispatch({ type: "APPROVE", stepByStep }), []);
  const reject = useCallback(() => dispatch({ type: "REJECT" }), []);
  const skip = useCallback(() => dispatch({ type: "SKIP_STEP" }), []);
  const retry = useCallback(() => dispatch({ type: "RETRY_STEP" }), []);
  const resume = useCallback(() => dispatch({ type: "RESUME_PAUSED" }), []);
  const abort = useCallback(() => dispatch({ type: "ABORT" }), []);

  const executeCurrent = useCallback(async () => {
    if (state.status !== "EXECUTING") return;
    const step = state.plan[state.currentIndex];
    if (!step) {
      dispatch({ type: "COMPLETE", endedAt: Date.now() });
      return;
    }

    const result = await executeTool(step.tool, step.args, opts.userId, opts.userEmail);
    
    if (result.ok) {
      if (step.tool === "generate_care_plan") {
        await AsyncStorage.setItem("current_care_plan", result.output);
      }
      dispatch({ type: "STEP_SUCCESS", result: { stepId: step.id, status: "success", output: result.output, durationMs: 1000 } });
    } else {
      dispatch({ type: "STEP_FAILURE", result: { stepId: step.id, status: "failure", error: result.error, durationMs: 1000 }, reason: result.error });
    }
  }, [state, opts.userId, opts.userEmail]);

  return { state, plan, approve, reject, skip, retry, resume, abort, executeCurrent, removeStep, editStep };
}