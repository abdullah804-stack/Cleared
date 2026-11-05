// components/AdviceMarquee.tsx
// Short dentist advice cards drifting left to right. A new random order every time the app opens.
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Marquee } from "./Marquee";
import { Gradient } from "./Gradient";
import { glow, radius, spacing } from "../constants/theme";
import { ADVICE } from "../constants/tools";

export function AdviceMarquee() {
  const list = useMemo(() => [...ADVICE].sort(() => Math.random() - 0.5), []);
  return (
    <Marquee speed={26} gap={spacing.md}>
      {list.map((a) => (
        <Gradient key={a.text} colors={["#05090D", "#0A141C", `${a.tint}2E`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { borderColor: `${a.tint}55` }, glow(a.tint, 0.2)]}>
          <View style={[styles.icon, { backgroundColor: `${a.tint}22`, borderColor: `${a.tint}66` }]}>
            <Ionicons name={a.icon} size={18} color={a.tint} />
          </View>
          <Text style={styles.text}>{a.text}</Text>
        </Gradient>
      ))}
    </Marquee>
  );
}

const styles = StyleSheet.create({
  card: { width: 262, minHeight: 128, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, justifyContent: "space-between", gap: spacing.sm },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  text: { fontSize: 14, lineHeight: 20, color: "#F4F8FB", fontWeight: "600" },
});