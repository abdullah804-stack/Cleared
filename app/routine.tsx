// app/routine.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, {
  Easing,
  FadeInDown,
  ZoomIn,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { Gradient, RadialGlow } from "../components/Gradient";
import { useThemeColors, ThemeColors, gradients, radius, spacing, type } from "../constants/theme";
import { logRoutine, getTodayStatus, getStreakCount, getRecentDays } from "../shared/routine";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MILESTONES = [3, 7, 14, 30];

const TIPS = [
  "Brush for a full two minutes, twice a day. Set a timer if you tend to rush.",
  "Spit, don't rinse. Leaving a little fluoride toothpaste on your teeth keeps protecting them.",
  "Floss once a day. It cleans the sides of teeth your brush can't reach.",
  "Replace your toothbrush every three months, or sooner if the bristles splay.",
  "Sugary drinks cause the most damage when sipped slowly all day. Keep them to mealtimes.",
  "Brush your tongue too. It carries much of the bacteria behind bad breath.",
  "Wait about 30 minutes after acidic food or drink before brushing, so you don't scrub softened enamel.",
];

function streakMessage(n: number) {
  if (n === 0) return "Complete today's routine to start your streak.";
  if (n < 3) return "Great start. Come back tomorrow to keep it going.";
  if (n < 7) return "You're building a real habit.";
  if (n < 14) return "One week strong. Your gums thank you.";
  if (n < 30) return "Two weeks of care. Keep going.";
  return "A whole month. Impressive.";
}

function Ring({ progress, size, stroke, color, track }: { progress: number; size: number; stroke: number; color: string; track: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(progress, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }));

  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

