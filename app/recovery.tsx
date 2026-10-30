// app/recovery.tsx
import { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { toggleRecoveryDay, getRecoveryProgress } from "../shared/recovery";
import { Ionicons } from "@expo/vector-icons";

const RECOVERY_PLAN = [
  { day: 1, title: "Day 1: Rest & Ice", desc: "Apply ice for 15 mins. No hot foods or drinks. Rest as much as possible." },
  { day: 2, title: "Day 2: Gentle Rinse", desc: "Rinse gently with warm salt water 3 times a day. Soft foods only." },
  { day: 3, title: "Day 3: Resume Brushing", desc: "You can brush gently, but avoid the treated area. Continue salt water rinses." },
  { day: 4, title: "Day 4: Mild Activity", desc: "Most swelling should be gone. You can return to normal diet if comfortable." },
  { day: 5, title: "Day 5: Final Check", desc: "Ensure pain is subsiding. If you have severe pain, contact the clinic immediately." },
];

export default function RecoveryScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState<Record<number, boolean>>({});

  useEffect(() => {
    getRecoveryProgress().then(setProgress);
  }, []);

  const handleToggle = async (day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newState = !progress[day];
    setProgress({ ...progress, [day]: newState });
    await toggleRecoveryDay(day, newState);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Recovery Plan</Text>
          <Text style={styles.subtitle}>Follow your post-visit care instructions day by day.</Text>
        </View>

        <View style={styles.timeline}>
          {RECOVERY_PLAN.map((step, index) => {
            const isCompleted = progress[step.day];
            const isLast = index === RECOVERY_PLAN.length - 1;

            return (
              <View key={step.day} style={styles.timelineItem}>
                {/* Timeline line */}
                {!isLast && <View style={[styles.timelineLine, isCompleted && { backgroundColor: colors.accent }]} />}
                
                {/* Timeline dot / Checkbox */}
                <Pressable style={[styles.timelineDot, isCompleted && styles.timelineDotActive]} onPress={() => handleToggle(step.day)}>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  ) : (
                    <Text style={styles.dayNumber}>{step.day}</Text>
                  )}
                </Pressable>

                {/* Content Card */}
                <Pressable style={[styles.card, isCompleted && styles.cardActive]} onPress={() => handleToggle(step.day)}>
                  <Text style={[styles.cardTitle, isCompleted && styles.textDone]}>{step.title}</Text>
                  <Text style={[styles.cardDesc, isCompleted && styles.textDone]}>{step.desc}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <Button title="Back to Home" variant="ghost" onPress={() => router.replace("/")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 100 },
  header: { marginTop: spacing.md, marginBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  
  timeline: { paddingLeft: spacing.sm },
  timelineItem: { flexDirection: "row", marginBottom: spacing.xl, position: "relative" },
  timelineLine: { position: "absolute", left: 15, top: 32, bottom: -32, width: 2, backgroundColor: colors.border, zIndex: 0 },
  
  timelineDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginRight: spacing.md, zIndex: 1, marginTop: 4 },
  timelineDotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayNumber: { fontSize: 14, fontWeight: "700", color: colors.textMuted },
  
  card: { flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  cardActive: { backgroundColor: "#F0FDF4", borderColor: "#10B981" }, // Light green tint when done
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
  cardDesc: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  textDone: { color: "#166534", textDecorationLine: "line-through", opacity: 0.7 },
  
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});