// app/triage.tsx
import { useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function TriageScreen() {
  const router = useRouter();
  const { request } = useLocalSearchParams<{ request: string }>();

  const [duration, setDuration] = useState("");
  const [painLevel, setPainLevel] = useState(5);
  const [swelling, setSwelling] = useState(false);
  const [fever, setFever] = useState(false);
  const [canEat, setCanEat] = useState(true);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // OFFLINE EMERGENCY RULE-BASED CHECK
    if (swelling || fever) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      router.replace("/emergency-aid");
      return;
    }

    // Build the enriched prompt for the AI
    const enrichedRequest = `
      Original request: "${request || "Dental issue"}".
      Additional Triage Info:
      - Duration: ${duration || "Not specified"}
      - Pain Level: ${painLevel}/10
      - Swelling: ${swelling ? "Yes" : "No"}
      - Fever: ${fever ? "Yes" : "No"}
      - Can Eat: ${canEat ? "Yes" : "No"}
      
      Please generate a plan based on this. If pain is 8+, prioritize urgent care. If budget is a concern, find low-cost clinics.
    `;

    router.replace({ pathname: "/plan", params: { request: enrichedRequest } });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Quick Check</Text>
          <Text style={styles.subtitle}>Help the AI understand your pain better.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>How long has it hurt?</Text>
          <View style={styles.row}>
            {["Today", "2-3 Days", "A Week+"].map((opt) => (
              <Pressable key={opt} style={[styles.pill, duration === opt && styles.pillActive]} onPress={() => setDuration(opt)}>
                <Text style={[styles.pillText, duration === opt && styles.pillTextActive]}>{opt}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Pain Level: {painLevel}/10</Text>
          <View style={styles.sliderRow}>
            {[2, 4, 6, 8, 10].map((lvl) => (
              <Pressable key={lvl} style={[styles.painDot, painLevel >= lvl && styles.painDotActive]} onPress={() => setPainLevel(lvl)}>
                <Text style={[styles.painText, painLevel >= lvl && styles.painTextActive]}>{lvl}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Do you have facial swelling?</Text>
            <Pressable onPress={() => setSwelling(!swelling)}>
              <Ionicons name={swelling ? "checkbox" : "square-outline"} size={28} color={swelling ? colors.danger : colors.border} />
            </Pressable>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Do you have a fever?</Text>
            <Pressable onPress={() => setFever(!fever)}>
              <Ionicons name={fever ? "checkbox" : "square-outline"} size={28} color={fever ? colors.danger : colors.border} />
            </Pressable>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Can you eat normally?</Text>
            <Pressable onPress={() => setCanEat(!canEat)}>
              <Ionicons name={canEat ? "checkbox" : "square-outline"} size={28} color={canEat ? colors.accent : colors.border} />
            </Pressable>
          </View>
        </View>

        <Button title="Continue to AI Planner" onPress={handleContinue} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  label: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  pill: { flex: 1, paddingVertical: spacing.md, alignItems: "center", backgroundColor: colors.background, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { fontSize: 14, fontWeight: "600", color: colors.text },
  pillTextActive: { color: "#FFF" },
  sliderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  painDot: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  painDotActive: { backgroundColor: colors.danger, borderColor: colors.danger },
  painText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  painTextActive: { color: "#FFF" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
});