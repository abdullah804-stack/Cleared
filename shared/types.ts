// shared/types.ts
export type ToolName =
  | "analyze_symptoms"
  | "search_dentists"
  | "check_availability"
  | "book_appointment"
  | "generate_care_plan"
  | "prepare_visit_checklist"
  | "schedule_reminder";

export interface PlanStep {
  id: string;
  description: string;
  tool: ToolName;
  args: Record<string, unknown>;
  estimatedImpact: string;
}

export interface StepResult {
  stepId: string;
  status: "success" | "failure" | "skipped";
  output?: string;
  error?: string;
  durationMs: number;
}

export type AuditEventType =
  | "request.received"
  | "plan.created"
  | "plan.failed"
  | "plan.edited"
  | "emergency.detected"
  | "user.approved"
  | "user.rejected"
  | "user.skipped"
  | "user.retried"
  | "user.aborted"
  | "tool.started"
  | "tool.completed"
  | "tool.failed"
  | "reminder.email.sent"
  | "reminder.local.scheduled"
  | "run.completed";

export interface AuditEntry {
  id: string;
  timestamp: number;
  userId: string;
  type: AuditEventType;
  description: string;
  detail?: Record<string, unknown>;
}