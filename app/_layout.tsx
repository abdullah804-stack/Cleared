// app/_layout.tsx
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { initAuditDb } from "../shared/audit";
import { initJournalDb } from "../shared/journal";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { LanguageProvider } from "../contexts/LanguageContext";
import { ConsentProvider, useConsent } from "../contexts/ConsentContext";
import { BiometricGate } from "../components/BiometricGate";
import { useThemeColors } from "../constants/theme";

function RootLayoutNav() {
  const colors = useThemeColors();
  const { user, loading } = useAuth();
  const { hasConsent, checking: checkingConsent } = useConsent();
  const segments = useSegments();
  const router = useRouter();

  // Handle navigation
  useEffect(() => {
    if (loading || checkingConsent) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inConsent = segments[0] === "consent";

    // No consent yet -> consent screen
    if (!hasConsent && !inConsent) {
      router.replace("/consent");
    }
    // Consent given, not signed in -> login
    else if (hasConsent && !user && !inAuthGroup) {
      router.replace("/(auth)/login");
    }
    // Consent given and signed in, but still on auth/consent -> home
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
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.background },
        animation: "fade",
      }}
    >
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
        <ConsentProvider>
          <BiometricGate>
            <StatusBar style="auto" />
            <RootLayoutNav />
          </BiometricGate>
        </ConsentProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}