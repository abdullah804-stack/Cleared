// components/TabPage.tsx
// Shared frame for the Care / Track / Help / More tabs: glowing title header, tool rows, and a chat button.
import { ReactNode, useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gradient, RadialGlow } from "./Gradient";
import { Card } from "./Card";
import { TAB_BAR_HEIGHT } from "./TabBar";
import { useThemeColors, ThemeColors, glow, gradients, radius, spacing, type } from "../constants/theme";
import type { Tool, IconName } from "../constants/tools";

export function ToolRow({ tool, index = 0 }: { tool: Tool; index?: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 60).duration(380)} style={{ marginBottom: spacing.sm + 2 }}>
      <Card onPress={() => router.push(tool.path as any)} accessibilityLabel={`${tool.title}. ${tool.sub}`} style={styles.row}>
        <View style={[styles.icon, { backgroundColor: `${tool.tint}1A`, borderColor: `${tool.tint}55` }, glow(tool.tint, 0.35)]}>
          <Ionicons name={tool.icon} size={22} color={tool.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{tool.title}</Text>
          <Text style={styles.sub} numberOfLines={2}>{tool.sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Card>
    </Animated.View>
  );
}

/** Floating "ask the AI" button with a breathing glow. */
export function ChatFab({ bottom }: { bottom: number }) {
  const colors = useThemeColors();
  const router = useRouter();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1400 }), withTiming(0, { duration: 1400 })), -1);
  }, []);
  const halo = useAnimatedStyle(() => ({ opacity: 0.35 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 0.5 }] }));
  return (
    <View style={{ position: "absolute", right: spacing.md, bottom }} pointerEvents="box-none">
      <Animated.View pointerEvents="none" style={[{ position: "absolute", width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent }, halo]} />
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          router.push("/chat" as any);
        }}
        accessibilityRole="button"
        accessibilityLabel="Ask Cleared AI"
      >
        <Gradient colors={gradients.glow} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" }, glow(colors.accent, 0.8)]}>
          <Ionicons name="chatbubble-ellipses" size={26} color={colors.onAccent} />
        </Gradient>
      </Pressable>
    </View>
  );
}

export function TabPage({ title, subtitle, icon, tint, children, fab = true }: { title: string; subtitle: string; icon: IconName; tint?: string; children: ReactNode; fab?: boolean }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const barH = TAB_BAR_HEIGHT + insets.bottom;
  const accent = tint ?? colors.accent;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: barH + 90 }} showsVerticalScrollIndicator={false}>
        <Gradient colors={gradients.hero} style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
          <RadialGlow color={accent} size={300} opacity={0.35} style={{ position: "absolute", top: -140, right: -90 }} />
          <Animated.View entering={FadeInDown.duration(420)} style={styles.headRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heading}>{title}</Text>
              <Text style={styles.headSub}>{subtitle}</Text>
            </View>
            <View style={[styles.headIcon, { borderColor: `${accent}66`, backgroundColor: `${accent}1A` }, glow(accent, 0.6)]}>
              <Ionicons name={icon} size={26} color={accent} />
            </View>
          </Animated.View>
        </Gradient>
        <View style={styles.body}>{children}</View>
      </ScrollView>
      {fab && <ChatFab bottom={barH + spacing.md} />}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
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