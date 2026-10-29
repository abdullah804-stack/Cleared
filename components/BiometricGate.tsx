// components/BiometricGate.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors, ThemeColors, spacing, radius, glow, type } from "../constants/theme";

export function BiometricGate({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.lockHalo}>
          <View style={styles.lockCircle}>
            <Ionicons name="lock-closed" size={34} color={colors.onAccent} />
          </View>
        </View>
        <Text style={styles.title}>Cleared is locked</Text>
        <Text style={styles.subtitle}>
          {failed ? "That didn't work. Try again." : "Your health data stays private. Verify it's you to continue."}
        </Text>
        {isSupported && (
          <Pressable style={({ pressed }) => [styles.button, pressed && { opacity: 0.88 }]} onPress={authenticate}>
            <Ionicons name="finger-print" size={20} color={colors.onAccent} />
            <Text style={styles.buttonText}>Unlock</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
      padding: spacing.xl,
    },
    lockHalo: {
      width: 124,
      height: 124,
      borderRadius: 62,
      backgroundColor: colors.accentMuted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
    },
    lockCircle: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      ...glow(colors.accent, 0.3),
    },
    title: { ...type.title, color: colors.text, marginBottom: spacing.sm },
    subtitle: { fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: "center", marginBottom: spacing.xl, paddingHorizontal: spacing.md },
    button: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.accent,
      height: 54,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.md,
      ...glow(colors.accent, 0.25),
    },
    buttonText: { color: colors.onAccent, fontSize: 16, fontWeight: "600" },
  });