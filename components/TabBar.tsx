// components/TabBar.tsx
// Black bottom bar with a raised, glowing Home button in the middle.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Tabs } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ComponentProps } from "react";
import { Gradient } from "./Gradient";
import { useThemeColors, glow, gradients } from "../constants/theme";

export const TAB_BAR_HEIGHT = 64;
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

type IconName = keyof typeof Ionicons.glyphMap;
const META: Record<string, { label: string; off: IconName; on: IconName }> = {
  care: { label: "Care", off: "heart-outline", on: "heart" },
  track: { label: "Track", off: "pulse-outline", on: "pulse" },
  index: { label: "Home", off: "home-outline", on: "home" },
  help: { label: "Help", off: "medkit-outline", on: "medkit" },
  more: { label: "More", off: "grid-outline", on: "grid" },
};

export function TabBar({ state, emitter, navigateToTab }: TabBarProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { backgroundColor: "#000000", borderTopColor: colors.border, paddingBottom: insets.bottom, height: TAB_BAR_HEIGHT + insets.bottom }]}>
      {state.routes.map((route, i) => {
        const meta = META[route.name];
        if (!meta) return null;
        const focused = state.index === i;
        const isHome = route.name === "index";

        const onPress = () => {
          Haptics.selectionAsync().catch(() => {});
          const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={meta.label}>
            {isHome ? (
              <Gradient colors={focused ? gradients.glow : ["#0B2A33", "#0B2A33"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.home, focused && glow(colors.accent, 0.8), { borderColor: focused ? colors.accent : colors.border }]}>
                <Ionicons name={focused ? meta.on : meta.off} size={26} color={focused ? colors.onAccent : colors.accentStrong} />
              </Gradient>
            ) : (
              <View style={styles.iconWrap}>
                {focused && <View style={[styles.line, glow(colors.accent, 0.9), { backgroundColor: colors.accent }]} />}
                <Ionicons name={focused ? meta.on : meta.off} size={23} color={focused ? colors.accent : colors.textMuted} />
              </View>
            )}
            <Text style={[styles.label, { color: focused ? colors.accent : colors.textMuted, fontWeight: focused ? "800" : "600" }]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, alignItems: "flex-end" },
  item: { flex: 1, height: TAB_BAR_HEIGHT, alignItems: "center", justifyContent: "flex-end", paddingBottom: 8 },
  iconWrap: { alignItems: "center", justifyContent: "center", height: 30, marginBottom: 2 },
  line: { position: "absolute", top: -9, width: 22, height: 3, borderRadius: 2 },
  home: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 2, marginTop: -24, borderWidth: 2 },
  label: { fontSize: 11 },
});