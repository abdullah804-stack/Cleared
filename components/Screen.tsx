// components/Screen.tsx
import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeColors, spacing } from "../constants/theme";

export function Screen({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const colors = useThemeColors();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
});