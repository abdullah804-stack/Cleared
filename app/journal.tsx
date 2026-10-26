// app/journal.tsx
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { getPainHistory, logPain, initJournalDb } from "../shared/journal";
import { Ionicons } from "@expo/vector-icons";

export default function JournalScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<{ date: string; pain_level: number }[]>([]);

  const loadHistory = async () => {
    const data = await getPainHistory();
    setHistory(data);
  };

  useEffect(() => {
    initJournalDb().then(loadHistory);
  }, []);

  const handleLogPain = async (level: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logPain(level);
    await loadHistory();
  };

  // Chart dimensions
  const chartHeight = 150;
  const barWidth = 30;
  const chartWidth = Math.max(history.length * 50, 300);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Pain Journal</Text>
          <Text style={styles.subtitle}>Track your symptoms between visits.</Text>
        </View>

        {/* CHART */}
        <View style={styles.chartCard}>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>No logs yet. Add your first entry below.</Text>
          ) : (
            <Svg width="100%" height={chartHeight + 30} viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`}>
              {history.slice().reverse().map((item, index) => {
                const height = (item.pain_level / 10) * chartHeight;
                return (
                  <View key={index}>
                    <Rect
                      x={index * 50 + 10}
                      y={chartHeight - height}
                      width={barWidth}
                      height={height}
                      rx={6}
                      fill={item.pain_level > 7 ? colors.danger : item.pain_level > 4 ? "#F59E0B" : colors.accent}
                    />
                    <SvgText
                      x={index * 50 + 10 + barWidth / 2}
                      y={chartHeight + 20}
                      fontSize="10"
                      fill={colors.textMuted}
                      textAnchor="middle"
                    >
                      {item.date.substring(5)} 
                    </SvgText>
                  </View>
                );
              })}
            </Svg>
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

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 120 },
  header: { marginTop: spacing.md, marginBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  chartCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl, alignItems: "center", justifyContent: "center", minHeight: 200 },
  emptyText: { color: colors.textMuted, fontStyle: "italic" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  buttonGrid: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  painBtn: { flex: 1, aspectRatio: 1, backgroundColor: "#E0E7FF", borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  painBtnText: { fontSize: 18, fontWeight: "700", color: colors.accent },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});