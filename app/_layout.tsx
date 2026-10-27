// app/_layout.tsx
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initAuditDb } from "../shared/audit";
import { initJournalDb } from "../shared/journal";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { LanguageProvider } from "../contexts/LanguageContext";
import { BiometricGate } from "../components/BiometricGate";
import { colors } from "../constants/theme";

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [checkingConsent, setCheckingConsent] = useState(true);
  const [hasConsent, setHasConsent] = useState(false);

  // 1. Check Consent
  useEffect(() => {
    async function check() {
      try {
        const secureConsent = await SecureStore.getItemAsync("has_consented");
        const asyncConsent = await AsyncStorage.getItem("has_consented");
        
        const consented = secureConsent === "true" || asyncConsent === "true";
        setHasConsent(consented);
      } catch (e) {
        console.error("Consent read error", e);
      } finally {
        setCheckingConsent(false);
      }
    }
    check();
  }, []);

  // 2. Handle Navigation
  useEffect(() => {
    if (loading || checkingConsent) return;
    
    // The segments array tells us exactly which screen we are on
    const inAuthGroup = segments[0] === "(auth)";
    const inConsent = segments[0] === "consent";

    // If no consent and not on consent screen -> go to consent
    if (!hasConsent && !inConsent) {
      router.replace("/consent");
    } 
    // If consent is given but no user and not on auth screen -> go to login
    else if (hasConsent && !user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } 
    // If user is logged in and consent is given, but we are still on auth/consent -> go to home
    else if (hasConsent && user && (inAuthGroup || inConsent)) {
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
      <Stack.Screen name="plan" options={{ title: "Plan" }} />
      <Stack.Screen name="audit" options={{ title: "Audit Log" }} />
      <Stack.Screen name="appointment" options={{ title: "Appointment", headerBackVisible: false }} />
      <Stack.Screen name="emergency" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="journal" options={{ title: "Pain Journal" }} />
      <Stack.Screen name="estimator" options={{ title: "Cost Estimator" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initAuditDb().catch(console.error);
    initJournalDb().catch(console.error);
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