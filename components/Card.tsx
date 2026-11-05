// components/Card.tsx
// One card style for the whole app. Pass onPress to make it tappable (with a press animation).
import { ReactNode } from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useThemeColors, radius, spacing, shadows, motion } from "../constants/theme";

// Style keys that position the card inside its parent. When the card is tappable these must go on the
// OUTER animated wrapper (so "width: 48%" in a grid still works); everything else styles the card itself.
const LAYOUT_KEYS = [
  "width", "minWidth", "maxWidth", "flex", "flexGrow", "flexShrink", "flexBasis", "alignSelf",
  "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "marginHorizontal", "marginVertical",
  "position", "top", "left", "right", "bottom",
];

function splitStyle(style?: StyleProp<ViewStyle>) {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, any>;
  const outer: Record<string, any> = {};
  const inner: Record<string, any> = {};
  for (const k of Object.keys(flat)) (LAYOUT_KEYS.includes(k) ? outer : inner)[k] = flat[k];
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

export function Card({
  children,
  onPress,
  style,
  padded = true,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  accessibilityLabel?: string;
}) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bg = (StyleSheet.flatten(style) as any)?.backgroundColor;
  const isTransparent = typeof bg === "string" && (/^rgba/i.test(bg) || /^#[0-9a-f]{8}$/i.test(bg));

  const surface: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    ...shadows.sm,
    shadowColor: colors.accent, // a faint cyan halo on the black canvas
    shadowOpacity: isTransparent ? 0 : 0.12,
    shadowRadius: 12,
    ...(isTransparent ? { elevation: 0 } : {}),
  };

  if (!onPress) {
    return <View style={[styles.card, surface, padded && styles.padded, style]}>{children}</View>;
  }

  const { outer, inner } = splitStyle(style);

  return (
    <Animated.View style={[animated, outer]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPressIn={() => (scale.value = withSpring(0.97, motion.press))}
        onPressOut={() => (scale.value = withSpring(1, motion.press))}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress();
        }}
        style={[styles.card, surface, padded && styles.padded, inner]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1 },
  padded: { padding: spacing.md },
});