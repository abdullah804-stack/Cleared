// app/_layout.tsx
import { ReactNode, useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { initAuditDb } from "../shared/audit";
import { initJournalDb } from "../shared/journal";
import { initRoutineDb } from "../shared/routine";
import { initRecoveryDb } from "../shared/recovery";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { LanguageProvider } from "../contexts/LanguageContext";
import { BiometricGate } from "../components/BiometricGate";
import { AppSplash } from "../components/AppSplash";
import { useThemeColors } from "../constants/theme";

/**
 * Locks the app with fingerprint/face ONLY when it was opened with an existing signed-in session.
 * (Wrapping everything in the gate asked for a fingerprint BEFORE the login screen.)
 */
function GatedApp({ children }: { children: ReactNode }) {
  const colors = useThemeColors();
  const { user, loading } = useAuth();
  const [lockOnLaunch, setLockOnLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && lockOnLaunch === null) setLockOnLaunch(!!user);
  }, [loading, user, lockOnLaunch]);

  // The animated launch screen covers this moment, so just paint the background.
  if (lockOnLaunch === null) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  return <BiometricGate enabled={lockOnLaunch}>{children}</BiometricGate>;
}

/** Sits on top of everything; fades out once the session is known. */
function SplashHost() {
  const { loading } = useAuth();
  return <AppSplash ready={!loading} />;
}

function RootLayoutNav() {
  const colors = useThemeColors();
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

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const titled = (title: string, extra: object = {}) => ({ title, ...extra });

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
        animationDuration: 260,
      }}
    >
      <Stack.Screen name="(auth)/login" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="index" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="plan" options={titled("Your plan")} />
      <Stack.Screen name="triage" options={titled("Quick questions")} />
      <Stack.Screen name="audit" options={titled("Audit Log")} />
      <Stack.Screen name="appointment" options={titled("Appointment", { headerBackVisible: false, gestureEnabled: false })} />
      <Stack.Screen name="emergency" options={{ headerShown: false, animation: "fade_from_bottom" }} />
      <Stack.Screen name="settings" options={titled("Settings")} />
      <Stack.Screen name="journal" options={titled("Pain Journal")} />
      <Stack.Screen name="estimator" options={titled("Cost Estimator")} />
      <Stack.Screen name="routine" options={titled("Daily Routine")} />
      <Stack.Screen name="appointments" options={titled("My Visits")} />
      <Stack.Screen name="recovery" options={titled("Recovery Plan")} />
      <Stack.Screen name="dental-profile" options={titled("Dental Profile")} />
      <Stack.Screen name="case-card" options={titled("Case Card")} />
      <Stack.Screen name="visit-notes" options={titled("Visit Notes")} />
      <Stack.Screen name="emergency-aid" options={titled("First-Aid")} />
      <Stack.Screen name="chat" options={titled("Ask Cleared")} />
      <Stack.Screen name="photos" options={titled("Photo Timeline")} />
      <Stack.Screen name="family-profiles" options={titled("Family")} />
      <Stack.Screen name="community-prices" options={titled("Community Prices")} />
      <Stack.Screen name="kids-timer" options={titled("Kids Brushing")} />
      <Stack.Screen name="ramadan" options={titled("Ramadan Mode")} />
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
        <GatedApp>
          <StatusBar style="auto" />
          <RootLayoutNav />
        </GatedApp>
        <SplashHost />
      </LanguageProvider>
    </AuthProvider>
  );
}