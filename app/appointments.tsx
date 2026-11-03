// app/appointments.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Calendar from "expo-calendar";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Gradient } from "../components/Gradient";
import { supabase, useAuth } from "../contexts/AuthContext";
import { cancelAppointmentAlerts } from "../utils/cancelAlerts";
import { useThemeColors, ThemeColors, gradients, motion, radius, shadows, spacing, type } from "../constants/theme";

interface Appointment {
  id: string;
  clinic_name: string;
  appointment_time: string;
}

type Tab = "upcoming" | "past";

const ADDED_KEY = "calendar_added";

function relative(date: Date): string {
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return "now";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(ms / 3600000);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(ms / 86400000);
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function Segmented({
  value,
  onChange,
  options,
  colors,
}: {
  value: Tab;
  onChange: (t: Tab) => void;
  options: { key: Tab; label: string }[];
  colors: ThemeColors;
}) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const idx = options.findIndex((o) => o.key === value);
  const segW = (w - 8) / options.length;

  useEffect(() => {
    if (w > 0) x.value = withSpring(idx * segW, motion.spring);
  }, [idx, w]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ flexDirection: "row", backgroundColor: colors.surfaceAlt, borderRadius: radius.full, padding: 4 }}
    >
      {w > 0 && (
        <Animated.View
          style={[
            { position: "absolute", top: 4, left: 4, bottom: 4, width: segW, borderRadius: radius.full, backgroundColor: colors.surface },
            shadows.sm,
            indicator,
          ]}
        />
      )}
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onChange(o.key);
          }}
          style={{ flex: 1, height: 40, alignItems: "center", justifyContent: "center" }}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === o.key }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: value === o.key ? colors.text : colors.textMuted }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function AppointmentsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("appointments")
      .select("id, clinic_name, appointment_time")
      .eq("user_id", user.id)
      .order("appointment_time", { ascending: true });

    if (error) setLoadError(true);
    else {
      setLoadError(false);
      setAppointments(data ?? []);
    }
    setLoading(false);
  }, [user?.id]);

  // Reload whenever the screen is shown, so a booking made a moment ago is already here.
  useFocusEffect(
    useCallback(() => {
      load();
      AsyncStorage.getItem(ADDED_KEY)
        .then((raw) => raw && setAdded(JSON.parse(raw)))
        .catch(() => {});
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleCancel = (apt: Appointment) => {
    Alert.alert("Cancel this visit?", `${apt.clinic_name}\nThis also turns off its reminders.`, [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel visit",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("appointments").delete().eq("id", apt.id);
          if (error) return Alert.alert("Couldn't cancel", "Please check your connection and try again.");

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          await cancelAppointmentAlerts(new Date(apt.appointment_time));

          // If this was the booking shown on the appointment screen, forget it too.
          try {
            const raw = await AsyncStorage.getItem("current_booking");
            if (raw && new Date(JSON.parse(raw).appointment_time).getTime() === new Date(apt.appointment_time).getTime()) {
              await AsyncStorage.removeItem("current_booking");
            }
          } catch {}
          load();
        },
      },
    ]);
  };

  const handleAddToCalendar = async (apt: Appointment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        return Alert.alert("Calendar access needed", "Allow calendar access for Cleared in your phone's Settings to add visits.");
      }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const writable = calendars.filter((c) => c.allowsModifications);
      const target = writable.find((c) => c.isPrimary) ?? writable[0];
      if (!target) {
        return Alert.alert("No calendar found", "Your phone doesn't have a calendar that can take new events. Open your Calendar app once, then try again.");
      }

      const start = new Date(apt.appointment_time);
      await Calendar.createEventAsync(target.id, {
        title: `Dental appointment: ${apt.clinic_name}`,
        notes: "Booked with Cleared",
        startDate: start,
        endDate: new Date(start.getTime() + 60 * 60 * 1000),
        alarms: [{ relativeOffset: -60 }, { relativeOffset: -1440 }],
      });

      const next = { ...added, [apt.id]: true };
      setAdded(next);
      AsyncStorage.setItem(ADDED_KEY, JSON.stringify(next)).catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      Alert.alert("Couldn't add to calendar", "Something went wrong. Please try again.");
    }
  };

  const openDirections = (apt: Appointment) =>
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(apt.clinic_name)}`).catch(() => {});

  const now = Date.now();
  const upcoming = appointments.filter((a) => new Date(a.appointment_time).getTime() > now);
  const past = appointments.filter((a) => new Date(a.appointment_time).getTime() <= now).reverse();
  const lastVisit = past[0] ? new Date(past[0].appointment_time) : null;
  const monthsSince = lastVisit ? Math.floor((now - lastVisit.getTime()) / (30.44 * 86400000)) : null;

  const dateText = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  const timeText = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const bookCheckup = () =>
    router.push({ pathname: "/plan", params: { request: "I need to book a routine 6-month dental checkup and cleaning." } });

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 120 }} />
      </Screen>
    );
  }

  const [next, ...others] = upcoming;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      >
        <Segmented
          value={tab}
          onChange={setTab}
          colors={colors}
          options={[
            { key: "upcoming", label: `Upcoming${upcoming.length ? ` (${upcoming.length})` : ""}` },
            { key: "past", label: `Past${past.length ? ` (${past.length})` : ""}` },
          ]}
        />

        {loadError && (
          <Animated.View entering={FadeIn} style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
            <Text style={styles.errorText}>Couldn't load your visits. Pull down to try again.</Text>
          </Animated.View>
        )}

        {tab === "upcoming" && (
          <>
            {next && (
              <Animated.View entering={FadeInDown.duration(450).springify().damping(18)} style={{ marginTop: spacing.lg }}>
                <Text style={styles.overline}>Next visit</Text>
                <View style={[styles.hero, shadows.md]}>
                  <Gradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroInner}>
                    <View style={styles.heroTop}>
                      <View style={styles.relPill}>
                        <Ionicons name="time-outline" size={13} color="#FFFFFF" />
                        <Text style={styles.relText}>{relative(new Date(next.appointment_time))}</Text>
                      </View>
                    </View>
                    <Text style={styles.heroClinic} numberOfLines={2}>
                      {next.clinic_name}
                    </Text>
                    <Text style={styles.heroWhen}>
                      {dateText(next.appointment_time)} at {timeText(next.appointment_time)}
                    </Text>

                    <View style={styles.heroActions}>
                      <Pressable style={styles.glassBtn} onPress={() => handleAddToCalendar(next)} accessibilityRole="button">
                        <Ionicons name={added[next.id] ? "checkmark-circle" : "calendar-outline"} size={17} color="#FFFFFF" />
                        <Text style={styles.glassText}>{added[next.id] ? "In calendar" : "Calendar"}</Text>
                      </Pressable>
                      <Pressable style={styles.glassBtn} onPress={() => openDirections(next)} accessibilityRole="button">
                        <Ionicons name="navigate-outline" size={17} color="#FFFFFF" />
                        <Text style={styles.glassText}>Directions</Text>
                      </Pressable>
                      <Pressable style={styles.glassBtn} onPress={() => handleCancel(next)} accessibilityRole="button">
                        <Ionicons name="close-circle-outline" size={17} color="#FFFFFF" />
                        <Text style={styles.glassText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </Gradient>
                </View>
              </Animated.View>
            )}

            {others.length > 0 && <Text style={[styles.overline, { marginTop: spacing.lg }]}>Also coming up</Text>}
            {others.map((a, i) => (
              <Animated.View key={a.id} entering={FadeInDown.delay(80 + i * 60).duration(350)} style={{ marginTop: spacing.sm + 2 }}>
                <Card>
                  <View style={styles.row}>
                    <View style={styles.iconBox}>
                      <Ionicons name="calendar" size={22} color={colors.accentStrong} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clinic}>{a.clinic_name}</Text>
                      <Text style={styles.when}>
                        {dateText(a.appointment_time)} at {timeText(a.appointment_time)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable style={styles.linkBtn} onPress={() => handleAddToCalendar(a)}>
                      <Ionicons name={added[a.id] ? "checkmark-circle" : "calendar-outline"} size={16} color={colors.accentStrong} />
                      <Text style={styles.linkText}>{added[a.id] ? "In calendar" : "Calendar"}</Text>
                    </Pressable>
                    <Pressable style={styles.linkBtn} onPress={() => handleCancel(a)}>
                      <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                      <Text style={[styles.linkText, { color: colors.danger }]}>Cancel</Text>
                    </Pressable>
                  </View>
                </Card>
              </Animated.View>
            ))}

            {!next && !loadError && (
              <Animated.View entering={FadeInDown.delay(100).duration(450)} style={styles.recall}>
                <View style={styles.recallIcon}>
                  <Ionicons name="time" size={26} color={colors.warning} />
                </View>
                <Text style={styles.recallTitle}>Time for a checkup?</Text>
                <Text style={styles.recallText}>
                  {monthsSince !== null && monthsSince >= 1
                    ? `Your last visit was about ${monthsSince} month${monthsSince === 1 ? "" : "s"} ago. Regular checkups every 6 months catch problems while they're small and cheap to fix.`
                    : "You have no upcoming visits. Regular checkups every 6 months catch problems while they're small and cheap to fix."}
                </Text>
                <Button title="Book a checkup" icon="calendar" onPress={bookCheckup} style={{ alignSelf: "stretch", marginTop: spacing.md }} />
              </Animated.View>
            )}
          </>
        )}

        {tab === "past" && (
          <View style={{ marginTop: spacing.lg }}>
            {past.length === 0 ? (
              <Animated.View entering={FadeIn.delay(100)} style={styles.emptyPast}>
                <Ionicons name="albums-outline" size={34} color={colors.textMuted} />
                <Text style={styles.emptyPastText}>Your completed visits will appear here.</Text>
              </Animated.View>
            ) : (
              past.map((a, i) => (
                <Animated.View key={a.id} entering={FadeInDown.delay(Math.min(i, 6) * 55).duration(350)} style={{ marginBottom: spacing.sm + 2 }}>
                  <Card>
                    <View style={styles.row}>
                      <View style={[styles.iconBox, { backgroundColor: colors.surfaceAlt }]}>
                        <Ionicons name="checkmark-done" size={22} color={colors.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.clinic}>{a.clinic_name}</Text>
                        <Text style={styles.when}>
                          {dateText(a.appointment_time)} at {timeText(a.appointment_time)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <Pressable style={styles.linkBtn} onPress={() => router.push("/visit-notes" as never)}>
                        <Ionicons name="create-outline" size={16} color={colors.accentStrong} />
                        <Text style={styles.linkText}>Add notes</Text>
                      </Pressable>
                      <Pressable style={styles.linkBtn} onPress={bookCheckup}>
                        <Ionicons name="refresh" size={16} color={colors.accentStrong} />
                        <Text style={styles.linkText}>Book again</Text>
                      </Pressable>
                    </View>
                  </Card>
                </Animated.View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    overline: { ...type.overline, color: colors.textMuted, marginBottom: spacing.sm },

    errorBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.dangerMuted },
    errorText: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.danger },

    hero: { borderRadius: radius.xl },
    heroInner: { borderRadius: radius.xl, padding: spacing.lg },
    heroTop: { flexDirection: "row" },
    relPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: "rgba(255,255,255,0.18)" },
    relText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF", textTransform: "capitalize" },
    heroClinic: { fontSize: 24, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5, marginTop: spacing.md },
    heroWhen: { fontSize: 15, color: "rgba(255,255,255,0.85)", marginTop: 4 },
    heroActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
    glassBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      height: 42,
      borderRadius: radius.full,
      backgroundColor: "rgba(255,255,255,0.16)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.28)",
    },
    glassText: { fontSize: 12.5, fontWeight: "700", color: "#FFFFFF" },

    row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    iconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.accentMuted, alignItems: "center", justifyContent: "center" },
    clinic: { fontSize: 16, fontWeight: "700", color: colors.text },
    when: { fontSize: 13.5, color: colors.textMuted, marginTop: 2 },
    cardActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.lg, marginTop: spacing.md, paddingTop: spacing.sm + 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    linkBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 2 },
    linkText: { fontSize: 14, fontWeight: "700", color: colors.accentStrong },

    recall: { alignItems: "center", marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.warningMuted },
    recallIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
    recallTitle: { ...type.title, fontSize: 20, color: colors.text },
    recallText: { fontSize: 14, lineHeight: 21, color: colors.text, opacity: 0.8, textAlign: "center", marginTop: spacing.xs },

    emptyPast: { alignItems: "center", paddingVertical: spacing.xxl, gap: spacing.sm },
    emptyPastText: { fontSize: 14, color: colors.textMuted },
  });