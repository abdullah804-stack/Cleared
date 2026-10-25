// components/BiometricGate.tsx
import { useState, useEffect } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius } from "../constants/theme";

export function BiometricGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    async function checkBiometrics() {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        // If the phone doesn't have FaceID/Fingerprint, skip the lock
        setIsAuthenticated(true);
        return;
      }
      
      setIsSupported(true);
      authenticate();
    }
    checkBiometrics();
  }, []);

  const authenticate = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock Cleared",
      fallbackLabel: "Use Passcode",
    });
    if (result.success) {
      setIsAuthenticated(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Ionicons name="lock-closed" size={64} color={colors.accent} />
        <Text style={styles.title}>App Locked</Text>
        <Text style={styles.subtitle}>Cleared contains sensitive health data.</Text>
        {isSupported && (
          <Pressable style={styles.button} onPress={authenticate}>
            <Text style={styles.buttonText}>Unlock with FaceID / Fingerprint</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background, padding: spacing.xl },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: "center", marginBottom: spacing.xl },
  button: { backgroundColor: colors.accent, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.md },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});