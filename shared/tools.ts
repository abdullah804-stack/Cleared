// shared/tools.ts
import { supabase } from "../contexts/AuthContext";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as Location from "expo-location";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SLOTS = [
  { slot_id: "slot-1", time: "10:00 AM" },
  { slot_id: "slot-2", time: "2:00 PM" },
];

async function scheduleLocalAlerts(appointmentTime: Date) {
  if (Platform.OS === "web") return;
  await Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });

  // 24 Hours Before
  const trigger24h = new Date(appointmentTime);
  trigger24h.setHours(trigger24h.getHours() - 24);
  await Notifications.scheduleNotificationAsync({
    content: { title: "Appointment Tomorrow", body: "Your dental appointment is tomorrow. Check your checklist!" },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger24h },
  });

  // 2 Hours Before
  const trigger2h = new Date(appointmentTime);
  trigger2h.setHours(trigger2h.getHours() - 2);
  await Notifications.scheduleNotificationAsync({
    content: { title: "Appointment in 2 Hours", body: "Time to head to Bright Smile Dental soon." },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger2h },
  });
}

export async function executeTool(
  tool: string,
  args: Record<string, any>,
  userId?: string,
  userEmail?: string
): Promise<{ ok: true; output: string } | { ok: false; error: string }> {
  try {
    switch (tool) {
      case "analyze_symptoms":
        await delay(600);
        return { ok: true, output: JSON.stringify({ urgency: "routine", treatment_type: "cavity_check" }) };

      case "search_dentists": {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          // Fallback if location denied
          return { ok: true, output: JSON.stringify([{ id: "c1", name: "City Dental", price: 80, phone: "555-0101", address: "123 Main St" }]) };
        }
        
        const loc = await Location.getCurrentPositionAsync({});
        const query = `[out:json];node["amenity"="dentist"](around:5000,${loc.coords.latitude},${loc.coords.longitude});out 3;`;
        const response = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query });
        const data = await response.json();
        
        if (!data.elements || data.elements.length === 0) {
          return { ok: true, output: JSON.stringify([{ id: "c1", name: "Bright Smile Dental", price: 90, phone: "555-0199", address: "456 Oak Ave" }]) };
        }

        const clinics = data.elements.map((el: any, i: number) => ({
          id: `osm-${el.id}`,
          name: el.tags.name || "Local Dental Clinic",
          price: 70 + (i * 15),
          phone: el.tags.phone || "555-123-4567",
          address: el.tags["addr:street"] || "Address on file",
          lat: el.lat,
          lon: el.lon,
        }));
        return { ok: true, output: JSON.stringify(clinics) };
      }

      case "check_availability":
        await delay(600);
        return { ok: true, output: JSON.stringify(SLOTS) };

      case "book_appointment": {
        await delay(1000);
        
        // RANDOMIZED FAILURE (30% chance to simulate a real API failure)
        const isRandomFailure = Math.random() < 0.3;
        if (isRandomFailure) {
          return { ok: false, error: "Slot was just taken by another user." };
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const timeString = tomorrow.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) + " at 10:00 AM";

        if (userId) {
          await supabase.from("appointments").insert({
            user_id: userId,
            user_email: userEmail || "demo@cleared.app",
            clinic_name: "Bright Smile Dental",
            appointment_time: tomorrow.toISOString(),
          });
          await scheduleLocalAlerts(tomorrow);
        }

        return { ok: true, output: JSON.stringify({ confirmation_id: "conf-xyz" }) };
      }

      case "prepare_visit_checklist":
        await delay(300);
        return { ok: true, output: JSON.stringify(["Bring insurance card", "Arrive 10 min early", "No hot drinks for 2 hours before"]) };

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