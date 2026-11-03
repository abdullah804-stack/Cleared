// components/Input.tsx
// Text field with an icon, animated focus ring, show/hide for passwords and an error state.
import { ComponentProps, ComponentRef, forwardRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, TextInputProps } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors, radius, spacing, motion } from "../constants/theme";

type Props = TextInputProps & {
  icon?: ComponentProps<typeof Ionicons>["name"];
  error?: boolean;
};

export const Input = forwardRef<ComponentRef<typeof TextInput>, Props>(function Input({ icon, error, secureTextEntry, onFocus, onBlur, style, ...rest }, ref) {
  const colors = useThemeColors();
  const focus = useSharedValue(0);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  const box = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.border, colors.accent]),
    backgroundColor: interpolateColor(focus.value, [0, 1], [colors.surfaceAlt, colors.surface]),
  }));

  const iconColor = error ? colors.danger : focused ? colors.accent : colors.textMuted;

  return (
    <Animated.View style={[styles.box, box, error && { borderColor: colors.danger }]}>
      {icon && <Ionicons name={icon} size={18} color={iconColor} />}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[styles.input, { color: colors.text }, style]}
        secureTextEntry={hidden}
        onFocus={(e) => {
          setFocused(true);
          focus.value = withTiming(1, { duration: motion.fast });
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          focus.value = withTiming(0, { duration: motion.fast });
          onBlur?.(e);
        }}
        {...rest}
      />
      {secureTextEntry && (
        <Pressable onPress={() => setHidden((v) => !v)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Show or hide password">
          <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={20} color={colors.textMuted} />
        </Pressable>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    height: 56,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },
});