// utils/notifications.ts
// Everything notification-related in one place.
// The old code scheduled notifications without EVER asking permission. On Android 13+ that means
// nothing is shown, and there was no Android notification channel either.
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const CHANNEL_ID = "appointments";
let configured = false;

async function configure() {
  if (configured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Appointments",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  configured = true;
}

/** Asks for permission if needed. Returns true when notifications are allowed. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    await configure();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/** Schedules 24h / 2h / 1h reminders. Returns how many were scheduled (0 if not allowed). */
export async function scheduleAppointmentAlerts(appointmentTime: Date, clinicName: string): Promise<number> {
  if (!(await ensureNotificationPermission())) return 0;

  const alerts = [
    { hoursBefore: 24, title: "Appointment tomorrow", body: `Your dental appointment at ${clinicName} is tomorrow.` },
    { hoursBefore: 2, title: "Appointment in 2 hours", body: `Time to head to ${clinicName} soon.` },
    { hoursBefore: 1, title: "Dental appointment reminder", body: "Your appointment is in 1 hour!" },
  ];

  let scheduled = 0;
  for (const a of alerts) {
    const when = new Date(appointmentTime.getTime() - a.hoursBefore * 3600 * 1000);
    if (when.getTime() <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: a.title, body: a.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL_ID },
    });
    scheduled++;
  }
  return scheduled;
}

/** Fires a test notification in a few seconds. Returns false if notifications aren't allowed. */
export async function sendTestNotification(): Promise<boolean> {
  if (!(await ensureNotificationPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: "Cleared test", body: "Notifications are working." },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL_ID },
  });
  return true;
}