// app/audit.tsx
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { readAuditLog } from "../shared/audit";
import { AuditEntry } from "../shared/types";

export default function AuditScreen() {
  const router = useRouter();
  const [userId] = useState("demo-user-123");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    readAuditLog(userId).then(setEntries);
  }, []);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Audit Log</Text>
          <Text style={styles.subtitle}>Complete trace of this session</Text>
        </View>

        <View style={styles.list}>
          {entries.length === 0 && (
            <Text style={styles.emptyText}>No audit entries found.</Text>
          )}

          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <Pressable
                key={entry.id}
                style={styles.row}
                onPress={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                <View style={styles.rowHeader}>
                  <Text style={styles.time}>{formatTime(entry.timestamp)}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{entry.type}</Text>
                  </View>
                </View>
                <Text style={styles.desc}>{entry.description}</Text>
                
                {isExpanded && entry.detail && (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailText}>
                      {JSON.stringify(entry.detail, null, 2)}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="New request"
          onPress={() => router.replace("/")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: spacing.xl },
  header: { marginTop: spacing.md, marginBottom: spacing.lg },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  list: { gap: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textMuted, fontStyle: "italic" },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: "monospace",
  },
  badge: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.accent,
  },
  desc: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  detailBox: {
    marginTop: spacing.md,
    backgroundColor: "#F3F4F6",
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  detailText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: "monospace",
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});