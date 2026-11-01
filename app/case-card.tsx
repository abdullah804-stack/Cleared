// app/case-card.tsx
import { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Linking, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function CaseCardScreen() {
  const router = useRouter();
  const { request, clinicPhone } = useLocalSearchParams<{ request: string; clinicPhone?: string }>();
  const { profile, user } = useAuth();
  
  const [bookingStatus, setBookingStatus] = useState<"waiting" | "confirmed">("waiting");

  const handleWhatsApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Auto-mark as confirmed for demo purposes
    setBookingStatus("confirmed");

    const phone = (clinicPhone || "+923001234567").replace(/[^0-9]/g, "");
    const message = encodeURIComponent(
      `*NEW BOOKING - Cleared App*\n\n` +
      `*Patient:* ${profile?.full_name || user?.email}\n` +
      `*Issue:* ${request}\n` +
      `*Allergies:* ${profile?.allergies || "None"}\n` +
      `*Medications:* ${profile?.medications || "None"}\n\n` +
      `I would like to book an appointment. Please confirm my slot.`
    );
    
    Linking.openURL(`https://wa.me/${phone}?text=${message}`);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Case Card</Text>
          <Text style={styles.subtitle}>Share this with the clinic before you arrive.</Text>
        </View>

        {/* BOOKING STATUS BANNER */}
        <View style={[styles.statusBanner, bookingStatus === "confirmed" ? styles.statusConfirmed : styles.statusWaiting]}>
          <Ionicons name={bookingStatus === "confirmed" ? "checkmark-circle" : "time"} size={24} color={bookingStatus === "confirmed" ? "#166534" : "#B45309"} />
          <Text style={[styles.statusText, { color: bookingStatus === "confirmed" ? "#166534" : "#B45309" }]}>
            {bookingStatus === "confirmed" ? "Appointment Confirmed" : "Waiting for clinic to reply..."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Patient Summary</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{profile?.full_name || "Guest"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Issue:</Text>
            <Text style={styles.value}>{request || "Dental issue"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Allergies:</Text>
            <Text style={styles.value}>{profile?.allergies || "None reported"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Medications:</Text>
            <Text style={styles.value}>{profile?.medications || "None reported"}</Text>
          </View>
        </View>

        <Button title="Send to Clinic via WhatsApp" onPress={handleWhatsApp} style={{ marginTop: spacing.lg }} />
        
        {bookingStatus === "confirmed" && (
          <Button title="View Appointment & Countdown" variant="ghost" onPress={() => router.replace("/appointment")} style={{ marginTop: spacing.md }} />
        )}

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  
  statusBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg, borderWidth: 1 },
  statusWaiting: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  statusConfirmed: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  statusText: { fontSize: 15, fontWeight: "700" },

  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: "row", marginBottom: spacing.sm, alignItems: "flex-start" },
  label: { width: 100, fontSize: 15, fontWeight: "600", color: colors.textMuted },
  value: { flex: 1, fontSize: 15, color: colors.text, fontWeight: "500" },
});