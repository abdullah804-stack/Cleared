import { Platform } from "react-native";

export async function sendTestNotification(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const Notifications = await import("expo-notifications");

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== "granted") return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Cleared test notification",
      body: "This is a test notification.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });

  return true;
}
