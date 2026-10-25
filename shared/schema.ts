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
    "prepare_visit_checklist",
    "schedule_reminder",
  ]),
  args: z.record(z.any()),
  estimatedImpact: z.string(),
});

export const PlanSchema = z.object({
  steps: z.array(PlanStepSchema).min(1),
});