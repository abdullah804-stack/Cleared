// app/appointment.tsx
import { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";

export default function AppointmentScreen() {
  const router = useRouter();
  
  // For the demo, we set the appointment to "tomorrow at 10:00 AM"
  const [appointmentTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  });

  const [timeLeft, setTimeLeft] = useState(appointmentTime.getTime() - Date.now());

  // Countdown timer logic
  useEffect(() => {
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
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  // Hardcoded checklist (we can connect this to the tool output later)
  const checklist = [
    "Bring your insurance card",
    "Arrive 10 minutes early",
    "List any medications you're taking"
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.header}>
          <Text style={styles.title}>You're booked!</Text>
          <Text style={styles.subtitle}>Bright Smile Dental · Saturday 10:00 AM</Text>
        </View>

        {/* COUNTDOWN CARD */}
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Time until appointment</Text>
          <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
          
          <View style={styles.reminderBadge}>
            <Text style={styles.reminderText}>🔔 Reminder scheduled for 1 hour before</Text>
          </View>
        </View>

        {/* CHECKLIST CARD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pre-Visit Checklist</Text>
          <View style={styles.checklist}>
            {checklist.map((item, i) => (
              <View key={i} style={styles.checkItem}>
                <View style={styles.checkCircle} />
                <Text style={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Button 
          title="Book another" 
          variant="ghost" 
          onPress={() => router.replace("/")} 
        />
        <Button 
          title="View Audit Log" 
          onPress={() => router.push("/audit")} 
          style={{ marginTop: spacing.sm }} 
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: spacing.xl },
  header: { marginTop: spacing.xl, marginBottom: spacing.lg, alignItems: "center" },
  title: { fontSize: 28, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: 15, color: colors.textMuted },
  
  timerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  timerLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.sm },
  timerValue: { fontSize: 40, fontWeight: "700", color: colors.accent, fontVariant: ["tabular-nums"], marginBottom: spacing.md },
  reminderBadge: { backgroundColor: "#F0FDF4", paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.full },
  reminderText: { fontSize: 12, color: "#166534", fontWeight: "500" },

  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: spacing.md },
  checklist: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md },
  checkItem: { flexDirection: "row", alignItems: "center" },
  checkCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.accent, marginRight: spacing.md },
  checkText: { fontSize: 15, color: colors.text },

  footer: { padding: spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});