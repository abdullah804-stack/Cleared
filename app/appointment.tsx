// app/appointment.tsx
import { useState, useEffect, useMemo } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Linking, Alert } from "react-native";
import { useRouter } from "expo-router";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from "react-native-reanimated";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useThemeColors, ThemeColors, radius, spacing, shadows, glow, type } from "../constants/theme";
import { BOOKINGS_ARE_SIMULATED } from "../constants/config";
import { sendTestNotification } from "../utils/notifications";
import { Ionicons } from "@expo/vector-icons";

interface Booking {
  confirmation_id?: string;
  appointment_time: string;
  clinic?: { name: string; phone?: string; address?: string; lat?: number; lon?: number; demo?: boolean };
}

const tomorrowAt10 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
};

export default function AppointmentScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const router = useRouter();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const scale = useSharedValue(0);
  const animatedIconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const [booking, setBooking] = useState<Booking | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<Date>(tomorrowAt10);
  const [timeLeft, setTimeLeft] = useState(() => tomorrowAt10().getTime() - Date.now());

  const [carePlan, setCarePlan] = useState<string[]>([]);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 100 }),
      withSpring(1, { damping: 10, stiffness: 100 })
    );

    (async () => {
      const [savedPlan, savedChecks, savedBooking] = await Promise.all([
        AsyncStorage.getItem("current_care_plan"),
        AsyncStorage.getItem("care_plan_checks"),
        AsyncStorage.getItem("current_booking"),
      ]);

      try {
        const parsed = savedPlan ? JSON.parse(savedPlan) : null;
        setCarePlan(Array.isArray(parsed) && parsed.length ? parsed : ["Avoid very cold or hot foods until evaluated.", "Use desensitizing toothpaste and avoid hard chewing."]);
      } catch {
        setCarePlan(["Avoid very cold or hot foods until evaluated.", "Use desensitizing toothpaste and avoid hard chewing."]);
      }

      try {
        if (savedChecks) setCheckedItems(JSON.parse(savedChecks));
      } catch {}

      // Use the REAL booking (clinic + time). This screen used to always show
      // "Bright Smile Dental, tomorrow 10:00" no matter what was booked.
      try {
        if (savedBooking) {
          const b: Booking = JSON.parse(savedBooking);
          const t = new Date(b.appointment_time);
          if (!isNaN(t.getTime())) {
            setBooking(b);
            setAppointmentTime(t);
            setTimeLeft(Math.max(0, t.getTime() - Date.now()));
          }
        }
      } catch {}
    })();
  }, []);

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
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const toggleCheck = async (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newChecked = { ...checkedItems, [index]: !checkedItems[index] };
    setCheckedItems(newChecked);
    await AsyncStorage.setItem("care_plan_checks", JSON.stringify(newChecked));
  };

  const handleTestNotification = async () => {
    const ok = await sendTestNotification();
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Test sent", "You'll get a notification in about 5 seconds. Press Home to see it arrive.");
    } else {
      Alert.alert("Notifications are off", "Turn on notifications for Cleared in your phone's Settings to get appointment reminders.");
    }
  };

  const handleReadAloud = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      Speech.speak(carePlan.join(". "), { onDone: () => setIsSpeaking(false), onStopped: () => setIsSpeaking(false) });
      setIsSpeaking(true);
    }
  };

  // Stop speaking if the user leaves the screen
  useEffect(() => () => { Speech.stop(); }, []);

  const clinic = booking?.clinic;
  const canCall = !!clinic?.phone && !clinic?.demo;
  const directionsUrl = clinic && !clinic.demo
    ? clinic.lat != null && clinic.lon != null
      ? `https://maps.google.com/?q=${clinic.lat},${clinic.lon}`
      : `https://maps.google.com/?q=${encodeURIComponent(`${clinic.name} ${clinic.address ?? ""}`)}`
    : null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.successHeader}>
          <View style={styles.checkHalo}>
            <Animated.View style={[styles.checkCircle, animatedIconStyle]}>
              <Ionicons name="checkmark" size={36} color={colors.onAccent} />
            </Animated.View>
          </View>
          <Text style={styles.title}>{BOOKINGS_ARE_SIMULATED ? "Demo booking complete" : "Booked Successfully"}</Text>
          <View style={styles.clinicPill}>
            <Ionicons name="location" size={13} color={colors.accentStrong} />
            <Text style={styles.subtitle}>{clinic?.name ?? "Your dental clinic"}</Text>
          </View>
        </View>

        {BOOKINGS_ARE_SIMULATED && (
          <View style={styles.demoBanner}>
            <Ionicons name="information-circle" size={20} color="#B45309" />
            <Text style={styles.demoText}>
              Demo mode: this booking is simulated. No clinic has been contacted, so please don't rely on it for a real appointment.
            </Text>
          </View>
        )}

        <View style={styles.ticket}>
          <View style={styles.ticketAccent} />
          <View style={styles.ticketTop}>
            <Text style={styles.timerLabel}>Time until appointment</Text>
            <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
            <View style={styles.datePill}>
              <Ionicons name="calendar-outline" size={14} color={colors.accentStrong} />
              <Text style={styles.appointmentDate}>
                {appointmentTime.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })} at{" "}
                {appointmentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
            {booking?.confirmation_id && <Text style={styles.confirmation}>Ref {booking.confirmation_id}</Text>}
          </View>
        </View>

        {(canCall || directionsUrl) && (
          <View style={styles.clinicActions}>
            {canCall && (
              <Pressable style={styles.clinicBtn} onPress={() => Linking.openURL(`tel:${clinic!.phone}`)}>
                <Ionicons name="call" size={16} color={colors.accentStrong} />
                <Text style={styles.clinicBtnText}>Call clinic</Text>
              </Pressable>
            )}
            {directionsUrl && (
              <Pressable style={styles.clinicBtn} onPress={() => Linking.openURL(directionsUrl)}>
                <Ionicons name="map" size={16} color={colors.accentStrong} />
                <Text style={styles.clinicBtnText}>Directions</Text>
              </Pressable>
            )}
          </View>
        )}

        <Button title="Send a test notification" variant="ghost" onPress={handleTestNotification} style={{ marginBottom: spacing.lg }} />

        <View style={styles.carePlanCard}>
          <View style={styles.carePlanHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.overline}>Before your visit</Text>
              <Text style={styles.sectionTitle}>AI Pre-Visit Care Plan</Text>
            </View>
            <Pressable
              onPress={handleReadAloud}
              style={({ pressed }) => [styles.speakerBtn, pressed && { opacity: 0.7 }]}
              accessibilityLabel={isSpeaking ? "Stop reading" : "Read aloud"}
            >
              <Ionicons name={isSpeaking ? "stop" : "volume-high"} size={20} color={colors.accentStrong} />
            </Pressable>
          </View>

          {carePlan.map((item, index) => (
            <Pressable
              key={index}
              style={[styles.careItem, index === carePlan.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}
              onPress={() => toggleCheck(index)}
            >
              <Ionicons
                name={checkedItems[index] ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={checkedItems[index] ? colors.success : colors.border}
              />
              <Text style={[styles.careItemDesc, checkedItems[index] && styles.careItemDone]}>{item}</Text>
            </Pressable>
          ))}

          <Text style={styles.carePlanNote}>General guidance only, not medical advice. Ask your dentist about anything that worries you.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="View Audit Log" onPress={() => router.push("/audit")} />
        <Button title="Book another" variant="ghost" onPress={() => router.replace("/")} style={{ marginTop: spacing.sm }} />
      </View>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { flexGrow: 1, paddingBottom: 170 },

    successHeader: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.lg },
    checkHalo: {
      width: 104,
      height: 104,
      borderRadius: 52,
      backgroundColor: colors.successMuted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    checkCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.success,
      alignItems: "center",
      justifyContent: "center",
      ...glow(colors.success, 0.35),
    },
    title: { ...type.title, fontSize: 26, color: colors.text, marginBottom: spacing.sm, textAlign: "center" },
    clinicPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.accentMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.full,
    },
    subtitle: { fontSize: 14, fontWeight: "600", color: colors.accentStrong },

    demoBanner: {
      flexDirection: "row",
      gap: spacing.sm + 2,
      alignItems: "flex-start",
      backgroundColor: "#F59E0B1F",
      borderWidth: 1,
      borderColor: "#F59E0B55",
      padding: spacing.md,
      borderRadius: radius.md,
      marginBottom: spacing.md,
    },
    demoText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.text, fontWeight: "500" },

    ticket: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
      overflow: "hidden",
      ...shadows.md,
    },
    ticketAccent: { height: 5, backgroundColor: colors.accent },
    ticketTop: { paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, alignItems: "center" },
    timerLabel: { ...type.overline, color: colors.textMuted, marginBottom: spacing.sm },
    timerValue: {
      fontSize: 48,
      fontWeight: "800",
      color: colors.text,
      fontVariant: ["tabular-nums"],
      letterSpacing: 1,
      marginBottom: spacing.md,
    },
    datePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.accentMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
    },
    appointmentDate: { fontSize: 13, fontWeight: "600", color: colors.accentStrong },
    confirmation: { ...type.caption, color: colors.textMuted, marginTop: spacing.md },

    clinicActions: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
    clinicBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 48,
      backgroundColor: colors.accentMuted,
      borderRadius: radius.md,
    },
    clinicBtnText: { fontSize: 14, fontWeight: "600", color: colors.accentStrong },

    carePlanCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    carePlanHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
    overline: { ...type.overline, color: colors.accentStrong, marginBottom: 2 },
    sectionTitle: { ...type.heading, color: colors.text },
    speakerBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: colors.accentMuted,
      alignItems: "center",
      justifyContent: "center",
    },

    careItem: {
      flexDirection: "row",
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      alignItems: "center",
    },
    careItemDesc: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
    careItemDone: { textDecorationLine: "line-through", color: colors.textMuted },
    carePlanNote: { ...type.caption, color: colors.textMuted, marginTop: spacing.md },

    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: spacing.md,
      paddingBottom: spacing.lg,
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      ...shadows.lg,
    },
  });