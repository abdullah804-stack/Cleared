// components/Button.tsx
import { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Gradient } from "./Gradient";
import { useThemeColors, radius, spacing, glow, gradients, motion } from "../constants/theme";

type Variant = "primary" | "soft" | "ghost" | "danger";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ComponentProps<typeof Ionicons>["name"];
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const inactive = disabled || loading;

  const textColor =
    variant === "primary" ? colors.onAccent : variant === "danger" ? colors.onDanger : variant === "soft" ? colors.accentStrong : colors.text;

  const content: ReactNode = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <View style={styles.row}>
      {icon && <Ionicons name={icon} size={18} color={textColor} />}
      <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );

  const surface: ViewStyle =
    variant === "danger"
      ? { backgroundColor: colors.danger }
      : variant === "soft"
        ? { backgroundColor: colors.accentMuted }
        : variant === "ghost"
          ? { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border }
          : {};

  return (
    <Animated.View
      style={[
        animated,
        variant === "primary" && !inactive && glow(colors.accent, 0.3),
        variant === "danger" && !inactive && glow(colors.danger, 0.22),
        inactive && { opacity: 0.55 },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        onPressIn={() => (scale.value = withSpring(0.97, motion.press))}
        onPressOut={() => (scale.value = withSpring(1, motion.press))}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress();
        }}
      >
        {variant === "primary" ? (
          <Gradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.base}>
            {content}
          </Gradient>
        ) : (
          <View style={[styles.base, surface]}>{content}</View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  text: { fontSize: 16, fontWeight: "700", letterSpacing: 0.1 },
});