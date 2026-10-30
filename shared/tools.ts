// shared/tools.ts
import { supabase } from "../contexts/AuthContext";
import { Platform } from "react-native";
import * as Location from "expo-location";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SLOTS = [
  { slot_id: "slot-1", time: "10:00 AM" },
  { slot_id: "slot-2", time: "2:00 PM" },
];

// Fallback with real-looking PK numbers (for demo)
const FALLBACK_CLINICS = [
  { id: "c1", name: "Smile Care Dental", price: 80, phone: "+923001234567", address: "Main Boulevard" },
  { id: "c2", name: "City Dental Clinic", price: 95, phone: "+923017654321", address: "Gulberg III" },
  { id: "c3", name: "Gentle Touch Dentistry", price: 70, phone: "+923219876543", address: "DHA Phase 5" },
];

async function scheduleLocalAlerts(appointmentTime: Date) {
  if (Platform.OS === "web") return;
  const Notifications = await import("expo-notifications");
  await Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });

  const now = Date.now();
  
  // 24h Before
  const trigger24h = new Date(appointmentTime); trigger24h.setHours(trigger24h.getHours() - 24);
  if (trigger24h.getTime() > now) {
    await Notifications.scheduleNotificationAsync({ 
      content: { title: "Appointment Tomorrow", body: "Your dental appointment is tomorrow." }, 
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger24h } 
    });
  }

  // 2h Before
  const trigger2h = new Date(appointmentTime); trigger2h.setHours(trigger2h.getHours() - 2);
  if (trigger2h.getTime() > now) {
    await Notifications.scheduleNotificationAsync({ 
      content: { title: "Appointment in 2 Hours", body: "Time to head to your dental clinic soon." }, 
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger2h } 
    });
  }
  
  // 1h Before
  const trigger1h = new Date(appointmentTime); trigger1h.setHours(trigger1h.getHours() - 1);
  if (trigger1h.getTime() > now) {
    await Notifications.scheduleNotificationAsync({ 
      content: { title: "Dental Appointment Reminder", body: "Your appointment is in 1 hour!" }, 
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger1h } 
    });
  }

  // NEW: 6-Month Recall (180 Days Later)
  const sixMonthsLater = new Date(appointmentTime);
  sixMonthsLater.setDate(sixMonthsLater.getDate() + 180);
  sixMonthsLater.setHours(10, 0, 0, 0); // 10 AM on that day

  if (sixMonthsLater.getTime() > now) {
    await Notifications.scheduleNotificationAsync({ 
      content: { 
        title: "Time for your 6-month checkup! 🦷", 
        body: "It's been 6 months since your last visit. Open Cleared to book your next cleaning and keep your smile healthy." 
      }, 
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: sixMonthsLater } 
    });
  }
}
// Global variable to hold the selected clinic for the booking step
let selectedClinicDetails: any = null;

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
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            selectedClinicDetails = FALLBACK_CLINICS[0];
            return { ok: true, output: JSON.stringify(FALLBACK_CLINICS) };
          }
          
          const loc = await Location.getCurrentPositionAsync({});
          if (loc.coords.latitude === 0 && loc.coords.longitude === 0) {
            selectedClinicDetails = FALLBACK_CLINICS[0];
            return { ok: true, output: JSON.stringify(FALLBACK_CLINICS) };
          }

          const query = `[out:json];node["amenity"="dentist"](around:5000,${loc.coords.latitude},${loc.coords.longitude});out 3;`;
          const response = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query });
          const data = await response.json();
          
          if (!data.elements || data.elements.length === 0) {
            selectedClinicDetails = FALLBACK_CLINICS[0];
            return { ok: true, output: JSON.stringify(FALLBACK_CLINICS) };
          }

          const clinics = data.elements.map((el: any, i: number) => ({
            id: `osm-${el.id}`, 
            name: el.tags.name || "Local Dental Clinic", 
            price: 70 + (i * 15),
            phone: el.tags.phone || "+923001234567", // Fallback PK number
            address: el.tags["addr:street"] || "Address on file",
            lat: el.lat, lon: el.lon,
          }));
          
          selectedClinicDetails = clinics[0]; // Save the first clinic for booking
          return { ok: true, output: JSON.stringify(clinics) };

        } catch (e) {
          selectedClinicDetails = FALLBACK_CLINICS[0];
          return { ok: true, output: JSON.stringify(FALLBACK_CLINICS) };
        }
      }

      case "check_availability":
        await delay(600);
        return { ok: true, output: JSON.stringify(SLOTS) };

      case "book_appointment": {
        await delay(1000);
        
        const isRandomFailure = Math.random() < 0.3;
        if (isRandomFailure) {
          return { ok: false, error: "Slot was just taken by another user." };
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);

        if (userId) {
          await supabase.from("appointments").insert({
            user_id: userId, 
            user_email: userEmail || "demo@cleared.app",
            clinic_name: selectedClinicDetails?.name || "Dental Clinic", 
            appointment_time: tomorrow.toISOString(),
          });
          await scheduleLocalAlerts(tomorrow);
        }

        return { ok: true, output: JSON.stringify({ 
          confirmation_id: "conf-xyz", 
          appointment_time: tomorrow.toISOString(),
          clinic_phone: selectedClinicDetails?.phone || "+923001234567",
          clinic_name: selectedClinicDetails?.name || "Dental Clinic"
        }) };
      }

      case "generate_care_plan":
        await delay(600);
        return { ok: true, output: JSON.stringify([
          "Avoid very cold or hot foods until evaluated.",
          "Use desensitizing toothpaste and avoid hard chewing.",
          "Rinse gently with warm salt water twice a day."
        ])};

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