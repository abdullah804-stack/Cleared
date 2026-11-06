// components/TabPage.tsx
// Shared frame for the Care / Track / Help / More tabs: title header, tool rows, and a chat button.
// Deliberately built from plain views (no SVG, no animation) so these screens cannot crash on switch.
import { ReactNode, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "./Card";
import { useThemeColors, ThemeColors, spacing } from "../constants/theme";
import type { Tool, IconName } from "../constants/tools";

export function ToolRow({ tool }: { tool: Tool; index?: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  return (
    <View style={{ marginBottom: spacing.sm + 2 }}>
      <Card onPress={() => router.push(tool.path as any)} accessibilityLabel={`${tool.title}. ${tool.sub}`} style={styles.row}>
        <View style={[styles.icon, { backgroundColor: `${tool.tint}1A`, borderColor: `${tool.tint}55` }]}>
          <Ionicons name={tool.icon} size={22} color={tool.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{tool.title}</Text>
          <Text style={styles.sub} numberOfLines={2}>{tool.sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Card>
    </View>
  );
}

/** Floating "ask the AI" button. */
export function ChatFab({ bottom }: { bottom: number }) {
  const colors = useThemeColors();
  const router = useRouter();
  return (
    <View style={{ position: "absolute", right: spacing.md, bottom }} pointerEvents="box-none">
      <View pointerEvents="none" style={{ position: "absolute", width: 66, height: 66, left: -5, top: -5, borderRadius: 33, backgroundColor: colors.accent, opacity: 0.16 }} />
      <Pressable
        onPress={() => {
          router.push("/chat" as any);
        }}
        accessibilityRole="button"
        accessibilityLabel="Ask Cleared AI"
      >
        <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent }}>
          <Ionicons name="chatbubble-ellipses" size={26} color={colors.onAccent} />
        </View>
      </Pressable>
    </View>
  );
}

export function TabPage({ title, subtitle, icon, tint, children, fab = true }: { title: string; subtitle: string; icon: IconName; tint?: string; children: ReactNode; fab?: boolean }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const accent = tint ?? colors.accent;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
          <View style={styles.headRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heading}>{title}</Text>
              <Text style={styles.headSub}>{subtitle}</Text>
            </View>
            <View style={[styles.headIcon, { borderColor: `${accent}66`, backgroundColor: `${accent}1A` }]}>
              <Ionicons name={icon} size={26} color={accent} />
            </View>
          </View>
        </View>
        <View style={styles.body}>{children}</View>
      </ScrollView>
      {fab && <ChatFab bottom={spacing.md} />}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, backgroundColor: "#06141B", borderBottomWidth: 1, borderColor: "rgba(34,211,238,0.25)" },
    headRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    heading: { fontSize: 32, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.9 },
    headSub: { fontSize: 14.5, lineHeight: 20, color: "rgba(255,255,255,0.65)", marginTop: 3 },
    headIcon: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
    body: { paddingHorizontal: spacing.md, paddingTop: spacing.lg },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    icon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
    title: { fontSize: 16, fontWeight: "700", color: colors.text },
    sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  });