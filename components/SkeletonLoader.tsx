// components/SkeletonLoader.tsx
import { useEffect, useMemo } from "react";
import { StyleSheet, View, Text } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors, ThemeColors, radius, spacing, shadows, type } from "../constants/theme";

export function SkeletonLoader() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0.45, { duration: 800 })),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.sparkle}>
          <Ionicons name="sparkles" size={18} color={colors.accentStrong} />
        </View>
        <Text style={styles.title}>Analyzing symptoms…</Text>
      </View>
      <Text style={styles.subtitle}>Building your step-by-step action plan.</Text>

      <View style={styles.cardList}>
        {[1, 2, 3].map((i) => (
          <Animated.View key={i} style={[styles.card, animatedStyle]}>
            <View style={styles.iconCircle} />
            <View style={styles.textLines}>
              <View style={styles.lineLong} />
              <View style={styles.lineShort} />
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { marginTop: spacing.xl },
    header: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, marginBottom: spacing.xs },
    sparkle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.accentMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { ...type.title, fontSize: 20, color: colors.text },
    subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xl },
    cardList: { gap: spacing.md },
    card: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      ...shadows.sm,
    },
    iconCircle: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceAlt, marginRight: spacing.md },
    textLines: { flex: 1, gap: 8 },
    lineLong: { height: 12, backgroundColor: colors.surfaceAlt, borderRadius: 6, width: "80%" },
    lineShort: { height: 10, backgroundColor: colors.surfaceAlt, borderRadius: 5, width: "40%" },
  });