// app/kids-timer.tsx
// A two-minute brushing game for children: four zones of 30 seconds, stars for finishing, a daily streak.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useThemeColors, ThemeColors, radius, spacing, type } from "../constants/theme";
import { localDateString, daysAgo } from "../shared/routine";

const ZONES = [
  { label: "Top left", tip: "Brush the outside, the inside and the top of your teeth.", icon: "arrow-back-circle" },
  { label: "Top right", tip: "Little circles, nice and gentle.", icon: "arrow-forward-circle" },
  { label: "Bottom left", tip: "Don't forget the back teeth.", icon: "arrow-back-circle-outline" },
  { label: "Bottom right", tip: "Almost there. Finish with your tongue.", icon: "arrow-forward-circle-outline" },
] as const;

const TOTAL = 120;
const SIZE = 240;
const STROKE = 16;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const KEY = "kids_progress";

type Progress = { days: string[]; stars: number };

export default function KidsTimerScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState<Progress>({ days: [], stars: 0 });
  const startedAt = useRef(0);
  const carried = useRef(0);
  const lastZone = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setProgress(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const finish = useCallback(async () => {
    setRunning(false);
    setDone(true);
    setElapsed(TOTAL);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const today = localDateString();
    setProgress((p) => {
      const next = { days: Array.from(new Set([...p.days, today])).slice(-60), stars: p.stars + (p.days.includes(today) ? 0 : 1) };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const t = carried.current + (Date.now() - startedAt.current) / 1000;
      if (t >= TOTAL) {
        clearInterval(id);
        finish();
        return;
      }
      setElapsed(t);
      const z = Math.floor(t / 30);
      if (z !== lastZone.current) {
        lastZone.current = z;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); // "switch side"
      }
    }, 200);
    return () => clearInterval(id);
  }, [running, finish]);

  const start = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (done) {
      carried.current = 0;
      lastZone.current = 0;
      setElapsed(0);
      setDone(false);
    }
    startedAt.current = Date.now();
    setRunning(true);
  };

  const pause = () => {
    carried.current += (Date.now() - startedAt.current) / 1000;
    setRunning(false);
  };

  const reset = () => {
    carried.current = 0;
    lastZone.current = 0;
    setElapsed(0);
    setRunning(false);
    setDone(false);
  };

  // The tooth bounces while brushing.
  const bounce = useSharedValue(0);
  useEffect(() => {
    bounce.value = running ? withRepeat(withSequence(withTiming(-8, { duration: 300 }), withTiming(0, { duration: 300 })), -1) : withTiming(0);
  }, [running]);
  const toothStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));

  const zoneIdx = Math.min(3, Math.floor(elapsed / 30));
  const zone = ZONES[zoneIdx];
  const left = Math.max(0, Math.ceil(TOTAL - elapsed));
  const offset = C * (1 - elapsed / TOTAL);

  // Streak: consecutive days ending today (or yesterday, so it isn't lost before the first brush of the day).
  const streak = useMemo(() => {
    const set = new Set(progress.days);
    let n = 0;
    let i = set.has(localDateString()) ? 0 : 1;
    while (set.has(daysAgo(i))) {
      n++;
      i++;
    }
    return n;
  }, [progress.days]);

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>Brushing time!</Text>
          <Text style={styles.sub}>Two minutes, four zones. Ask a grown-up to help the little ones.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(450)} style={styles.stage}>
          <View style={{ width: SIZE, height: SIZE }}>
            <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: "-90deg" }] }}>
              <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.border} strokeWidth={STROKE} fill="none" />
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                stroke={done ? colors.success : colors.accent}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={`${C} ${C}`}
                strokeDashoffset={offset}
                fill="none"
              />
            </Svg>
            <View style={styles.center} pointerEvents="none">
              {done ? (
                <Animated.View entering={ZoomIn.springify()} style={{ alignItems: "center" }}>
                  <Ionicons name="star" size={56} color="#F59E0B" />
                  <Text style={styles.doneText}>Sparkly clean!</Text>
                </Animated.View>
              ) : (
                <>
                  <Animated.View style={toothStyle}>
                    <Ionicons name={running ? "happy" : "happy-outline"} size={52} color={colors.accentStrong} />
                  </Animated.View>
                  <Text style={styles.time}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</Text>
                </>
              )}
            </View>
          </View>
        </Animated.View>

        {!done && (
          <View style={styles.zoneCard}>
            <View style={styles.dots}>
              {ZONES.map((z, i) => (
                <View key={z.label} style={[styles.dot, i < zoneIdx && { backgroundColor: colors.success }, i === zoneIdx && { backgroundColor: colors.accent, width: 26 }]} />
              ))}
            </View>
            <Text style={styles.zoneLabel}>{running || elapsed > 0 ? zone.label : "Ready?"}</Text>
            <Text style={styles.zoneTip}>{running || elapsed > 0 ? zone.tip : "Tap start and brush along with the timer."}</Text>
          </View>
        )}

        <View style={{ marginTop: spacing.lg }}>
          {running ? (
            <Button title="Pause" icon="pause" variant="soft" onPress={pause} />
          ) : (
            <Button title={done ? "Brush again" : elapsed > 0 ? "Keep going" : "Start brushing"} icon="play" onPress={start} />
          )}
          {!running && (elapsed > 0 || done) && <Button title="Start over" variant="ghost" onPress={reset} style={{ marginTop: spacing.xs }} />}
        </View>

        <View style={styles.rewards}>
          <View style={styles.reward}>
            <Ionicons name="star" size={22} color="#F59E0B" />
            <Text style={styles.rewardNum}>{progress.stars}</Text>
            <Text style={styles.rewardLabel}>Stars</Text>
          </View>
          <View style={styles.reward}>
            <Ionicons name="flame" size={22} color="#F97316" />
            <Text style={styles.rewardNum}>{streak}</Text>
            <Text style={styles.rewardLabel}>Day streak</Text>
          </View>
        </View>
        <Text style={styles.note}>One star for each day you finish a full two minutes.</Text>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    title: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.8 },
    sub: { ...type.body, color: colors.textMuted, marginTop: 4 },
    stage: { alignItems: "center", marginTop: spacing.xl },
    center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
    time: { fontSize: 44, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"], marginTop: 4 },
    doneText: { fontSize: 20, fontWeight: "800", color: colors.success, marginTop: 6 },
    zoneCard: { alignItems: "center", marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.accentMuted },
    dots: { flexDirection: "row", gap: 6, marginBottom: spacing.md },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
    zoneLabel: { fontSize: 20, fontWeight: "800", color: colors.accentStrong },
    zoneTip: { ...type.body, color: colors.text, textAlign: "center", marginTop: 4 },
    rewards: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
    reward: { flex: 1, alignItems: "center", paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    rewardNum: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 2 },
    rewardLabel: { fontSize: 12, color: colors.textMuted },
    note: { ...type.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.md },
  });