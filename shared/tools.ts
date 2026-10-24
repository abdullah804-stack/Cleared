// shared/tools.ts
import type { ToolName } from "./types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface MockClinic {
  id: string;
  name: string;
  price: number;
}

export interface MockSlot {
  slot_id: string;
  time: string;
}

const CLINICS: MockClinic[] = [
  { id: "clinic-1", name: "Bright Smile Dental", price: 80 },
  { id: "clinic-2", name: "City Dental Care", price: 95 },
  { id: "clinic-3", name: "Gentle Touch Dentistry", price: 70 },
];

const SLOTS: MockSlot[] = [
  { slot_id: "slot-1", time: "10:00 AM" },
  { slot_id: "slot-2", time: "2:00 PM" }, // intentionally fails on booking
];

export async function executeTool(
  tool: ToolName,
  args: Record<string, unknown>,
): Promise<{ ok: true; output: string } | { ok: false; error: string }> {
  switch (tool) {
    case "analyze_symptoms": {
      await delay(500);
      return {
        ok: true,
        output: JSON.stringify({
          urgency: "routine",
          treatment_type: "cavity_check",
          note: "Not medical advice",
        }),
      };
    }

    case "search_dentists": {
      await delay(800);
      return {
        ok: true,
        output: JSON.stringify(CLINICS),
      };
    }

    case "check_availability": {
      await delay(600);
      return {
        ok: true,
        output: JSON.stringify(SLOTS),
      };
    }

    case "book_appointment": {
      await delay(1000);
      if (args.slot_id === "slot-2") {
        return { ok: false, error: "Slot no longer available" };
      }
      return {
        ok: true,
        output: JSON.stringify({
          confirmation_id: `conf-${Math.random().toString(36).slice(2, 10)}`,
          clinic_id: args.clinic_id,
          slot_id: args.slot_id,
        }),
      };
    }

    case "prepare_visit_checklist": {
      await delay(300);
      return {
        ok: true,
        output: JSON.stringify([
          "Bring your insurance card",
          "Arrive 10 minutes early",
          "List any medications you're taking",
        ]),
      };
    }

    case "schedule_reminder": {
      await delay(400);
      return {
        ok: true,
        output: JSON.stringify({
          scheduled: true,
          appointment_time: args.appointment_time,
        }),
      };
    }

    default: {
      const _exhaustive: never = tool;
      return { ok: false, error: `Unknown tool: ${_exhaustive}` };
    }
  }
}