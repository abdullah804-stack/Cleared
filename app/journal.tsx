// app/journal.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, useWindowDimensions } from "react-native";
import Svg, { Rect, Text as SvgText, Line } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { useThemeColors, ThemeColors, radius, spacing, shadows, type } from "../constants/theme";
import { getPainHistory, logPain, initJournalDb } from "../shared/journal";

const WARNING = "#F59E0B";
const LEVELS = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]];

export default function JournalScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();

  const [history, setHistory] = useState<{ date: string; pain_level: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastLogged, setLastLogged] = useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await getPainHistory();
      setHistory(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initJournalDb().then(loadHistory).catch(() => setIsLoading(false));
  }, [loadHistory]);

  const handleLogPain = async (level: number) => {
    if (saving) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await logPain(level);
      setLastLogged(level);
      await loadHistory();
    } finally {
      setSaving(false);
    }
  };

  const levelColor = (level: number) => (level >= 7 ? colors.danger : level >= 4 ? WARNING : colors.accent);

  // Chart geometry: cards add padding + border around the SVG
  const chartWidth = width - spacing.md * 2 - spacing.lg * 2 - 2;
  const chartHeight = 150;
  const shown = history.slice(0, 7).reverse(); // newest 7, oldest first (left -> right)
  const slot = shown.length > 0 ? chartWidth / shown.length : chartWidth;
  const barWidth = Math.min(40, Math.max(14, slot - 14));

  const average = history.length ? history.slice(0, 7).reduce((s, h) => s + h.pain_level, 0) / Math.min(history.length, 7) : null;
  const latest = history[0]?.pain_level ?? null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Pain Journal</Text>
          <Text style={styles.subtitle}>Track your symptoms between visits.</Text>
        </View>

        {history.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Latest</Text>
              <Text style={[styles.statValue, { color: levelColor(latest ?? 0) }]}>{latest}<Text style={styles.statUnit}>/10</Text></Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>7-entry average</Text>
              <Text style={[styles.statValue, { color: levelColor(average ?? 0) }]}>{average?.toFixed(1)}<Text style={styles.statUnit}>/10</Text></Text>
            </View>
          </View>
        )}

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Pain trend</Text>
          {isLoading ? (
            <Text style={styles.emptyText}>Loading…</Text>
          ) : shown.length === 0 ? (
            <Text style={styles.emptyText}>No logs yet. Add your first entry below.</Text>
          ) : (
            <View style={{ alignItems: "center", marginTop: spacing.sm }}>
              <Svg width={chartWidth} height={chartHeight + 30}>
                {[0, 5, 10].map((val) => (
                  <Line
                    key={val}
                    x1="0"
                    y1={chartHeight - (val / 10) * chartHeight}
                    x2={chartWidth}
                    y2={chartHeight - (val / 10) * chartHeight}
                    stroke={colors.border}
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                ))}

                {shown.map((item, index) => {
                  const h = Math.max(4, (item.pain_level / 10) * chartHeight);
                  const x = index * slot + (slot - barWidth) / 2;
                  const y = chartHeight - h;
                  return (
                    <React.Fragment key={`${item.date}-${index}`}>
                      <Rect x={x} y={y} width={barWidth} height={h} rx={8} fill={levelColor(item.pain_level)} />
                      <SvgText x={x + barWidth / 2} y={chartHeight + 20} fontSize="10" fill={colors.textMuted} textAnchor="middle">
                        {item.date.substring(5)}
                      </SvgText>
                      <SvgText x={x + barWidth / 2} y={y - 6} fontSize="12" fontWeight="bold" fill={colors.text} textAnchor="middle">
                        {item.pain_level}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
              </Svg>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>How does it feel today?</Text>
        <Text style={styles.sectionHint}>1 = barely noticeable · 10 = worst imaginable</Text>
        <View style={styles.grid}>
          {LEVELS.map((row, r) => (
            <View key={r} style={styles.gridRow}>
              {row.map((level) => (
                <Pressable
                  key={level}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.painBtn,
                    { backgroundColor: levelColor(level) + "1F", borderColor: levelColor(level) + "55" },
                    pressed && { transform: [{ scale: 0.94 }] },
                    saving && { opacity: 0.6 },
                  ]}
                  onPress={() => handleLogPain(level)}
                  accessibilityLabel={`Log pain level ${level}`}
                >
                  <Text style={[styles.painBtnText, { color: levelColor(level) }]}>{level}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        {lastLogged !== null && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>Logged level {lastLogged} for today ✓</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { flexGrow: 1, paddingBottom: spacing.xxl },
    header: { marginTop: spacing.sm, marginBottom: spacing.lg },
    title: { ...type.display, color: colors.text },
    subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },

    statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      ...shadows.sm,
    },
    statLabel: { ...type.caption, color: colors.textMuted },
    statValue: { fontSize: 28, fontWeight: "800", marginTop: 2, letterSpacing: -0.5 },
    statUnit: { fontSize: 14, fontWeight: "600", color: colors.textMuted },

    chartCard: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.xl,
      ...shadows.md,
    },
    chartTitle: { ...type.heading, fontSize: 16, color: colors.text },
    emptyText: { color: colors.textMuted, textAlign: "center", marginVertical: spacing.xl, fontSize: 14 },

    sectionTitle: { ...type.heading, color: colors.text },
    sectionHint: { ...type.caption, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
    grid: { gap: spacing.sm },
    gridRow: { flexDirection: "row", gap: spacing.sm },
    painBtn: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: radius.lg,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    painBtnText: { fontSize: 20, fontWeight: "700" },

    toast: {
      alignSelf: "center",
      marginTop: spacing.lg,
      backgroundColor: colors.successMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
    },
    toastText: { color: colors.success, fontWeight: "700", fontSize: 13 },
  });