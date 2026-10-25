// shared/tools.ts
import { supabase } from "../contexts/AuthContext";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const CLINICS = [
  { id: "clinic-1", name: "Bright Smile Dental", price: 80 },
  { id: "clinic-2", name: "City Dental Care", price: 95 },
  { id: "clinic-3", name: "Gentle Touch Dentistry", price: 70 },
];

const SLOTS = [
  { slot_id: "slot-1", time: "10:00 AM" },
  { slot_id: "slot-2", time: "2:00 PM" },
];

// Helper to schedule local notifications
async function scheduleLocalAlert(appointmentTime: Date) {
  if (Platform.OS === "web") return;
  
  await Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const triggerDate = new Date(appointmentTime);
  triggerDate.setHours(triggerDate.getHours() - 1);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Dental Appointment Reminder",
      body: "Your appointment is in 1 hour! Don't forget your checklist.",
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
}

export async function executeTool(
  tool: string,
  args: Record<string, any>,
  userId?: string
): Promise<{ ok: true; output: string } | { ok: false; error: string }> {
  try {
    switch (tool) {
      case "analyze_symptoms":
        await delay(600);
        return { ok: true, output: JSON.stringify({ urgency: "routine", treatment_type: "cavity_check" }) };

      case "search_dentists":
        await delay(800);
        return { ok: true, output: JSON.stringify(CLINICS) };

      case "check_availability":
        await delay(600);
        return { ok: true, output: JSON.stringify(SLOTS) };

      case "book_appointment": {
        await delay(1000);
        // Deterministic failure for demo
        if (args.slot_id === "slot-2" || args.slot_id === "FIRST_AVAILABLE" || args.slot_id === "FROM_STEP_3") {
          return { ok: false, error: "Slot no longer available" };
        }

        // WOW FEATURE: Write to actual Supabase Database!
        if (userId) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(10, 0, 0, 0); // Fake appointment for tomorrow at 10am

          await supabase.from("appointments").insert({
            user_id: userId,
            user_email: "demo@cleared.app",
            clinic_name: "Bright Smile Dental",
            appointment_time: tomorrow.toISOString(),
          });

          // WOW FEATURE: Schedule local notification
          await scheduleLocalAlert(tomorrow);
        }

        return { ok: true, output: JSON.stringify({ confirmation_id: "conf-xyz" }) };
      }

      case "prepare_visit_checklist":
        await delay(300);
        return { ok: true, output: JSON.stringify(["Bring insurance card", "Arrive 10 min early"]) };

      case "schedule_reminder":
        await delay(400);
        return { ok: true, output: JSON.stringify({ scheduled: true }) };

      default:
        return { ok: false, error: `Unknown tool: ${tool}` };
    }
  } catch (err: any) {
    return { ok: false, error: err.message || "Tool execution failed" };
  }
}