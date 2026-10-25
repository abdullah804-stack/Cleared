// shared/tools.ts
import { supabase } from "../contexts/AuthContext";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
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

// Added userId and userEmail to the parameters
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

// ... inside executeTool switch statement ...

      case "search_dentists": {
        // Get user's real location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          return { ok: false, error: "Location permission denied. Cannot find nearby dentists." };
        }
        
        const loc = await Location.getCurrentPositionAsync({});
        
        // Call OpenStreetMap Overpass API for real dental clinics nearby
        const query = `
          [out:json];
          node
            ["amenity"="dentist"]
            (around:5000, ${loc.coords.latitude}, ${loc.coords.longitude});
          out 3;
        `;
        
        const response = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: query,
        });
        
        const data = await response.json();
        
        if (!data.elements || data.elements.length === 0) {
          return { ok: false, error: "No dentists found nearby." };
        }

        // Format the real data for the AI
        const clinics = data.elements.map((el: any, i: number) => ({
          id: `osm-${el.id}`,
          name: el.tags.name || "Local Dental Clinic",
          price: 80 + (i * 10), // Mock price since OSM doesn't have pricing
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
        // Deterministic failure for demo
        if (args.slot_id === "slot-2" || args.slot_id === "FIRST_AVAILABLE" || args.slot_id === "FROM_STEP_3") {
          return { ok: false, error: "Slot no longer available" };
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const timeString = tomorrow.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) + " at 10:00 AM";

        // Write to Supabase Database & Schedule Local Notification
        if (userId) {
          await supabase.from("appointments").insert({
            user_id: userId,
            user_email: userEmail || "demo@cleared.app",
            clinic_name: "Bright Smile Dental",
            appointment_time: tomorrow.toISOString(),
          });
          await scheduleLocalAlert(tomorrow);
        }

        // Trigger the Email Reminder via Supabase Edge Function!
        try {
          await fetch("https://gevnakyvjxvnzasruzwh.supabase.co/functions/v1/send-reminder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: userEmail || "test@example.com",
              clinic_name: "Bright Smile Dental",
              time: timeString,
            }),
          });
        } catch (e) {
          console.log("Email failed to send", e);
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