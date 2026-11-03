// utils/cancelAlerts.ts
// Cancelling a visit used to delete the booking but leave its reminders scheduled, so the phone kept
// saying "Appointment tomorrow" for a visit that no longer existed.
//
// This finds the reminders by WHEN they fire (24h / 2h / 1h before the visit, and the six-month recall
// about 180 days after it), so it works for reminders scheduled by older builds too.
import * as Notifications from "expo-notifications";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

function triggerMs(trigger: any): number | null {
  if (!trigger) return null;
  if (typeof trigger.value === "number") return trigger.value; // Android: { type: "date", value: ms }
  if (trigger.date) return new Date(trigger.date).getTime(); // iOS / other shapes
  return null;
}

/** Cancels this appointment's reminders. Returns how many were removed. Never throws. */
export async function cancelAppointmentAlerts(appointmentTime: Date): Promise<number> {
  try {
    const start = appointmentTime.getTime();
    const exact = [24 * HOUR, 2 * HOUR, 1 * HOUR].map((d) => start - d);
    const recall = start + 180 * DAY;

    const all = await Notifications.getAllScheduledNotificationsAsync();
    let removed = 0;

    for (const n of all) {
      const data: any = n.content?.data;
      const when = triggerMs(n.trigger);
      const taggedMatch = data?.appointmentTime && new Date(data.appointmentTime).getTime() === start;
      const timeMatch = when !== null && (exact.some((t) => Math.abs(t - when) < 2000) || Math.abs(recall - when) < DAY);

      if (taggedMatch || timeMatch) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
        removed++;
      }
    }
    return removed;
  } catch {
    return 0;
  }
}