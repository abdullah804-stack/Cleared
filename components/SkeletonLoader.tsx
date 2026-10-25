// components/SkeletonLoader.tsx
import { useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from "react-native-reanimated";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export function SkeletonLoader() {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={24} color={colors.accent} />
        <Text style={styles.title}>Agent is thinking...</Text>
      </View>
      <Text style={styles.subtitle}>Breaking down your request and selecting tools.</Text>

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

const styles = StyleSheet.create({
  container: { marginTop: spacing.xl },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xl },
  cardList: { gap: spacing.md },
  card: { flexDirection: "row", backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border, marginRight: spacing.md },
  textLines: { flex: 1, gap: 8 },
  lineLong: { height: 12, backgroundColor: colors.border, borderRadius: 4, width: "80%" },
  lineShort: { height: 10, backgroundColor: colors.border, borderRadius: 4, width: "40%" },
});