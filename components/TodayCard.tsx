// components/TodayCard.tsx
// Streak card: glowing progress ring, 7-day strip, and the next dental visit.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { useThemeColors, ThemeColors, glow, radius, spacing } from "../constants/theme";
import { getRecentDays, getStreakCount, getTodayStatus } from "../shared/routine";
import { supabase, useAuth } from "../contexts/AuthContext";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 92;
const STROKE = 9;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

type Day = { date: string; morning: boolean; night: boolean; isToday: boolean };

export function TodayCard() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [today, setToday] = useState({ morning: false, night: false });
  const [week, setWeek] = useState<Day[]>([]);
  const [next, setNext] = useState<{ clinic_name: string; appointment_time: string } | null>(null);

  const progress = useSharedValue(0);
  const done = (today.morning ? 1 : 0) + (today.night ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(done / 2, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [done]);
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - progress.value) }));

  useFocusEffect(
    useCallback(() => {
      let live = true;
      (async () => {
        try {
          const [s, t, w] = await Promise.all([getStreakCount(), getTodayStatus(), getRecentDays(7)]);
          if (live) {
            setStreak(s);
            setToday(t);
            setWeek(w);
          }
        } catch {}
        if (!user) return;
        const { data } = await supabase
          .from("appointments")
          .select("clinic_name, appointment_time")
          .gte("appointment_time", new Date().toISOString())
          .order("appointment_time", { ascending: true })
          .limit(1);
        if (live) setNext(data?.[0] ?? null);
      })();
      return () => {
        live = false;
      };
    }, [user?.id])
  );

  const when = next ? new Date(next.appointment_time) : null;
  const message = done === 2 ? "Both brushes done. Perfect day." : done === 1 ? (today.morning ? "Night brush left today." : "Morning brush left today.") : streak > 0 ? "Brush today to keep it alive." : "Start your streak today.";

  return (
    <Card padded={false} style={[styles.card, glow("#F97316", 0.18)]}>
      <Pressable onPress={() => router.push("/routine" as never)} style={styles.top} accessibilityRole="button" accessibilityLabel={`${streak} day streak. ${message}`}>
        <View style={{ width: SIZE, height: SIZE }}>
          <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: "-90deg" }] }}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.border} strokeWidth={STROKE} fill="none" />
            <AnimatedCircle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="#F97316" strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={`${C} ${C}`} animatedProps={ringProps} fill="none" />
          </Svg>
          <View style={styles.ringCenter} pointerEvents="none">
            <Ionicons name="flame" size={30} color={streak > 0 ? "#FB923C" : colors.textMuted} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.over}>Brushing streak</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
            <Text style={styles.big}>{streak}</Text>
            <Text style={styles.unit}>{streak === 1 ? "day" : "days"}</Text>
          </View>
          <Text style={styles.msg}>{message}</Text>
        </View>
      </Pressable>

      {week.length > 0 && (
        <View style={styles.week}>
          {week.map((d) => {
            const n = (d.morning ? 1 : 0) + (d.night ? 1 : 0);
            const [y, m, dd] = d.date.split("-").map(Number);
            return (
              <View key={d.date} style={{ alignItems: "center", gap: 5 }}>
                <Text style={[styles.letter, d.isToday && { color: colors.accent }]}>{LETTERS[new Date(y, m - 1, dd).getDay()]}</Text>
                <View
                  style={[
                    styles.dot,
                    n > 0 && { backgroundColor: n === 2 ? "#F97316" : "rgba(249,115,22,0.35)", borderColor: "#F97316" },
                    n === 2 && glow("#F97316", 0.6),
                    n === 0 && d.isToday && { borderColor: colors.accent },
                  ]}
                >
                  {n === 2 && <Ionicons name="checkmark" size={14} color="#1A0A00" />}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Pressable onPress={() => (next ? router.push("/appointment") : router.push("/triage" as never))} style={styles.visit} accessibilityRole="button">
        <View style={styles.visitIcon}>
          <Ionicons name="calendar" size={16} color={colors.accent} />
        </View>
        {when ? (
          <Text style={styles.visitText} numberOfLines={1}>
            Next visit: <Text style={{ fontWeight: "800", color: colors.text }}>{when.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}, {when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text>
          </Text>
        ) : (
          <Text style={styles.visitText}>No visit booked. <Text style={{ color: colors.accent, fontWeight: "800" }}>Find a dentist</Text></Text>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    </Card>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: { borderColor: "rgba(249,115,22,0.28)" },
    top: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
    ringCenter: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
    over: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted },
    big: { fontSize: 40, fontWeight: "800", color: colors.text, letterSpacing: -1 },
    unit: { fontSize: 16, fontWeight: "700", color: colors.textMuted },
    msg: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    week: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
    letter: { fontSize: 11.5, fontWeight: "700", color: colors.textMuted },
    dot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
    visit: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, paddingHorizontal: spacing.md, paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    visitIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentMuted },
    visitText: { flex: 1, fontSize: 13.5, color: colors.textMuted },
  });