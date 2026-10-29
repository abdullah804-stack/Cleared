// components/TriageWidget.tsx
// NOTE: not currently used by any screen (the home screen has its own Quick Triage cards).
// Kept themed and working in case you want a guided symptom check later.
import { useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors, ThemeColors, radius, spacing, shadows, glow, type } from "../constants/theme";

const LOCATIONS = [
  { id: "front", label: "Front", icon: "happy-outline" },
  { id: "molar", label: "Molar", icon: "sad-outline" },
  { id: "gums", label: "Gums", icon: "pulse-outline" },
];

export function TriageWidget({ onComplete }: { onComplete: (prompt: string) => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [location, setLocation] = useState<string | null>(null);
  const [painLevel, setPainLevel] = useState(5);

  const handleGenerate = () => {
    if (!location) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // No hardcoded budget/currency: the plan screen lets the user set one.
    const area = location === "gums" ? "gums" : `${location} teeth`;
    onComplete(`I have pain in my ${area}. The pain level is ${painLevel} out of 10. Find me a dentist open this weekend and book the earliest available.`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Symptom Check</Text>
      <Text style={styles.subtitle}>Where does it hurt?</Text>

      <View style={styles.locationRow}>
        {LOCATIONS.map((loc) => {
          const active = location === loc.id;
          return (
            <Pressable
              key={loc.id}
              style={({ pressed }) => [styles.locBtn, active && styles.locBtnActive, pressed && { opacity: 0.85 }]}
              onPress={() => {
                Haptics.selectionAsync();
                setLocation(loc.id);
              }}
            >
              <Ionicons name={loc.icon as any} size={24} color={active ? colors.accentStrong : colors.textMuted} />
              <Text style={[styles.locText, active && styles.locTextActive]}>{loc.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {location && (
        <View style={styles.painContainer}>
          <Text style={styles.subtitle}>
            Pain level: <Text style={{ color: colors.accentStrong, fontWeight: "700" }}>{painLevel}/10</Text>
          </Text>
          <View style={styles.sliderRow}>
            {[2, 4, 6, 8, 10].map((level) => (
              <Pressable
                key={level}
                style={[styles.painDot, painLevel >= level && styles.painDotActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setPainLevel(level);
                }}
              >
                <Text style={[styles.painText, painLevel >= level && styles.painTextActive]}>{level}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={({ pressed }) => [styles.generateBtn, pressed && { opacity: 0.9 }]} onPress={handleGenerate}>
            <Text style={styles.generateText}>Find a dentist</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.onAccent} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
      ...shadows.md,
    },
    title: { ...type.heading, color: colors.text, marginBottom: spacing.xs },
    subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
    locationRow: { flexDirection: "row", gap: spacing.sm },
    locBtn: {
      flex: 1,
      alignItems: "center",
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    locBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    locText: { fontSize: 13, fontWeight: "500", color: colors.textMuted, marginTop: spacing.xs },
    locTextActive: { color: colors.accentStrong, fontWeight: "700" },
    painContainer: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    sliderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
    painDot: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceAlt,
    },
    painDotActive: { backgroundColor: colors.accent },
    painText: { fontSize: 14, fontWeight: "700", color: colors.textMuted },
    painTextActive: { color: colors.onAccent },
    generateBtn: {
      flexDirection: "row",
      backgroundColor: colors.accent,
      height: 52,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      ...glow(colors.accent, 0.25),
    },
    generateText: { color: colors.onAccent, fontSize: 16, fontWeight: "600" },
  });