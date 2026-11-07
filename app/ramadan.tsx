// app/ramadan.tsx
// Dental care that fits fasting: daily reminders at suhoor and iftar (times you set yourself) plus practical tips.
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { tick } from "../utils/haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { Gradient } from "../components/Gradient";
import { useThemeColors, ThemeColors, radius, spacing, type } from "../constants/theme";
import { scheduleDaily, cancelNotifications } from "../utils/notifications";

const KEY = "ramadan_settings";

type Settings = { on: boolean; suhoor: [number, number]; iftar: [number, number]; ids: string[] };
const DEFAULTS: Settings = { on: false, suhoor: [4, 15], iftar: [18, 30], ids: [] };

const TIPS = [
  { icon: "water", title: "Drink water at suhoor and after iftar", text: "A dry mouth is the main cause of bad breath and cavities while fasting. Sip often between iftar and sleep." },
  { icon: "brush", title: "Brush at suhoor, and before bed", text: "Use a fluoride toothpaste. A soft brush is enough, and gentle beats hard." },
  { icon: "leaf", title: "Miswak is fine, and kind to gums", text: "Using a miswak during the day does not break the fast. Brushing with toothpaste is also fine if you don't swallow it." },
  { icon: "ice-cream", title: "Go easy on sweets at iftar", text: "Dates and sugary drinks all at once feed bacteria. Rinse with water afterwards and wait around 30 minutes before brushing." },
  { icon: "medkit", title: "Planning a dental visit?", text: "Cleanings and checkups can be booked after iftar. Tell the clinic you're fasting if you need a procedure." },
] as const;

const fmt = (t: [number, number]) => {
  const h = t[0] % 12 || 12;
  return `${h}:${String(t[1]).padStart(2, "0")} ${t[0] < 12 ? "AM" : "PM"}`;
};
const toDate = (t: [number, number]) => {
  const d = new Date();
  d.setHours(t[0], t[1], 0, 0);
  return d;
};

export default function RamadanScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [picking, setPicking] = useState<null | "suhoor" | "iftar">(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setS({ ...DEFAULTS, ...JSON.parse(raw) }))
      .catch(() => {});
  }, []);

  const save = async (next: Settings) => {
    setS(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };

  // Cancel old reminders and (if on) schedule new ones. Falls back to "off" if notifications are blocked.
  const apply = async (next: Settings) => {
    setBusy(true);
    try {
      await cancelNotifications(s.ids);
      let ids: string[] = [];
      if (next.on) {
        const a = await scheduleDaily("Suhoor time", "Drink water, eat well, and brush your teeth before fajr.", next.suhoor[0], next.suhoor[1]);
        const b = await scheduleDaily("Iftar time", "Break your fast gently. Rinse with water after sweets.", next.iftar[0], next.iftar[1]);
        ids = [a, b].filter(Boolean) as string[];
        if (ids.length === 0) {
          Alert.alert("Notifications are off", "Allow notifications for Cleared in your phone settings to get reminders.");
          await save({ ...next, on: false, ids: [] });
          return;
        }
      }
      await save({ ...next, ids });
    } finally {
      setBusy(false);
    }
  };

  const toggle = (on: boolean) => {
    tick();
    apply({ ...s, on });
  };

  const onPick = (_: unknown, date?: Date) => {
    const which = picking;
    if (Platform.OS === "android") setPicking(null);
    if (!date || !which) return;
    const next: Settings = { ...s, [which]: [date.getHours(), date.getMinutes()] as [number, number] };
    s.on ? apply(next) : save(next);
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(450)}>
          <Gradient colors={["#1E1B4B", "#4338CA", "#6366F1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Ionicons name="moon" size={30} color="#FDE68A" />
            <Text style={styles.heroTitle}>Ramadan mode</Text>
            <Text style={styles.heroSub}>Gentle reminders and dental care that fits fasting.</Text>
          </Gradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(450)}>
          <Card style={{ marginTop: spacing.md }}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Daily reminders</Text>
                <Text style={styles.cardSub}>One at suhoor, one at iftar.</Text>
              </View>
              <Switch value={s.on} onValueChange={toggle} disabled={busy} trackColor={{ true: colors.accent, false: colors.border }} />
            </View>

            {(["suhoor", "iftar"] as const).map((k) => (
              <Pressable key={k} onPress={() => setPicking(k)} style={styles.timeRow} accessibilityRole="button" accessibilityLabel={`Set ${k} time`}>
                <Ionicons name={k === "suhoor" ? "partly-sunny" : "sunny"} size={20} color={colors.accentStrong} />
                <Text style={styles.timeLabel}>{k === "suhoor" ? "Suhoor" : "Iftar"}</Text>
                <Text style={styles.timeValue}>{fmt(s[k])}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
            <Text style={styles.hint}>Set the times from your local timetable. They change a little each day, so adjust them every week or two.</Text>
          </Card>
        </Animated.View>

        {picking && (
          <DateTimePicker value={toDate(s[picking])} mode="time" is24Hour={false} display={Platform.OS === "ios" ? "spinner" : "default"} onChange={onPick} />
        )}
        {picking && Platform.OS === "ios" && (
          <Pressable onPress={() => setPicking(null)} style={styles.done}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        )}

        <Text style={styles.section}>Tips for fasting days</Text>
        {TIPS.map((t, i) => (
          <Animated.View key={t.title} entering={FadeInDown.delay(140 + i * 60).duration(400)} style={{ marginBottom: spacing.sm }}>
            <Card style={styles.tip}>
              <View style={styles.tipIcon}>
                <Ionicons name={t.icon as any} size={18} color={colors.accentStrong} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>{t.title}</Text>
                <Text style={styles.tipText}>{t.text}</Text>
              </View>
            </Card>
          </Animated.View>
        ))}
        <Text style={styles.disclaimer}>General guidance. If you have a medical condition, ask your doctor or dentist what is right for you.</Text>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    hero: { borderRadius: radius.xl, padding: spacing.lg },
    heroTitle: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.6, marginTop: spacing.sm },
    heroSub: { fontSize: 14.5, lineHeight: 20, color: "rgba(255,255,255,0.8)", marginTop: 4 },
    switchRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
    cardTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
    cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    timeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    timeLabel: { flex: 1, fontSize: 15.5, fontWeight: "600", color: colors.text },
    timeValue: { fontSize: 15.5, fontWeight: "800", color: colors.accentStrong },
    hint: { ...type.caption, color: colors.textMuted, marginTop: spacing.xs },
    done: { alignSelf: "center", paddingHorizontal: 22, paddingVertical: 8 },
    doneText: { fontSize: 16, fontWeight: "700", color: colors.accentStrong },
    section: { ...type.overline, color: colors.textMuted, marginTop: spacing.xl, marginBottom: spacing.md },
    tip: { flexDirection: "row", gap: spacing.md },
    tipIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentMuted },
    tipTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    tipText: { fontSize: 13.5, lineHeight: 20, color: colors.textMuted, marginTop: 3 },
    disclaimer: { ...type.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  });