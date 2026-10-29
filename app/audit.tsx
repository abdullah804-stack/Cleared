// app/audit.tsx
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Alert, Platform } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useThemeColors, ThemeColors, radius, spacing, shadows, type } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";
import { readAuditLog, clearAuditLog } from "../shared/audit";
import { AuditEntry } from "../shared/types";

export default function AuditScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { user } = useAuth();
  // Must match the id plan.tsx writes with. (This screen used to read a hardcoded "demo-user-123",
  // so real users always saw an empty log.)
  const userId = user?.id ?? "anonymous";

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      readAuditLog(userId).then(setEntries).catch(() => setEntries([]));
    }, [userId])
  );

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const tone = (t: string) => {
    if (/FAIL|EMERGENCY|REJECT/i.test(t)) return { bg: colors.dangerMuted, fg: colors.danger };
    if (/COMPLETE|APPROVED|CREATED|SENT|SCHEDULED/i.test(t)) return { bg: colors.successMuted, fg: colors.success };
    return { bg: colors.accentMuted, fg: colors.accentStrong };
  };

  const confirmClear = () => {
    Alert.alert("Clear audit log?", "This permanently deletes the log from this phone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await clearAuditLog(userId);
          setEntries([]);
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Audit Log</Text>
            <Text style={styles.subtitle}>Every action the AI took on your behalf, stored only on this phone.</Text>
          </View>
          {entries.length > 0 && (
            <Pressable onPress={confirmClear} style={styles.clearBtn} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.list}>
          {entries.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Nothing logged yet</Text>
              <Text style={styles.emptyText}>Plans you create and actions you approve will show up here.</Text>
            </View>
          )}

          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const c = tone(entry.type);
            return (
              <Pressable
                key={entry.id}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
                onPress={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                <View style={styles.rowHeader}>
                  <View style={[styles.badge, { backgroundColor: c.bg }]}>
                    <Text style={[styles.badgeText, { color: c.fg }]}>{entry.type.replace(/[._]/g, " ")}</Text>
                  </View>
                  <Text style={styles.time}>{formatTime(entry.timestamp)}</Text>
                </View>
                <Text style={styles.desc}>{entry.description}</Text>

                {entry.detail && (
                  <Text style={styles.expandHint}>{isExpanded ? "Hide details" : "Show details"}</Text>
                )}

                {isExpanded && entry.detail && (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailText}>{JSON.stringify(entry.detail, null, 2)}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="New request" onPress={() => router.replace("/")} />
      </View>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { flexGrow: 1, paddingBottom: spacing.lg },
    header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.lg },
    title: { ...type.display, color: colors.text },
    subtitle: { fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: spacing.xs },
    clearBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.dangerMuted,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: 7,
      borderRadius: radius.full,
      marginTop: spacing.xs,
    },
    clearText: { color: colors.danger, fontSize: 13, fontWeight: "700" },

    list: { gap: spacing.sm + 2 },
    empty: { alignItems: "center", paddingVertical: spacing.xxl, gap: spacing.sm },
    emptyTitle: { ...type.heading, color: colors.text },
    emptyText: { fontSize: 14, color: colors.textMuted, textAlign: "center", paddingHorizontal: spacing.lg },

    row: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      ...shadows.sm,
    },
    rowHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
    time: { fontSize: 12, color: colors.textMuted },
    badge: { paddingHorizontal: spacing.sm + 2, paddingVertical: 3, borderRadius: radius.full },
    badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
    desc: { fontSize: 14, lineHeight: 20, color: colors.text, fontWeight: "500" },
    expandHint: { fontSize: 12, color: colors.accentStrong, fontWeight: "600", marginTop: spacing.sm },
    detailBox: { marginTop: spacing.sm, backgroundColor: colors.surfaceAlt, padding: spacing.md, borderRadius: radius.sm },
    detailText: { fontSize: 12, color: colors.text, fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }) },

    footer: {
      paddingVertical: spacing.md,
      backgroundColor: colors.background,
    },
  });