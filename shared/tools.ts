// shared/tools.ts
import * as Location from "expo-location";
import { supabase } from "../contexts/AuthContext";
import { scheduleAppointmentAlerts } from "../utils/notifications";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

// Turn on to rehearse the "Retry / Skip" screens. It used to be hardwired at 30%, which made
// 3 in 10 real bookings fail for no reason.
const SIMULATE_BOOKING_FAILURES = false;

const SLOTS = [
  { slot_id: "slot-1", time: "10:00 AM", hour: 10 },
  { slot_id: "slot-2", time: "2:00 PM", hour: 14 },
];

interface Clinic {
  id: string;
  name: string;
  price: number | null; // null = unknown (OpenStreetMap has no prices; we no longer invent them)
  phone?: string;
  address?: string;
  lat?: number;
  lon?: number;
  demo?: boolean; // true = made-up placeholder clinic
}

// Placeholder clinics used when GPS/search fails. They are NOT real businesses.
const FALLBACK_CLINICS: Clinic[] = [
  { id: "c1", name: "Bright Smile Dental", price: 80, address: "123 Main St", demo: true },
  { id: "c2", name: "City Dental Care", price: 95, address: "456 Oak Ave", demo: true },
  { id: "c3", name: "Gentle Touch Dentistry", price: 70, address: "789 Pine Rd", demo: true },
];

// Remembers the last search so "book_appointment" books a clinic that was actually found.
let lastClinics: Clinic[] = [];

function pickClinic(args: Record<string, any>): Clinic {
  const pool = lastClinics.length ? lastClinics : FALLBACK_CLINICS;
  const wantedId = args.clinic_id ?? args.id;
  const wantedName = typeof args.clinic_name === "string" ? args.clinic_name.toLowerCase() : null;
  const byRef = pool.find((c) => c.id === wantedId || (wantedName && c.name.toLowerCase() === wantedName));
  if (byRef) return byRef;

  const maxPrice = Number(args.max_price);
  if (Number.isFinite(maxPrice) && maxPrice > 0) {
    const affordable = pool.find((c) => c.price !== null && c.price <= maxPrice);
    if (affordable) return affordable;
  }
  return pool[0];
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
        // STUB: always answers "routine". Replace with a real triage call before launch.
        await delay(600);
        return { ok: true, output: JSON.stringify({ urgency: "routine", treatment_type: "cavity_check" }) };

      case "search_dentists": {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            lastClinics = FALLBACK_CLINICS;
            return { ok: true, output: JSON.stringify(FALLBACK_CLINICS) };
          }

          // Can hang for a long time indoors, so cap it.
          const loc = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            12000,
            "Location"
          );

          if (loc.coords.latitude === 0 && loc.coords.longitude === 0) {
            lastClinics = FALLBACK_CLINICS;
            return { ok: true, output: JSON.stringify(FALLBACK_CLINICS) };
          }

          const query = `[out:json][timeout:10];node["amenity"="dentist"](around:5000,${loc.coords.latitude},${loc.coords.longitude});out 5;`;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 12000);
          let data: any;
          try {
            const response = await fetch("https://overpass-api.de/api/interpreter", {
              method: "POST",
              body: query,
              signal: controller.signal,
            });
            data = await response.json();
          } finally {
            clearTimeout(timer);
          }

          if (!data?.elements || data.elements.length === 0) {
            lastClinics = FALLBACK_CLINICS;
            return { ok: true, output: JSON.stringify(FALLBACK_CLINICS) };
          }

          const clinics: Clinic[] = data.elements.map((el: any) => {
            const t = el.tags ?? {};
            const address = [t["addr:housenumber"], t["addr:street"], t["addr:city"]].filter(Boolean).join(", ");
            return {
              id: `osm-${el.id}`,
              name: t.name || "Dental clinic",
              price: null,
              phone: t.phone || t["contact:phone"] || undefined,
              address: address || undefined,
              lat: el.lat,
              lon: el.lon,
            } as Clinic;
          });
          lastClinics = clinics;
          return { ok: true, output: JSON.stringify(clinics) };
        } catch {
          // No internet, timeout, etc.
          lastClinics = FALLBACK_CLINICS;
          return { ok: true, output: JSON.stringify(FALLBACK_CLINICS) };
        }
      }

      case "check_availability":
        // STUB: fixed slots. Replace with a real scheduling API.
        await delay(600);
        return { ok: true, output: JSON.stringify(SLOTS) };

      case "book_appointment": {
        await delay(1000);

        if (SIMULATE_BOOKING_FAILURES && Math.random() < 0.3) {
          return { ok: false, error: "Slot was just taken by another user." };
        }

        const clinic = pickClinic(args);
        const slot = SLOTS.find((s) => s.slot_id === args.slot_id) ?? SLOTS[0];

        const when = new Date();
        when.setDate(when.getDate() + 1);
        when.setHours(slot.hour, 0, 0, 0);

        if (userId) {
          // The result used to be ignored, so a failed save still showed "Booked Successfully".
          const row = { user_id: userId, user_email: userEmail || null, clinic_name: clinic.name, appointment_time: when.toISOString() };
          let error: { message: string } | null = null;
          // After a database change the API can take a few seconds to notice; retry quietly before giving up.
          for (let attempt = 0; attempt < 4; attempt++) {
            ({ error } = await supabase.from("appointments").insert(row));
            if (!error || !/schema cache|could not find/i.test(error.message)) break;
            await delay(1500 * (attempt + 1));
          }
          if (error) {
            const stale = /schema cache|could not find/i.test(error.message);
            return {
              ok: false,
              error: stale
                ? "Booking storage isn't set up yet. In Supabase, run supabase/appointments_fix.sql once, then tap Retry step."
                : `Couldn't save your booking (${error.message}).`,
            };
          }
        }

        let alerts = 0;
        try {
          alerts = await scheduleAppointmentAlerts(when, clinic.name);
        } catch {
          // Reminders are a bonus; never fail the booking because of them.
        }

        return {
          ok: true,
          output: JSON.stringify({
            confirmation_id: `CLR-${Date.now().toString(36).toUpperCase()}`,
            appointment_time: when.toISOString(),
            clinic: { name: clinic.name, phone: clinic.phone, address: clinic.address, lat: clinic.lat, lon: clinic.lon, demo: !!clinic.demo },
            local_alerts_scheduled: alerts,
          }),
        };
      }

      case "generate_care_plan":
        // STUB: same four tips for everyone.
        await delay(600);
        return {
          ok: true,
          output: JSON.stringify([
            "Avoid very cold or hot foods until evaluated.",
            "Use desensitizing toothpaste and avoid hard chewing.",
            "Rinse gently with warm salt water twice a day.",
            "Take over-the-counter pain relief if needed.",
          ]),
        };

      case "prepare_visit_checklist":
        // The plan schema allows this tool but there was no implementation, so the step used to fail
        // with "Unknown tool". Minimal checklist until a real one exists.
        await delay(400);
        return {
          ok: true,
          output: JSON.stringify(["Bring a photo ID", "List any medications you take", "Note when the pain started", "Arrive 10 minutes early"]),
        };

      case "schedule_reminder":
        // STUB: nothing is sent. Local reminders are scheduled inside book_appointment.
        await delay(400);
        return { ok: true, output: JSON.stringify({ scheduled: true }) };

      default:
        return { ok: false, error: `Unknown tool: ${tool}` };
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Tool execution failed" };
  }
}