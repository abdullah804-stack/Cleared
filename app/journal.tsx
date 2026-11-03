// app/journal.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useThemeColors, ThemeColors, radius, spacing, type } from "../constants/theme";
import { getPainHistory, logPain, initJournalDb, checkHighPainStreak } from "../shared/journal";

type Entry = { date: string; pain_level: number };

const CHART_H = 140;

const LEVELS = [
  { value: 2, label: "Mild" },
  { value: 4, label: "Noticeable" },
  { value: 6, label: "Painful" },
  { value: 8, label: "Severe" },
  { value: 10, label: "Worst" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Local YYYY-MM-DD, the same format the journal stores.
const localKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function Bar({ value, index, tone, colors }: { value: number | null; index: number; tone: string; colors: ThemeColors }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(index * 60, withTiming(value ? (value / 10) * CHART_H : 0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [value]);
  const style = useAnimatedStyle(() => ({ height: h.value }));

  if (value === null) {
    return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border, marginBottom: 2 }} />;
  }
  return <Animated.View style={[{ width: "62%", maxWidth: 30, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: tone }, style]} />;
}

export default function JournalScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [history, setHistory] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [highStreak, setHighStreak] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setHistory(await getPainHistory());
    setHighStreak(await checkHighPainStreak());
    setLoading(false);
  }, []);

  useEffect(() => {
    initJournalDb().then(loadData);
  }, [loadData]);

  const toneFor = (v: number) => (v >= 7 ? colors.danger : v >= 4 ? colors.warning : colors.success);

  // Always show the last 7 calendar days, with a dot for days that weren't logged.
  const week = useMemo(() => {
    const map = new Map(history.map((h) => [h.date, h.pain_level]));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = localKey(d);
      return { key, day: DAY_NAMES[d.getDay()], value: map.get(key) ?? null, isToday: i === 6 };
    });
  }, [history]);

  const logged = week.filter((w) => w.value !== null) as { key: string; day: string; value: number; isToday: boolean }[];
  const avg = logged.length ? logged.reduce((s, w) => s + w.value, 0) / logged.length : 0;
  const peak = logged.length ? Math.max(...logged.map((w) => w.value)) : 0;
  const todayValue = week[6].value;

  let trend: { icon: keyof typeof Ionicons.glyphMap; text: string; color: string } | null = null;
  if (logged.length >= 2) {
    const diff = logged[logged.length - 1].value - logged[logged.length - 2].value;
    trend =
      diff < 0
        ? { icon: "trending-down", text: "Getting better than your last entry", color: colors.success }
        : diff > 0
          ? { icon: "trending-up", text: "Higher than your last entry. Keep an eye on it.", color: colors.danger }
          : { icon: "remove", text: "Same as your last entry", color: colors.textMuted };
  }

  const save = async () => {
    if (selected === null || saving) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await logPain(selected);
    await loadData();
    setSelected(null);
    setSaving(false);
  };

  const findDentist = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    router.push({ pathname: "/appointment", params: { request: "I have had severe tooth pain for 3 days in a row and need to see a dentist." } });
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(450)}>
          <Text style={styles.title}>Track how it feels</Text>
          <Text style={styles.subtitle}>A few seconds a day shows your dentist exactly how things are going.</Text>
        </Animated.View>

        {/* High pain alert */}
        {highStreak && (
          <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.alert}>
            <View style={styles.alertHead}>
              <View style={styles.alertIcon}>
                <Ionicons name="warning" size={20} color={colors.danger} />
              </View>
              <Text style={styles.alertTitle}>High pain for 3 days</Text>
            </View>
            <Text style={styles.alertText}>You've logged pain of 7 or more three days in a row. Please see a dentist soon rather than waiting it out.</Text>
            <Button title="Find a dentist now" variant="danger" icon="search" onPress={findDentist} style={{ marginTop: spacing.md }} />
          </Animated.View>
        )}

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(80).duration(450)} style={styles.stats}>
          {[
            { label: "Average", value: logged.length ? avg.toFixed(1) : "–" },
            { label: "Peak", value: logged.length ? String(peak) : "–" },
            { label: "Days logged", value: `${logged.length}/7` },
          ].map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Chart */}
        <Animated.View entering={FadeInDown.delay(140).duration(450)}>
          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.cardTitle}>Last 7 days</Text>

            {loading ? null : (
              <View style={styles.chart}>
                {/* grid lines */}
                {[0, 5, 10].map((v) => (
                  <View key={v} pointerEvents="none" style={[styles.gridLine, { bottom: 22 + (v / 10) * CHART_H }]}>
                    <Text style={styles.gridLabel}>{v}</Text>
                    <View style={styles.gridRule} />
                  </View>
                ))}

                <View style={styles.bars}>
                  {week.map((w, i) => (
                    <View key={w.key} style={styles.col}>
                      {w.value !== null && <Text style={[styles.barValue, { color: toneFor(w.value) }]}>{w.value}</Text>}
                      <View style={{ height: CHART_H, justifyContent: "flex-end", alignItems: "center", width: "100%" }}>
                        <Bar value={w.value} index={i} tone={w.value !== null ? toneFor(w.value) : colors.border} colors={colors} />
                      </View>
                      <Text style={[styles.dayLabel, w.isToday && { color: colors.accentStrong, fontWeight: "800" }]}>{w.isToday ? "Today" : w.day}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!loading && logged.length === 0 && <Text style={styles.empty}>No entries yet. Log how you feel below.</Text>}

            {trend && (
              <Animated.View entering={FadeIn.delay(500)} style={styles.trend}>
                <Ionicons name={trend.icon} size={16} color={trend.color} />
                <Text style={[styles.trendText, { color: trend.color }]}>{trend.text}</Text>
              </Animated.View>
            )}
          </Card>
        </Animated.View>

        {/* Log */}
        <Animated.View entering={FadeInDown.delay(200).duration(450)}>
          <Text style={styles.sectionTitle}>{todayValue !== null ? "Log again" : "How is it today?"}</Text>
          {todayValue !== null && (
            <View style={styles.todayPill}>
              <Ionicons name="checkmark-circle" size={15} color={colors.success} />
              <Text style={styles.todayPillText}>Today so far: {todayValue}/10</Text>
            </View>
          )}

          <View style={styles.scale}>
            {LEVELS.map((l) => {
              const on = selected === l.value;
              const tone = toneFor(l.value);
              return (
                <Pressable
                  key={l.value}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelected(l.value);
                  }}
                  style={[styles.level, on && { backgroundColor: tone, borderColor: tone }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Pain ${l.value} of 10, ${l.label}`}
                >
                  <Text style={[styles.levelNum, on && { color: "#FFFFFF" }]}>{l.value}</Text>
                  <Text style={[styles.levelLabel, on && { color: "rgba(255,255,255,0.9)" }]} numberOfLines={1}>
                    {l.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Button title={selected === null ? "Pick a level" : `Save ${selected}/10`} icon="bookmark" onPress={save} disabled={selected === null} loading={saving} style={{ marginTop: spacing.md }} />
          <Text style={styles.note}>We keep the highest level you log each day.</Text>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    title: { ...type.title, fontSize: 24, color: colors.text },
    subtitle: { fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 4 },

    alert: { marginTop: spacing.lg, padding: spacing.md + 2, borderRadius: radius.xl, backgroundColor: colors.dangerMuted, borderWidth: 1, borderColor: `${colors.danger}33` },
    alertHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, marginBottom: spacing.sm },
    alertIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
    alertTitle: { fontSize: 17, fontWeight: "800", color: colors.danger },
    alertText: { fontSize: 14, lineHeight: 20, color: colors.text, opacity: 0.85 },

    stats: { flexDirection: "row", gap: spacing.sm + 2, marginTop: spacing.lg },
    stat: { flex: 1, alignItems: "center", paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    statValue: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
    statLabel: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },

    cardTitle: { ...type.heading, color: colors.text, marginBottom: spacing.md },
    chart: { height: CHART_H + 22 + 22, justifyContent: "flex-end" },
    gridLine: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 6 },
    gridLabel: { width: 14, fontSize: 10, color: colors.textMuted, textAlign: "right" },
    gridRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    bars: { flexDirection: "row", paddingLeft: 22, alignItems: "flex-end" },
    col: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
    barValue: { fontSize: 12, fontWeight: "800", marginBottom: 3 },
    dayLabel: { fontSize: 11, color: colors.textMuted, marginTop: 6, height: 16 },
    empty: { fontSize: 13, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
    trend: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    trendText: { flex: 1, fontSize: 13, fontWeight: "600" },

    sectionTitle: { ...type.title, fontSize: 19, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
    todayPill: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.successMuted, marginBottom: spacing.sm },
    todayPillText: { fontSize: 12.5, fontWeight: "700", color: colors.success },
    scale: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
    level: { flex: 1, alignItems: "center", paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
    levelNum: { fontSize: 20, fontWeight: "800", color: colors.text },
    levelLabel: { fontSize: 10, fontWeight: "600", color: colors.textMuted, marginTop: 2 },
    note: { ...type.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
  });