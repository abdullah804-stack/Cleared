// app/_layout.tsx
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { initAuditDb } from "../shared/audit";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { BiometricGate } from "../components/BiometricGate";
import { colors } from "../constants/theme";

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [checkingConsent, setCheckingConsent] = useState(true);
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    async function check() {
      const consent = await SecureStore.getItemAsync("has_consented");
      setHasConsent(consent === "true");
      setCheckingConsent(false);
    }
    check();
  }, []);

  useEffect(() => {
    if (loading || checkingConsent) return;
    
    const inAuthGroup = segments[0] === "(auth)";
    const inConsent = segments[0] === "consent";

    if (!hasConsent && !inConsent) {
      router.replace("/consent");
    } else if (hasConsent && !user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (hasConsent && user && (inAuthGroup || inConsent)) {
      router.replace("/");
    }
  }, [user, loading, hasConsent, checkingConsent, segments]);

  if (loading || checkingConsent) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerShadowVisible: false, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.background }, animation: "fade" }}>
      <Stack.Screen name="consent" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="plan" options={{ title: "Plan", headerBackTitle: "Back" }} />
      <Stack.Screen name="audit" options={{ title: "Audit Log" }} />
      <Stack.Screen name="appointment" options={{ title: "Appointment", headerBackVisible: false }} />
      <Stack.Screen name="emergency" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initAuditDb().catch(console.error);
  }, []);

  return (
    <AuthProvider>
      <BiometricGate>
        <StatusBar style="auto" />
        <RootLayoutNav />
      </BiometricGate>
    </AuthProvider>
  );
}