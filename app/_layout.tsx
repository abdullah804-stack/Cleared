// app/_layout.tsx
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { initAuditDb } from "../shared/audit";
import { initJournalDb } from "../shared/journal";
import { initRoutineDb } from "../shared/routine";
import { initRecoveryDb } from "../shared/recovery";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { LanguageProvider } from "../contexts/LanguageContext";
import { BiometricGate } from "../components/BiometricGate";
import { colors } from "../constants/theme";

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    
    const inAuthGroup = segments[0] === "(auth)";

    // If not logged in, go to login. If logged in, go to home.
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
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
      <Stack.Screen name="plan" options={{ title: "Plan" }} />
      <Stack.Screen name="audit" options={{ title: "Audit Log" }} />
      <Stack.Screen name="appointment" options={{ title: "Appointment", headerBackVisible: false }} />
      <Stack.Screen name="emergency" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="journal" options={{ title: "Pain Journal" }} />
      <Stack.Screen name="estimator" options={{ title: "Cost Estimator" }} />
      <Stack.Screen name="routine" options={{ title: "Daily Routine" }} />
      <Stack.Screen name="appointments" options={{ title: "My Appointments" }} />
      <Stack.Screen name="recovery" options={{ title: "Recovery Plan" }} />
      <Stack.Screen name="dental-profile" options={{ title: "Dental Profile" }} />
      <Stack.Screen name="chat" options={{ title: "Ask Cleared" }} />
      <Stack.Screen name="photos" options={{ title: "Photo Timeline" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initAuditDb().catch(console.error);
    initJournalDb().catch(console.error);
    initRoutineDb().catch(console.error);
    initRecoveryDb().catch(console.error);
  }, []);

  return (
    <AuthProvider>
      <LanguageProvider>
        <BiometricGate>
          <StatusBar style="auto" />
          <RootLayoutNav />
        </BiometricGate>
      </LanguageProvider>
    </AuthProvider>
  );
}