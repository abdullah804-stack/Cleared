// app/journal.tsx
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Rect, Text as SvgText, Line } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { getPainHistory, logPain, initJournalDb } from "../shared/journal";
import { Ionicons } from "@expo/vector-icons";

export default function JournalScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<{ date: string; pain_level: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    const data = await getPainHistory();
    setHistory(data);
    setIsLoading(false);
  };

  useEffect(() => {
    initJournalDb().then(loadHistory);
  }, []);

  const handleLogPain = async (level: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logPain(level);
    await loadHistory();
  };

  const screenWidth = Dimensions.get("window").width - spacing.md * 2 - spacing.lg * 2;
  const chartHeight = 150;
  const barWidth = history.length > 0 ? (screenWidth / history.length) - 10 : 30;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Pain Journal</Text>
          <Text style={styles.subtitle}>Track your symptoms between visits.</Text>
        </View>

        {/* CHART CONTAINER */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Pain Trend (Last 7 Days)</Text>
          {isLoading ? (
            <Text style={styles.emptyText}>Loading...</Text>
          ) : history.length === 0 ? (
            <Text style={styles.emptyText}>No logs yet. Add your first entry below.</Text>
          ) : (
            <View style={{ alignItems: "center", marginTop: spacing.md }}>
              <Svg width={screenWidth} height={chartHeight + 30}>
                {/* Horizontal Grid Lines */}
                {[0, 5, 10].map((val) => (
                  <Line
                    key={val}
                    x1="0"
                    y1={chartHeight - (val / 10) * chartHeight}
                    x2={screenWidth}
                    y2={chartHeight - (val / 10) * chartHeight}
                    stroke={colors.border}
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                ))}
                
                {/* Bars */}
                {history.slice().reverse().map((item, index) => {
                  const height = (item.pain_level / 10) * chartHeight;
                  const x = index * (screenWidth / history.length) + 10;
                  const y = chartHeight - height;

                  // Color code based on severity
                  let barColor = colors.accent;
                  if (item.pain_level >= 7) barColor = colors.danger;
                  else if (item.pain_level >= 4) barColor = "#F59E0B";

                  return (
                    <React.Fragment key={index}>
                      <Rect x={x} y={y} width={barWidth} height={height} rx={6} fill={barColor} />
                      <SvgText
                        x={x + barWidth / 2}
                        y={chartHeight + 20}
                        fontSize="10"
                        fill={colors.textMuted}
                        textAnchor="middle"
                      >
                        {item.date.substring(5)}
                      </SvgText>
                      <SvgText
                        x={x + barWidth / 2}
                        y={y - 5}
                        fontSize="12"
                        fontWeight="bold"
                        fill={colors.text}
                        textAnchor="middle"
                      >
                        {item.pain_level}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
              </Svg>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Log Today's Pain Level</Text>
        <View style={styles.buttonGrid}>
          {[2, 4, 6, 8, 10].map((level) => (
            <Pressable key={level} style={styles.painBtn} onPress={() => handleLogPain(level)}>
              <Text style={styles.painBtnText}>{level}</Text>
            </Pressable>
          ))}
        </View>

      </ScrollView>
      <View style={styles.footer}>
        <Button title="Back to Home" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

// Add React import for Fragment
import React from "react";

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 120 },
  header: { marginTop: spacing.md, marginBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  chartCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  chartTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: spacing.md },
  emptyText: { color: colors.textMuted, fontStyle: "italic", textAlign: "center", marginVertical: spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  buttonGrid: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  painBtn: { flex: 1, aspectRatio: 1, backgroundColor: "#E0E7FF", borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  painBtnText: { fontSize: 18, fontWeight: "700", color: colors.accent },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});