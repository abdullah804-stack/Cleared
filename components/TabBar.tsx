// components/TabBar.tsx
// Black bar with rounded glowing top, a glowing pill behind the active tab, and a raised Home button.
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gradient } from "./Gradient";
import { useThemeColors, glow, gradients } from "../constants/theme";

export const TAB_BAR_HEIGHT = 70;

type BottomTabBarProps = {
  state: {
    routes: { key: string; name: string }[];
    index: number;
  };
  navigation: {
    emit: (event: { type: "tabPress"; target: string; canPreventDefault: true }) => { defaultPrevented?: boolean };
    navigate: (name: never) => void;
  };
};

type IconName = keyof typeof Ionicons.glyphMap;
const META: Record<string, { label: string; off: IconName; on: IconName }> = {
  care: { label: "Care", off: "heart-outline", on: "heart" },
  track: { label: "Track", off: "pulse-outline", on: "pulse" },
  index: { label: "Home", off: "home-outline", on: "home" },
  help: { label: "Help", off: "medkit-outline", on: "medkit" },
  more: { label: "More", off: "apps-outline", on: "apps" },
};

function Item({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  const meta = META[name];
  const on = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    on.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 180 });
  }, [focused]);

  const pill = useAnimatedStyle(() => ({ opacity: on.value, transform: [{ scaleX: interpolate(on.value, [0, 1], [0.5, 1]) }] }));
  const icon = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(on.value, [0, 1], [1, 1.12]) }, { translateY: interpolate(on.value, [0, 1], [0, -1]) }] }));
  const home = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(on.value, [0, 1], [1, 1.06]) }] }));

  if (name === "index") {
    return (
      <Pressable onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel="Home">
        <Animated.View style={home}>
          <Gradient
            colors={focused ? gradients.glow : ["#0B2A33", "#071A20"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.home, { borderColor: focused ? "#A5F3FC" : "rgba(34,211,238,0.35)" }, glow(colors.accent, focused ? 0.9 : 0.35)]}
          >
            <Ionicons name={focused ? meta.on : meta.off} size={27} color={focused ? colors.onAccent : colors.accentStrong} />
          </Gradient>
        </Animated.View>
        <Text style={[styles.label, { color: focused ? colors.accentStrong : colors.textMuted, fontWeight: focused ? "800" : "600" }]}>{meta.label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={meta.label}>
      <View style={styles.iconBox}>
        <Animated.View style={[styles.pill, { backgroundColor: colors.accentMuted, borderColor: "rgba(34,211,238,0.45)" }, glow(colors.accent, 0.35), pill]} />
        <Animated.View style={icon}>
          <Ionicons name={focused ? meta.on : meta.off} size={22} color={focused ? colors.accentStrong : colors.textMuted} />
        </Animated.View>
      </View>
      <Text style={[styles.label, { color: focused ? colors.accentStrong : colors.textMuted, fontWeight: focused ? "800" : "600" }]}>{meta.label}</Text>
    </Pressable>
  );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { borderColor: "rgba(34,211,238,0.22)", height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
      <Gradient colors={["rgba(34,211,238,0.10)", "rgba(0,0,0,0)"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.topGlow} />
      {state.routes.map((route: BottomTabBarProps["state"]["routes"][number], i: number) => {
        if (!META[route.name]) return null;
        const focused = state.index === i;
        const onPress = () => {
          Haptics.selectionAsync().catch(() => {});
          const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name as never);
        };
        return <Item key={route.key} name={route.name} focused={focused} onPress={onPress} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "flex-end", backgroundColor: "#000000", borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  topGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 34, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  item: { flex: 1, height: TAB_BAR_HEIGHT, alignItems: "center", justifyContent: "flex-end", paddingBottom: 9 },
  iconBox: { width: 54, height: 32, alignItems: "center", justifyContent: "center", marginBottom: 3 },
  pill: { position: "absolute", width: 54, height: 32, borderRadius: 16, borderWidth: 1 },
  home: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", marginTop: -26, marginBottom: 3, borderWidth: 2 },
  label: { fontSize: 11 },
});