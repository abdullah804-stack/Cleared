// components/Button.tsx
import { useMemo } from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors, ThemeColors, radius, spacing, shadows, glow } from "../constants/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger" | "soft";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = "primary", disabled = false, loading = false, style }: ButtonProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  const isGhost = variant === "ghost";
  const isSoft = variant === "soft";
  const inactive = disabled || loading;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const spinnerColor = isPrimary ? colors.onAccent : isDanger ? colors.onDanger : colors.accent;

  return (
    <Pressable
      onPress={handlePress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.primary,
        isSoft && styles.soft,
        isGhost && styles.ghost,
        isDanger && styles.danger,
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && styles.textPrimary,
            isDanger && styles.textDanger,
            isSoft && styles.textSoft,
            isGhost && styles.textGhost,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    base: {
      height: 54,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
    },
    primary: { backgroundColor: colors.accent, ...glow(colors.accent, 0.25) },
    soft: { backgroundColor: colors.accentMuted },
    ghost: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    danger: { backgroundColor: colors.danger, ...glow(colors.danger, 0.2) },
    disabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
    pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
    text: { fontSize: 16, fontWeight: "600", letterSpacing: -0.1 },
    textPrimary: { color: colors.onAccent },
    textDanger: { color: colors.onDanger },
    textSoft: { color: colors.accentStrong },
    textGhost: { color: colors.text },
  });