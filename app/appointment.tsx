// app/appointment.tsx
import { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Dimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import ConfettiCannon from "react-native-confetti-cannon";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { generateClinicalPDF } from "../utils/pdf";

export default function AppointmentScreen() {
  const router = useRouter();
  const { request } = useLocalSearchParams<{ request: string }>();
  const { user } = useAuth();
  const confettiRef = useRef<any>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [appointmentTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [timeLeft, setTimeLeft] = useState(appointmentTime.getTime() - Date.now());

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    confettiRef.current?.start();

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

  const carePlan = [
    { title: "Dietary Restrictions", desc: "Avoid very cold or hot foods until evaluated." },
    { title: "Pain Management", desc: "Use desensitizing toothpaste and avoid hard chewing." },
    { title: "Oral Hygiene", desc: "Rinse gently with warm salt water twice a day." },
  ];

  const handleReadAloud = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      const text = carePlan.map(c => `${c.title}: ${c.desc}`).join(". ");
      Speech.speak(text, { onDone: () => setIsSpeaking(false) });
      setIsSpeaking(true);
    }
  };

  return (
    <Screen>
      <ConfettiCannon ref={confettiRef} count={100} origin={{x: Dimensions.get('window').width / 2, y: -20}} autoStart={false} fadeOut={true} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.successHeader}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={40} color="#FFF" />
          </View>
          <Text style={styles.title}>Booked Successfully</Text>
          <Text style={styles.subtitle}>Bright Smile Dental</Text>
        </View>

        <View style={styles.ticket}>
          <View style={styles.ticketTop}>
            <Text style={styles.timerLabel}>TIME UNTIL APPOINTMENT</Text>
            <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
          </View>
        </View>

        {/* AI CARE PLAN WITH SPEECH */}
        <View style={styles.carePlanCard}>
          <View style={styles.carePlanHeader}>
            <Text style={styles.sectionTitle}>Your Pre-Visit Care Plan</Text>
            <Pressable onPress={handleReadAloud} style={styles.speakerBtn}>
              <Ionicons name={isSpeaking ? "stop-circle" : "volume-high"} size={24} color={colors.accent} />
            </Pressable>
          </View>
          {carePlan.map((item, index) => (
            <View key={index} style={styles.careItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              <View style={styles.careTextContainer}>
                <Text style={styles.careItemTitle}>{item.title}</Text>
                <Text style={styles.careItemDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Button title="View Audit Log" onPress={() => router.push("/audit")} />
        <Button title="Book another" variant="ghost" onPress={() => router.replace("/")} style={{ marginTop: spacing.sm }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 120 },
  successHeader: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
  checkCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center", marginBottom: spacing.md, shadowColor: "#10B981", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  title: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 16, color: colors.textMuted },
  ticket: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl, overflow: "hidden" },
  ticketTop: { padding: spacing.xl, alignItems: "center" },
  timerLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  timerValue: { fontSize: 48, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"], letterSpacing: 2 },
  
  carePlanCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.xl },
  carePlanHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  speakerBtn: { padding: spacing.xs, backgroundColor: "#E0E7FF", borderRadius: radius.full },
  careItem: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  careTextContainer: { flex: 1 },
  careItemTitle: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 2 },
  careItemDesc: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});