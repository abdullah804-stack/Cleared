// components/Screen.tsx
import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";
import { useThemeColors, spacing } from "../constants/theme";

export function Screen({
  children,
  style,
  padded = true,
  edges = ["top", "left", "right"],
}: {
  children: ReactNode;
  style?: ViewStyle;
  /** Set false for screens that draw edge-to-edge (heroes, lists). */
  padded?: boolean;
  edges?: Edge[];
}) {
  const colors = useThemeColors();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={edges}>
      <View style={[styles.container, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  padded: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
});