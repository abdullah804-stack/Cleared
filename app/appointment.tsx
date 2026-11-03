// app/appointment.tsx
import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Gradient } from "../components/Gradient";
import { useThemeColors, ThemeColors, gradients, radius, spacing, shadows, glow, type } from "../constants/theme";
import { BOOKINGS_ARE_SIMULATED } from "../constants/config";
import { logPain } from "../shared/journal";
import { sendTestNotification } from "../utils/notifications";

interface Booking {
  confirmation_id?: string;
  appointment_time: string;
  local_alerts_scheduled?: number;
  clinic?: { name: string; phone?: string; address?: string; lat?: number; lon?: number; demo?: boolean };
}

const PREP_ITEMS = ["Bring your ID card", "Arrive 10 minutes early", "Bring any previous X-rays", "Write down the medicines you take"];
const FALLBACK_CARE = ["Avoid very cold or hot foods until evaluated.", "Use desensitizing toothpaste and avoid hard chewing."];

const PAIN_LEVELS = [1, 3, 5, 7, 9];

const tomorrowAt10 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
};

const pad = (n: number) => n.toString().padStart(2, "0");

export default function AppointmentScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<Date>(tomorrowAt10);
  const [timeLeft, setTimeLeft] = useState(() => tomorrowAt10().getTime() - Date.now());

  const [carePlan, setCarePlan] = useState<string[]>(FALLBACK_CARE);
  const [careChecks, setCareChecks] = useState<Record<number, boolean>>({});
  const [prepChecks, setPrepChecks] = useState<Record<number, boolean>>({});
  const [checkInLevel, setCheckInLevel] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const pop = useSharedValue(0);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    pop.value = withSequence(withSpring(1.2, { damping: 10, stiffness: 100 }), withSpring(1, { damping: 10, stiffness: 100 }));

    (async () => {
      const [savedPlan, savedCare, savedPrep, savedBooking] = await Promise.all([
        AsyncStorage.getItem("current_care_plan"),
        AsyncStorage.getItem("care_plan_checks"),
        AsyncStorage.getItem("prep_checks"),
        AsyncStorage.getItem("current_booking"),
      ]);

      try {
        const parsed = savedPlan ? JSON.parse(savedPlan) : null;
        if (Array.isArray(parsed) && parsed.length) setCarePlan(parsed);
      } catch {}
      try {
        if (savedCare) setCareChecks(JSON.parse(savedCare));
      } catch {}
      try {
        if (savedPrep) setPrepChecks(JSON.parse(savedPrep));
      } catch {}

      // The REAL booking (clinic + time). This screen used to always show "Bright Smile Dental, tomorrow 10:00".
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

    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(Math.max(0, appointmentTime.getTime() - Date.now())), 1000);
    return () => clearInterval(interval);
  }, [appointmentTime]);

  const totalSeconds = Math.floor(timeLeft / 1000);
  const parts = {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
  const arrived = timeLeft <= 0;

  const toggle = async (key: "care_plan_checks" | "prep_checks", index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const source = key === "care_plan_checks" ? careChecks : prepChecks;
    const next = { ...source, [index]: !source[index] };
    if (key === "care_plan_checks") setCareChecks(next);
    else setPrepChecks(next);
    await AsyncStorage.setItem(key, JSON.stringify(next));
  };

  const handleCheckIn = async (level: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCheckInLevel(level);
    // Also lands in the Pain Journal, so the 7-day chart stays up to date.
    try {
      await logPain(level);
    } catch {}
    if (level >= 8) {
      Alert.alert("High pain detected", "Your pain is severe. Would you like to see urgent-care steps now?", [
        { text: "Not now", style: "cancel" },
        { text: "Show me", onPress: () => router.push("/emergency") },
      ]);
    }
  };

  const handleTestNotification = async () => {
    const ok = await sendTestNotification();
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert("Test sent", "You'll get a notification in about 5 seconds. Press Home to see it arrive.");
    } else {
      Alert.alert("Notifications are off", "Turn on notifications for Cleared in your phone's Settings to get appointment reminders.");
    }
  };

  const handleReadAloud = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      Speech.speak(carePlan.join(". "), { onDone: () => setIsSpeaking(false), onStopped: () => setIsSpeaking(false) });
      setIsSpeaking(true);
    }
  };

  const clinic = booking?.clinic;
  const canCall = !!clinic?.phone && !clinic?.demo;
  const directionsUrl =
    clinic && !clinic.demo
      ? clinic.lat != null && clinic.lon != null
        ? `https://maps.google.com/?q=${clinic.lat},${clinic.lon}`
        : `https://maps.google.com/?q=${encodeURIComponent(`${clinic.name} ${clinic.address ?? ""}`)}`
      : null;

  const dateText = appointmentTime.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  const timeText = appointmentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const Unit = ({ value, label }: { value: number; label: string }) => (
    <View style={styles.unit}>
      <Text style={styles.unitValue}>{pad(value)}</Text>
      <Text style={styles.unitLabel}>{label}</Text>
    </View>
  );

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 150 }]} showsVerticalScrollIndicator={false}>
        {/* Success */}
        <View style={styles.successHeader}>
          <View style={styles.checkHalo}>
            <Animated.View style={[styles.checkCircle, popStyle]}>
              <Ionicons name="checkmark" size={36} color="#FFFFFF" />
            </Animated.View>
          </View>
          <Text style={styles.title}>{BOOKINGS_ARE_SIMULATED ? "Demo booking complete" : "You're booked"}</Text>
          <Text style={styles.subtitle}>{arrived ? "Your appointment time has arrived." : "We'll remind you before it starts."}</Text>
        </View>

        {BOOKINGS_ARE_SIMULATED && (
          <Animated.View entering={FadeInDown.delay(80)} style={styles.demoBanner}>
            <Ionicons name="information-circle" size={20} color={colors.warning} />
            <Text style={styles.demoText}>
              Demo mode: this booking is simulated. No clinic has been contacted, so don't rely on it for a real appointment.
            </Text>
          </Animated.View>
        )}

        {/* Boarding pass */}
        <Animated.View entering={FadeInDown.delay(140).springify().damping(18)} style={styles.ticket}>
          <Gradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ticketTop}>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketOverline}>APPOINTMENT</Text>
              {booking?.confirmation_id && <Text style={styles.ticketRef}>{booking.confirmation_id}</Text>}
            </View>
            <Text style={styles.clinicName} numberOfLines={2}>
              {clinic?.name ?? "Your dental clinic"}
            </Text>
            {clinic?.address ? (
              <View style={styles.addressRow}>
                <Ionicons name="location" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={styles.addressText} numberOfLines={1}>
                  {clinic.address}
                </Text>
              </View>
            ) : null}
            <View style={styles.whenRow}>
              <View>
                <Text style={styles.whenLabel}>DATE</Text>
                <Text style={styles.whenValue}>{dateText}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.whenLabel}>TIME</Text>
                <Text style={styles.whenValue}>{timeText}</Text>
              </View>
            </View>
          </Gradient>

          {/* Perforation with notches */}
          <View style={styles.perforation}>
            <View style={[styles.notch, { left: -13 }]} />
            <View style={styles.dashed} />
            <View style={[styles.notch, { right: -13 }]} />
          </View>

          <View style={styles.ticketBottom}>
            {arrived ? (
              <View style={{ alignItems: "center", gap: spacing.sm }}>
                <Text style={styles.countLabel}>HOW DID IT GO?</Text>
                <Button title="Add visit notes" icon="create-outline" onPress={() => router.push("/visit-notes" as any)} style={{ alignSelf: "stretch" }} />
              </View>
            ) : (
              <>
                <Text style={styles.countLabel}>STARTS IN</Text>
                <View style={styles.countRow}>
                  <Unit value={parts.days} label="days" />
                  <Unit value={parts.hours} label="hours" />
                  <Unit value={parts.minutes} label="min" />
                  <Unit value={parts.seconds} label="sec" />
                </View>
              </>
            )}
          </View>
        </Animated.View>

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

        {/* Case card */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Card onPress={() => router.push("/case-card" as any)} style={styles.caseCard} accessibilityLabel="Share your case card with the clinic">
            <View style={[styles.caseIcon, { backgroundColor: colors.accentMuted }]}>
              <Ionicons name="id-card" size={22} color={colors.accentStrong} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.caseTitle}>Send your case card</Text>
              <Text style={styles.caseSub}>Share symptoms and history with the clinic on WhatsApp</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Card>
        </Animated.View>

        {/* Daily check-in */}
        <Animated.View entering={FadeInDown.delay(260)}>
          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.sectionTitle}>Daily check-in</Text>
            <Text style={styles.cardDesc}>How is your pain today?</Text>
            <View style={styles.painRow}>
              {PAIN_LEVELS.map((level) => {
                const on = checkInLevel === level;
                const tone = level <= 3 ? colors.success : level <= 6 ? colors.warning : colors.danger;
                return (
                  <Pressable
                    key={level}
                    onPress={() => handleCheckIn(level)}
                    style={[styles.painBtn, on && { backgroundColor: tone, borderColor: tone }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Pain ${level} out of 10`}
                  >
                    <Text style={[styles.painText, on && { color: "#FFFFFF" }]}>{level}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.painHint}>
              {checkInLevel ? "Saved to your pain journal." : "1 is barely there, 9 is severe. We save it to your journal."}
            </Text>
          </Card>
        </Animated.View>

        {/* Prep checklist */}
        <Animated.View entering={FadeInDown.delay(320)}>
          <Card style={{ marginTop: spacing.md }}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.overline}>Before you go</Text>
                <Text style={styles.sectionTitle}>How to prepare</Text>
              </View>
              <Text style={styles.progressText}>
                {Object.values(prepChecks).filter(Boolean).length}/{PREP_ITEMS.length}
              </Text>
            </View>
            {PREP_ITEMS.map((item, i) => (
              <CheckRow
                key={item}
                text={item}
                done={!!prepChecks[i]}
                last={i === PREP_ITEMS.length - 1}
                onPress={() => toggle("prep_checks", i)}
                colors={colors}
                styles={styles}
              />
            ))}
          </Card>
        </Animated.View>

        {/* Care plan */}
        <Animated.View entering={FadeInDown.delay(380)}>
          <Card style={{ marginTop: spacing.md }}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.overline}>Until your visit</Text>
                <Text style={styles.sectionTitle}>Your care plan</Text>
              </View>
              <Pressable
                onPress={handleReadAloud}
                style={styles.speakerBtn}
                accessibilityLabel={isSpeaking ? "Stop reading" : "Read aloud"}
                hitSlop={8}
              >
                <Ionicons name={isSpeaking ? "stop" : "volume-high"} size={20} color={colors.accentStrong} />
              </Pressable>
            </View>
            {carePlan.map((item, i) => (
              <CheckRow
                key={i}
                text={item}
                done={!!careChecks[i]}
                last={i === carePlan.length - 1}
                onPress={() => toggle("care_plan_checks", i)}
                colors={colors}
                styles={styles}
              />
            ))}
            <Text style={styles.note}>General guidance only, not medical advice. Ask your dentist about anything that worries you.</Text>
          </Card>
        </Animated.View>

        {/* Reminders */}
        <Animated.View entering={FadeInDown.delay(440)} style={styles.reminders}>
          <Ionicons name="notifications" size={18} color={colors.accentStrong} />
          <Text style={styles.remindersText}>
            {booking?.local_alerts_scheduled
              ? `${booking.local_alerts_scheduled} reminder${booking.local_alerts_scheduled > 1 ? "s" : ""} set on this phone.`
              : "Reminders are set on this phone."}
          </Text>
          <Pressable onPress={handleTestNotification} hitSlop={8}>
            <Text style={styles.remindersLink}>Send a test</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Done" icon="home" onPress={() => router.replace("/")} />
        <Pressable onPress={() => router.push("/audit")} style={styles.auditLink} hitSlop={8}>
          <Text style={styles.auditText}>See what the AI did</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function CheckRow({
  text,
  done,
  last,
  onPress,
  colors,
  styles,
}: {
  text: string;
  done: boolean;
  last: boolean;
  onPress: () => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      style={[styles.checkRow, last && { borderBottomWidth: 0, paddingBottom: 0 }]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
    >
      <Ionicons name={done ? "checkmark-circle" : "ellipse-outline"} size={24} color={done ? colors.success : colors.border} />
      <Text style={[styles.checkText, done && styles.checkTextDone]}>{text}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

    successHeader: { alignItems: "center", marginTop: spacing.sm, marginBottom: spacing.lg },
    checkHalo: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.successMuted, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
    checkCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.success, alignItems: "center", justifyContent: "center", ...glow(colors.success, 0.35) },
    title: { ...type.display, fontSize: 28, color: colors.text, textAlign: "center" },
    subtitle: { fontSize: 15, color: colors.textMuted, marginTop: 4, textAlign: "center" },

    demoBanner: { flexDirection: "row", gap: spacing.sm + 2, alignItems: "flex-start", backgroundColor: colors.warningMuted, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
    demoText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.text, fontWeight: "500" },

    // Boarding pass
    ticket: { borderRadius: radius.xl, backgroundColor: colors.surface, overflow: "hidden", borderWidth: 1, borderColor: colors.border, ...shadows.md },
    ticketTop: { padding: spacing.lg },
    ticketRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    ticketOverline: { ...type.overline, color: "rgba(255,255,255,0.75)" },
    ticketRef: { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: "rgba(255,255,255,0.75)" },
    clinicName: { fontSize: 24, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5, marginTop: spacing.sm },
    addressRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    addressText: { flex: 1, fontSize: 13, color: "rgba(255,255,255,0.85)" },
    whenRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.lg },
    whenLabel: { ...type.overline, fontSize: 10, color: "rgba(255,255,255,0.65)" },
    whenValue: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", marginTop: 3 },

    perforation: { height: 26, justifyContent: "center", backgroundColor: colors.surface },
    notch: { position: "absolute", top: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    dashed: { marginHorizontal: 20, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: colors.border },

    ticketBottom: { padding: spacing.lg, paddingTop: spacing.sm },
    countLabel: { ...type.overline, color: colors.textMuted, textAlign: "center", marginBottom: spacing.sm + 2 },
    countRow: { flexDirection: "row", gap: spacing.sm + 2 },
    unit: { flex: 1, alignItems: "center", paddingVertical: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md },
    unitValue: { fontSize: 28, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"], letterSpacing: -0.5 },
    unitLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted, marginTop: 2 },

    clinicActions: { flexDirection: "row", gap: spacing.sm + 2, marginTop: spacing.md },
    clinicBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, backgroundColor: colors.accentMuted, borderRadius: radius.md },
    clinicBtnText: { fontSize: 14, fontWeight: "700", color: colors.accentStrong },

    caseCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
    caseIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    caseTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    caseSub: { fontSize: 12.5, lineHeight: 17, color: colors.textMuted, marginTop: 1 },

    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
    overline: { ...type.overline, color: colors.accentStrong, marginBottom: 2 },
    sectionTitle: { ...type.heading, color: colors.text },
    cardDesc: { fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
    progressText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },

    painRow: { flexDirection: "row", gap: spacing.sm + 2 },
    painBtn: { flex: 1, aspectRatio: 1, maxHeight: 56, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1.5, borderColor: "transparent" },
    painText: { fontSize: 17, fontWeight: "800", color: colors.text },
    painHint: { ...type.caption, color: colors.textMuted, marginTop: spacing.md },

    checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    checkText: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.text },
    checkTextDone: { textDecorationLine: "line-through", color: colors.textMuted },
    note: { ...type.caption, color: colors.textMuted, marginTop: spacing.md },
    speakerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentMuted, alignItems: "center", justifyContent: "center" },

    reminders: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.xs },
    remindersText: { flex: 1, fontSize: 13, color: colors.textMuted },
    remindersLink: { fontSize: 13, fontWeight: "700", color: colors.accentStrong },

    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      ...shadows.lg,
    },
    auditLink: { alignItems: "center", paddingVertical: spacing.md },
    auditText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  });