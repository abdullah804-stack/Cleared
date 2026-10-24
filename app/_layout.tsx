// app/_layout.tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { initAuditDb } from "../shared/audit";

export default function RootLayout() {
  useEffect(() => {
    // Initialize the SQLite audit database on app start
    initAuditDb().catch((err) => {
      console.error("Failed to initialize audit DB:", err);
    });
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#FFFFFF",
          },
          headerShadowVisible: false,
          headerTintColor: "#111827", // Dark gray for text/icons
          headerTitleStyle: {
            fontWeight: "600",
          },
          contentStyle: {
            backgroundColor: "#F9FAFB", // Light gray background
          },
          // Locked design: no bouncy motion
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="plan" options={{ title: "Plan" }} />
        <Stack.Screen name="audit" options={{ title: "Audit Log" }} />
        <Stack.Screen name="appointment" options={{ title: "Appointment" }} />
      </Stack>
    </>
  );
}