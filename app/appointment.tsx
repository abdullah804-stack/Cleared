// app/appointment.tsx
import { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function AppointmentScreen() {
  const router = useRouter();
  const [appointmentTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  });
  
  const [timeLeft, setTimeLeft] = useState(appointmentTime.getTime() - Date.now());
  const [painLevel, setPainLevel] = useState<number | null>(null);

  const scale = useSharedValue(0);
  const animatedIconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withSequence(withSpring(1.2, { damping: 10 }), withSpring(1, { damping: 10 }));

    const interval = setInterval(() => {
      const remaining = appointmentTime.getTime() - Date.now();
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [appointmentTime]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePainCheckIn = (level: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPainLevel(level);
    if (level >= 8) {
      Alert.alert("High Pain Detected", "Your pain is severe. Would you like to look for an earlier slot or urgent care?", [
        { text: "No, wait", style: "cancel" },
        { text: "Find Urgent Care", onPress: () => router.push("/emergency-aid") }
      ]);
    }
  };

  const prepChecklist = ["Bring your ID card", "Arrive 10 mins early", "Bring any previous X-rays"];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.successHeader}>
          <Animated.View style={[styles.checkCircle, animatedIconStyle]}>
            <Ionicons name="checkmark" size={40} color="#FFF" />
          </Animated.View>
          <Text style={styles.title}>Appointment Booked</Text>
          <Text style={styles.subtitle}>Bright Smile Dental</Text>
        </View>

        {/* SMART COUNTDOWN */}
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>TIME UNTIL APPOINTMENT</Text>
          <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
          <Text style={styles.timerSub}>Tomorrow at 10:00 AM</Text>
        </View>

        {/* DAILY CHECK-IN */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Daily Check-in</Text>
          <Text style={styles.cardDesc}>How is your pain today?</Text>
          <View style={styles.painRow}>
            {[2, 4, 6, 8, 10].map(level => (
              <Pressable key={level} style={[styles.painBtn, painLevel === level && styles.painBtnActive]} onPress={() => handlePainCheckIn(level)}>
                <Text style={[styles.painText, painLevel === level && { color: "#FFF" }]}>{level}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* PREP CHECKLIST */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>How to Prepare</Text>
          {prepChecklist.map((item, i) => (
            <View key={i} style={styles.checklistItem}>
              <Ionicons name="square-outline" size={20} color={colors.border} />
              <Text style={styles.checklistText}>{item}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Button title="View Audit Log" onPress={() => router.push("/audit")} />
        <Button title="Back to Home" variant="ghost" onPress={() => router.replace("/")} style={{ marginTop: spacing.sm }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 120 },
  successHeader: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
  checkCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 16, color: colors.textMuted },
  
  timerCard: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, alignItems: "center", marginBottom: spacing.lg },
  timerLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  timerValue: { fontSize: 48, fontWeight: "800", color: colors.accent, fontVariant: ["tabular-nums"], marginBottom: spacing.xs },
  timerSub: { fontSize: 14, fontWeight: "600", color: colors.textMuted },

  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  cardDesc: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  
  painRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  painBtn: { flex: 1, aspectRatio: 1, backgroundColor: colors.background, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  painBtnActive: { backgroundColor: colors.danger, borderColor: colors.danger },
  painText: { fontSize: 16, fontWeight: "700", color: colors.text },

  checklistItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  checklistText: { fontSize: 15, color: colors.text },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});