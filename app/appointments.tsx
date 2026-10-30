// app/appointments.tsx
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as Calendar from "expo-calendar";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { supabase, useAuth } from "../contexts/AuthContext";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

interface Appointment {
  id: string;
  clinic_name: string;
  appointment_time: string;
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id)
      .order("appointment_time", { ascending: true });

    if (data) setAppointments(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const handleCancel = (id: string) => {
    Alert.alert("Cancel Appointment", "Are you sure you want to cancel this visit?", [
      { text: "No", style: "cancel" },
      { 
        text: "Yes, Cancel", 
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await supabase.from("appointments").delete().eq("id", id);
          fetchAppointments();
        }
      }
    ]);
  };

  const handleAddToCalendar = async (apt: Appointment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === "granted") {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(c => c.isPrimary) || calendars[0];
      
      await Calendar.createEventAsync(defaultCalendar.id, {
        title: `Dental Appointment - ${apt.clinic_name}`,
        startDate: new Date(apt.appointment_time),
        endDate: new Date(new Date(apt.appointment_time).getTime() + 60 * 60 * 1000),
        alarms: [{ relativeOffset: -60 }],
      });
      Alert.alert("Success", "Added to your calendar!");
    }
  };

  const now = new Date().getTime();
  const upcoming = appointments.filter(a => new Date(a.appointment_time).getTime() > now);
  const past = appointments.filter(a => new Date(a.appointment_time).getTime() <= now);

  if (loading) {
    return <Screen><ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 100 }} /></Screen>;
  }

  const renderAppointment = (apt: Appointment, isPast: boolean) => {
    const date = new Date(apt.appointment_time).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    const time = new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View key={apt.id} style={[styles.card, isPast && { opacity: 0.6 }]}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <Ionicons name="calendar" size={24} color={colors.accent} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.clinicName}>{apt.clinic_name}</Text>
            <Text style={styles.dateText}>{date} at {time}</Text>
          </View>
        </View>
        
        {!isPast && (
          <View style={styles.actions}>
            <Pressable style={styles.actionBtn} onPress={() => handleAddToCalendar(apt)}>
              <Ionicons name="calendar-outline" size={18} color={colors.text} />
              <Text style={styles.actionText}>Calendar</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => handleCancel(apt.id)}>
              <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
              <Text style={[styles.actionText, { color: colors.danger }]}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Upcoming Visits</Text>
        {upcoming.length === 0 ? (
          <View style={styles.recallBanner}>
            <View style={styles.recallHeader}>
              <Ionicons name="time" size={24} color="#F59E0B" />
              <Text style={styles.recallTitle}>Time for a checkup?</Text>
            </View>
            <Text style={styles.recallText}>
              It looks like you don't have any upcoming appointments. Regular 6-month checkups prevent major issues.
            </Text>
            <Pressable 
              style={styles.recallBtn} 
              onPress={() => router.push({ pathname: "/plan", params: { request: "I need to book a routine 6-month dental checkup and cleaning." } })}
            >
              <Text style={styles.recallBtnText}>Book Checkup</Text>
              <Ionicons name="arrow-forward" size={16} color="#B45309" />
            </Pressable>
          </View>
        ) : (
          upcoming.map(a => renderAppointment(a, false))
        )}

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Past Visits</Text>
        {past.length === 0 ? (
          <Text style={styles.emptyText}>No past appointments.</Text>
        ) : (
          past.map(a => renderAppointment(a, true))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  emptyText: { fontSize: 14, color: colors.textMuted, fontStyle: "italic", marginBottom: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  iconBox: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: "#E0E7FF", alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  cardText: { flex: 1 },
  clinicName: { fontSize: 16, fontWeight: "700", color: colors.text },
  dateText: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.md, marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { fontSize: 14, fontWeight: "600", color: colors.text },

  // Fixed the syntax error by putting these inside the StyleSheet block
  recallBanner: { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md },
  recallHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  recallTitle: { fontSize: 16, fontWeight: "700", color: "#B45309" },
  recallText: { fontSize: 14, color: "#92400E", lineHeight: 20, marginBottom: spacing.md },
  recallBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.full, gap: 4 },
  recallBtnText: { fontSize: 14, fontWeight: "700", color: "#B45309" },
});