// shared/schema.ts
import { z } from "zod";

export const PlanStepSchema = z.object({
  id: z.string(),
  description: z.string(),
  tool: z.enum([
    "analyze_symptoms",
    "search_dentists",
    "check_availability",
    "book_appointment",
    "generate_care_plan",
    "prepare_visit_checklist",
    "schedule_reminder",
  ]),
  args: z.record(z.string(), z.unknown()),
  estimatedImpact: z.string(),
});

export const PlanSchema = z.object({
  // Upper bound stops a runaway AI reply from producing a huge plan the user can't review.
  steps: z.array(PlanStepSchema).min(1).max(10),
});