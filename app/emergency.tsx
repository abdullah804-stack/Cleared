// app/emergency.tsx
import { useEffect, useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useThemeColors, ThemeColors, spacing, radius, shadows, glow, type } from "../constants/theme";
import { getRegion } from "../constants/region";

// Emergency numbers by country. A hardcoded "911" does nothing outside North America,
// so we pick the number from the phone's region and fall back to 112 (works in most of the world).
const EMERGENCY_NUMBERS: Record<string, string> = {
  US: "911", CA: "911",
  PK: "1122",
  GB: "999", AE: "999", BD: "999",
  IN: "112",
  AU: "000", NZ: "111",
  SA: "997",
};

function getEmergencyNumber(): string {
  try {
    const region = getRegion();
    if (region && EMERGENCY_NUMBERS[region]) return EMERGENCY_NUMBERS[region];
  } catch {}
  return "112";
}

export default function EmergencyScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const number = useMemo(getEmergencyNumber, []);

  // Slow breathing pulse on the halo so the screen feels alive but calm.
  const pulse = useSharedValue(0);
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    pulse.value = withRepeat(withTiming(1, { duration: 1400 }), -1, true);
  }, []);
  const halo = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.1 }], opacity: 0.7 + pulse.value * 0.3 }));

  const callEmergency = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Linking.openURL(`tel:${number}`);
  };

  const findUrgentCare = () => Linking.openURL("https://maps.google.com/?q=emergency+dentist+near+me");

  return (
    <Screen style={styles.container}>
      <Animated.View style={[styles.halo, halo]}>
        <View style={styles.iconBox}>
          <Ionicons name="warning" size={44} color={colors.onDanger} />
        </View>
      </Animated.View>

      <Animated.Text entering={FadeInDown.delay(100).duration(400)} style={styles.title}>
        Seek urgent care
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(180).duration(400)} style={styles.subtitle}>
        Based on your symptoms, this may be a dental emergency. Please don't wait for a regular appointment.
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(260).duration(400)} style={styles.card}>
        <Text style={styles.cardTitle}>Call emergency services</Text>
        <Pressable
          style={({ pressed }) => [styles.callButton, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          onPress={callEmergency}
          accessibilityRole="button"
          accessibilityLabel={`Call emergency number ${number}`}
        >
          <Ionicons name="call" size={22} color={colors.onDanger} />
          <Text style={styles.callText}>Call {number}</Text>
        </Pressable>
        <Text style={styles.caption}>Number based on your phone's region. Not right?</Text>
        <Text style={styles.caption}>Pakistan 1122 · US/Canada 911 · UK 999 · Europe & most others 112</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(340).duration(400)} style={{ width: "100%", gap: spacing.sm + 2, marginTop: spacing.md }}>
        <Button title="Find an emergency dentist nearby" icon="navigate" variant="ghost" onPress={findUrgentCare} />
        <Button title="First-aid steps while you wait" icon="medkit" variant="soft" onPress={() => router.push("/emergency-aid" as Href)} />
      </Animated.View>

      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
        <Text style={styles.backText}>Go back</Text>
      </Pressable>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { justifyContent: "center", alignItems: "center", padding: spacing.lg },
    halo: {
      width: 132,
      height: 132,
      borderRadius: 66,
      backgroundColor: colors.dangerMuted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
    },
    iconBox: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: colors.danger,
      alignItems: "center",
      justifyContent: "center",
      ...glow(colors.danger, 0.3),
    },
    title: { ...type.display, color: colors.text, marginBottom: spacing.sm, textAlign: "center" },
    subtitle: { fontSize: 16, color: colors.textMuted, textAlign: "center", lineHeight: 24, marginBottom: spacing.xl },
    card: {
      backgroundColor: colors.dangerMuted,
      padding: spacing.lg,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.danger + "33",
      width: "100%",
      alignItems: "center",
      ...shadows.sm,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.danger, marginBottom: spacing.md },
    callButton: {
      flexDirection: "row",
      backgroundColor: colors.danger,
      height: 58,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      alignSelf: "stretch",
      ...glow(colors.danger, 0.3),
    },
    callText: { color: colors.onDanger, fontSize: 18, fontWeight: "700" },
    caption: { ...type.caption, color: colors.textMuted, marginTop: spacing.sm, textAlign: "center" },
    back: { marginTop: spacing.lg, padding: spacing.sm },
    backText: { color: colors.textMuted, fontWeight: "600", fontSize: 15 },
  });