export default function RoutineScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [morningDone, setMorningDone] = useState(false);
  const [nightDone, setNightDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [week, setWeek] = useState<{ date: string; morning: boolean; night: boolean; isToday: boolean }[]>([]);

  const doneCount = (morningDone ? 1 : 0) + (nightDone ? 1 : 0);
  const perfect = doneCount === 2;

  // The flame breathes while you have a streak, and pops when you complete a task.
  const breathe = useSharedValue(1);
  const pop = useSharedValue(1);
  useEffect(() => {
    breathe.value = streak > 0 ? withRepeat(withSequence(withTiming(1.07, { duration: 1100 }), withTiming(1, { duration: 1100 })), -1) : 1;
  }, [streak > 0]);
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value * pop.value }] }));

  const loadData = useCallback(async () => {
    const status = await getTodayStatus();
    setMorningDone(status.morning);
    setNightDone(status.night);
    setStreak(await getStreakCount());
    setWeek(await getRecentDays(7));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleCheck = async (which: "morning" | "night") => {
    if ((which === "morning" && morningDone) || (which === "night" && nightDone)) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    pop.value = withSequence(withSpring(1.35, { damping: 6 }), withSpring(1, { damping: 10 }));

    await logRoutine(which);
    await loadData();
  };

  const tip = TIPS[Math.floor(Date.now() / 86400000) % TIPS.length];

  const renderTask = ({ id, icon, tint, title, desc, done }: { id: "morning" | "night"; icon: keyof typeof Ionicons.glyphMap; tint: string; title: string; desc: string; done: boolean }) => (
    <Card
      onPress={done ? undefined : () => handleCheck(id)}
      accessibilityLabel={`${title}. ${done ? "Done" : "Tap to mark done"}`}
      style={[styles.task, done && { backgroundColor: colors.successMuted, borderColor: colors.success }]}
    >
      <View style={[styles.taskIcon, { backgroundColor: done ? colors.success : `${tint}22` }]}>
        <Ionicons name={done ? "checkmark" : icon} size={26} color={done ? "#FFFFFF" : tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.taskTitle}>{title}</Text>
        <Text style={styles.taskDesc}>{done ? "Done. Nice work." : desc}</Text>
      </View>
      {done ? (
        <Animated.View entering={ZoomIn.springify()}>
          <Ionicons name="checkmark-circle" size={30} color={colors.success} />
        </Animated.View>
      ) : (
        <Ionicons name="ellipse-outline" size={30} color={colors.border} />
      )}
    </Card>
  );

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        {/* Streak hero */}
        <Animated.View entering={FadeInDown.duration(500).springify().damping(18)}>
          <Gradient colors={gradients.hero} style={styles.hero}>
            <RadialGlow color="#F59E0B" size={260} opacity={0.35} style={{ position: "absolute", top: -90, alignSelf: "center" }} />
            <Animated.View style={[styles.flameRing, flameStyle]}>
              <Ionicons name="flame" size={44} color="#FBBF24" />
            </Animated.View>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
            <Text style={styles.heroMessage}>{streakMessage(streak)}</Text>
          </Gradient>
        </Animated.View>

        {/* Today */}
        <Animated.View entering={FadeInDown.delay(120).duration(450)} style={styles.todayRow}>
          <View>
            <Text style={styles.sectionTitle}>Today</Text>
            <Text style={styles.todaySub}>{perfect ? "Perfect day. Both done." : `${doneCount} of 2 done`}</Text>
          </View>
          <View style={styles.ringWrap}>
            <Ring progress={doneCount / 2} size={64} stroke={7} color={perfect ? colors.success : colors.accent} track={colors.surfaceAlt} />
            <Text style={styles.ringText}>{doneCount}/2</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(450)} style={styles.tasks}>
          {renderTask({ id: "morning", icon: "sunny", tint: "#F59E0B", title: "Morning brush", desc: "2 minutes with fluoride toothpaste", done: morningDone })}
          {renderTask({ id: "night", icon: "moon", tint: "#6366F1", title: "Night floss and brush", desc: "Clean between teeth before bed", done: nightDone })}
        </Animated.View>

        {/* This week */}
        {week.length > 0 && (
          <Animated.View entering={FadeInDown.delay(210).duration(450)}>
            <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>This week</Text>
            <View style={styles.week}>
              {week.map((d) => {
                const n = (d.morning ? 1 : 0) + (d.night ? 1 : 0);
                const [y, m, dd] = d.date.split("-").map(Number);
                const letter = ["S", "M", "T", "W", "T", "F", "S"][new Date(y, m - 1, dd).getDay()];
                return (
                  <View key={d.date} style={styles.weekDay}>
                    <Text style={[styles.weekLetter, d.isToday && { color: colors.accentStrong, fontWeight: "800" }]}>{letter}</Text>
                    <View
                      style={[
                        styles.weekDot,
                        n === 2 && { backgroundColor: colors.success, borderColor: colors.success },
                        n === 1 && { backgroundColor: colors.accentMuted, borderColor: colors.accent },
                        n === 0 && d.isToday && { borderColor: colors.accent },
                      ]}
                    >
                      {n === 2 ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : n === 1 ? <Text style={styles.weekHalf}>1</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Milestones */}
        <Animated.View entering={FadeInDown.delay(240).duration(450)}>
          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Milestones</Text>
          <View style={styles.milestones}>
            {MILESTONES.map((m) => {
              const unlocked = streak >= m;
              return (
                <View key={m} style={[styles.badge, unlocked && styles.badgeOn]}>
                  <Ionicons name={unlocked ? "ribbon" : "lock-closed"} size={20} color={unlocked ? "#F59E0B" : colors.textMuted} />
                  <Text style={[styles.badgeNum, unlocked && { color: colors.text }]}>{m}</Text>
                  <Text style={styles.badgeLabel}>days</Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Tip */}
        <Animated.View entering={FadeInDown.delay(300).duration(450)}>
          <View style={styles.tip}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb" size={20} color={colors.accentStrong} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Tip of the day</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

    hero: { borderRadius: radius.xl, alignItems: "center", paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
    flameRing: {
      width: 92,
      height: 92,
      borderRadius: 46,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(251,191,36,0.14)",
      borderWidth: 1,
      borderColor: "rgba(251,191,36,0.4)",
    },
    streakNumber: { fontSize: 60, lineHeight: 68, fontWeight: "800", color: "#FFFFFF", letterSpacing: -2, marginTop: spacing.sm },
    streakLabel: { ...type.overline, color: "rgba(255,255,255,0.7)", marginTop: -2 },
    heroMessage: { fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: spacing.md, paddingHorizontal: spacing.md },

    todayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xl },
    sectionTitle: { ...type.title, fontSize: 19, color: colors.text },
    todaySub: { fontSize: 13.5, color: colors.textMuted, marginTop: 2 },
    ringWrap: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
    ringText: { position: "absolute", fontSize: 14, fontWeight: "800", color: colors.text },

    tasks: { gap: spacing.sm + 4, marginTop: spacing.md },
    task: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md + 2, borderRadius: radius.xl },
    taskIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
    taskTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    taskDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

    week: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.md },
    weekDay: { alignItems: "center", gap: 6 },
    weekLetter: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    weekDot: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
    weekHalf: { fontSize: 13, fontWeight: "800", color: colors.accentStrong },
    milestones: { flexDirection: "row", gap: spacing.sm + 2, marginTop: spacing.md },
    badge: { flex: 1, alignItems: "center", paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: "transparent" },
    badgeOn: { backgroundColor: colors.surface, borderColor: "#F59E0B" },
    badgeNum: { fontSize: 20, fontWeight: "800", color: colors.textMuted, marginTop: 4 },
    badgeLabel: { fontSize: 11, color: colors.textMuted },

    tip: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.accentMuted },
    tipIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
    tipTitle: { fontSize: 13, fontWeight: "800", color: colors.accentStrong, marginBottom: 2 },
    tipText: { fontSize: 14, lineHeight: 20, color: colors.text },
  });