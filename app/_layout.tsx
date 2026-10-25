// app/_layout.tsx
import { useEffect } from "react";
import { Slot, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { initAuditDb } from "../shared/audit";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { colors } from "../constants/theme";

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      // Redirect to home if authenticated
      router.replace("/");
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerShadowVisible: false, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.background }, animation: "fade" }}>
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="plan" options={{ title: "Plan", headerBackTitle: "Back" }} />
      <Stack.Screen name="audit" options={{ title: "Audit Log" }} />
      <Stack.Screen name="appointment" options={{ title: "Appointment", headerBackVisible: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initAuditDb().catch(console.error);
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootLayoutNav />
    </AuthProvider>
  );
}