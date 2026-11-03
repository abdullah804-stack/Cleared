// components/BiometricGate.tsx
import { ReactNode, useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import * as LocalAuthentication from "expo-local-authentication";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./Button";
import { Gradient, RadialGlow } from "./Gradient";
import { LogoMark } from "./LogoMark";
import { gradients, spacing } from "../constants/theme";

export function BiometricGate({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [failed, setFailed] = useState(false);

  const authenticate = useCallback(async () => {
    setFailed(false);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Cleared",
        fallbackLabel: "Use Passcode",
      });
      if (result.success) setIsAuthenticated(true);
      else setFailed(true);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsAuthenticated(true);
      return;
    }
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) {
          // No fingerprint/face set up on this phone: skip the lock
          setIsAuthenticated(true);
          return;
        }
        setIsSupported(true);
        authenticate();
      } catch {
        setIsAuthenticated(true);
      }
    })();
  }, [authenticate, enabled]);

  if (isAuthenticated) return <>{children}</>;

  // Always dark, like the launch screen, so unlocking feels like a continuation of it.
  return (
    <Gradient colors={gradients.hero} style={styles.container}>
      <StatusBar style="light" />
      <RadialGlow color="#0EA5E9" size={360} opacity={0.35} style={{ position: "absolute", top: -140, right: -120 }} />
      <RadialGlow color="#14B8A6" size={300} opacity={0.25} style={{ position: "absolute", bottom: -140, left: -110 }} />

      <Animated.View entering={ZoomIn.duration(500).springify().damping(14)} style={styles.ring}>
        <LogoMark size={58} />
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={14} color="#061523" />
        </View>
      </Animated.View>

      <Animated.Text entering={FadeInDown.delay(150).duration(400)} style={styles.title}>
        Cleared is locked
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(230).duration(400)} style={[styles.subtitle, failed && styles.subtitleFailed]}>
        {failed ? "That didn't work. Try again." : "Your health data stays private. Verify it's you to continue."}
      </Animated.Text>

      {isSupported && (
        <Animated.View entering={FadeIn.delay(350).duration(400)} style={styles.buttonWrap}>
          <Button title="Unlock" icon="finger-print" onPress={authenticate} />
        </Animated.View>
      )}
    </Gradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  ring: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: spacing.lg,
  },
  lockBadge: {
    position: "absolute",
    right: 4,
    bottom: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5EEAD4",
    borderWidth: 3,
    borderColor: "#0A2A44",
  },
  title: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5, marginBottom: spacing.sm },
  subtitle: { fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.72)", textAlign: "center", paddingHorizontal: spacing.md },
  subtitleFailed: { color: "#FDA4AF" },
  buttonWrap: { alignSelf: "stretch", marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});