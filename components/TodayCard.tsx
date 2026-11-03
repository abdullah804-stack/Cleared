// components/TodayCard.tsx
// Dashboard summary: today's brushing, the streak, and the next dental visit.
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { useThemeColors, ThemeColors, radius, spacing } from "../constants/theme";
import { getStreakCount, getTodayStatus } from "../shared/routine";
import { supabase, useAuth } from "../contexts/AuthContext";

export function TodayCard() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [today, setToday] = useState({ morning: false, night: false });
  const [next, setNext] = useState<{ clinic_name: string; appointment_time: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      (async () => {
        try {
          const [s, t] = await Promise.all([getStreakCount(), getTodayStatus()]);
          if (live) {
            setStreak(s);
            setToday(t);
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

  const done = (today.morning ? 1 : 0) + (today.night ? 1 : 0);
  const when = next ? new Date(next.appointment_time) : null;

  const check = (label: string, on: boolean) => (
    <View style={styles.check}>
      <Ionicons name={on ? "checkmark-circle" : "ellipse-outline"} size={17} color={on ? colors.success : colors.textMuted} />
      <Text style={[styles.checkText, on && { color: colors.text }]}>{label}</Text>
    </View>
  );

  return (
    <Card style={styles.card}>
      <Pressable style={styles.col} onPress={() => router.push("/routine" as never)} accessibilityRole="button" accessibilityLabel={`Brushing routine, ${done} of 2 done today, ${streak} day streak`}>
        <View style={styles.head}>
          <Ionicons name="flame" size={18} color={streak > 0 ? "#F97316" : colors.textMuted} />
          <Text style={styles.big}>{streak}</Text>
          <Text style={styles.small}>day streak</Text>
        </View>
        {check("Morning brush", today.morning)}
        {check("Night brush", today.night)}
      </Pressable>

      <View style={styles.divider} />

      <Pressable style={styles.col} onPress={() => router.push(next ? "/appointment" : ("/triage" as never))} accessibilityRole="button">
        <Text style={styles.over}>Next visit</Text>
        {when ? (
          <>
            <Text style={styles.big} numberOfLines={1}>
              {when.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
            </Text>
            <Text style={styles.small} numberOfLines={1}>
              {when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {next!.clinic_name}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.none}>Nothing booked</Text>
            <Text style={styles.link}>Find a dentist</Text>
          </>
        )}
      </Pressable>
    </Card>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: { flexDirection: "row", marginTop: spacing.md, padding: 0 },
    col: { flex: 1, padding: spacing.md, gap: 6, justifyContent: "center" },
    divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md },
    head: { flexDirection: "row", alignItems: "baseline", gap: 5 },
    big: { fontSize: 20, fontWeight: "800", color: colors.text, letterSpacing: -0.4 },
    small: { fontSize: 12.5, color: colors.textMuted },
    over: { fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted },
    check: { flexDirection: "row", alignItems: "center", gap: 6 },
    checkText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
    none: { fontSize: 16, fontWeight: "700", color: colors.text },
    link: { fontSize: 13, fontWeight: "700", color: colors.accentStrong },
  });