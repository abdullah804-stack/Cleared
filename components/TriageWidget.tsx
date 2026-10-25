// components/TriageWidget.tsx
import { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

const LOCATIONS = [
  { id: "front", label: "Front", icon: "happy-outline" },
  { id: "molar", label: "Molar", icon: "sad-outline" },
  { id: "gums", label: "Gums", icon: "pulse-outline" },
];

export function TriageWidget({ onComplete }: { onComplete: (prompt: string) => void }) {
  const [location, setLocation] = useState<string | null>(null);
  const [painLevel, setPainLevel] = useState(5);

  const handleGenerate = () => {
    if (!location) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const prompt = `I have pain in my ${location} teeth. The pain level is ${painLevel} out of 10. Find me a dentist open this weekend under $100 and book the earliest available.`;
    onComplete(prompt);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Symptom Check</Text>
      <Text style={styles.subtitle}>Where does it hurt?</Text>
      
      <View style={styles.locationRow}>
        {LOCATIONS.map((loc) => (
          <Pressable
            key={loc.id}
            style={({ pressed }) => [styles.locBtn, location === loc.id && styles.locBtnActive, pressed && { opacity: 0.8 }]}
            onPress={() => { Haptics.selectionAsync(); setLocation(loc.id); }}
          >
            <Ionicons name={loc.icon as any} size={24} color={location === loc.id ? colors.accent : colors.textMuted} />
            <Text style={[styles.locText, location === loc.id && styles.locTextActive]}>{loc.label}</Text>
          </Pressable>
        ))}
      </View>

      {location && (
        <View style={styles.painContainer}>
          <Text style={styles.subtitle}>Pain Level: <Text style={{ color: colors.accent, fontWeight: "700" }}>{painLevel}/10</Text></Text>
          <View style={styles.sliderRow}>
            {[2, 4, 6, 8, 10].map((level) => (
              <Pressable
                key={level}
                style={[styles.painDot, painLevel >= level && styles.painDotActive]}
                onPress={() => { Haptics.selectionAsync(); setPainLevel(level); }}
              >
                <Text style={[styles.painText, painLevel >= level && styles.painTextActive]}>{level}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.generateBtn} onPress={handleGenerate}>
            <Text style={styles.generateText}>Find Dentist Now</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#FFF", padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  title: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  locationRow: { flexDirection: "row", gap: spacing.sm },
  locBtn: { flex: 1, alignItems: "center", padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  locBtnActive: { borderColor: colors.accent, backgroundColor: "#E0E7FF" },
  locText: { fontSize: 13, fontWeight: "500", color: colors.textMuted, marginTop: spacing.xs },
  locTextActive: { color: colors.accent, fontWeight: "600" },
  painContainer: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  sliderRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm, marginBottom: spacing.lg },
  painDot: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  painDotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  painText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  painTextActive: { color: "#FFF" },
  generateBtn: { flexDirection: "row", backgroundColor: colors.accent, padding: spacing.md, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  generateText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});