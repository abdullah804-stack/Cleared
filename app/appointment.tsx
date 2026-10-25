// app/appointment.tsx
import { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, Alert, Dimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Calendar from "expo-calendar";
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

  const [appointmentTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [timeLeft, setTimeLeft] = useState(appointmentTime.getTime() - Date.now());

  useEffect(() => {
    // Trigger Confetti and Haptics on mount
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

  const handleAddToCalendar = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === "granted") {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(c => c.isPrimary) || calendars[0];
      
      await Calendar.createEventAsync(defaultCalendar.id, {
        title: "Dental Appointment - Bright Smile",
        startDate: appointmentTime,
        endDate: new Date(appointmentTime.getTime() + 60 * 60 * 1000),
        location: "123 Dental Ave, City",
        notes: "Booked via Cleared App",
        alarms: [{ relativeOffset: -60 }],
      });
      Alert.alert("Success", "Added to your calendar!");
    } else {
      Alert.alert("Permission Denied", "Calendar access is required.");
    }
  };

  const handleExportPDF = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const fakeTrace = [
      "Analyzed symptoms: Patient reported tooth pain with cold water.",
      "Searched for dentists under $100.",
      "Checked availability for Saturday.",
      "Booked earliest available slot."
    ];
    generateClinicalPDF(user?.email || "demo@cleared.app", request || "Tooth pain", fakeTrace);
  };

  return (
    <Screen>
      {/* CONFETTI EFFECT */}
      <ConfettiCannon 
        ref={confettiRef} 
        count={100} 
        origin={{x: Dimensions.get('window').width / 2, y: -20}} 
        autoStart={false} 
        fadeOut={true}
      />

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
            <View style={styles.reminderBadge}>
              <Ionicons name="notifications" size={14} color="#166534" />
              <Text style={styles.reminderText}>Reminder scheduled</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.ticketBottom}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              <Text style={styles.detailText}>Tomorrow, 10:00 AM</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={18} color={colors.textMuted} />
              <Text style={styles.detailText}>123 Dental Ave, City</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Button title="Add to Calendar" onPress={handleAddToCalendar} variant="ghost" style={styles.flexBtn} />
          <Button title="Export PDF Summary" onPress={handleExportPDF} variant="ghost" style={styles.flexBtn} />
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
  timerValue: { fontSize: 48, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"], letterSpacing: 2, marginBottom: spacing.md },
  reminderBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F0FDF4", paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.full },
  reminderText: { fontSize: 13, color: "#166534", fontWeight: "600" },
  divider: { height: 1, backgroundColor: colors.border, borderStyle: "dashed", marginHorizontal: spacing.lg },
  ticketBottom: { padding: spacing.lg, gap: spacing.md, backgroundColor: "#FAFAFA" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  detailText: { fontSize: 15, color: colors.text, fontWeight: "500" },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl },
  flexBtn: { flex: 1 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});