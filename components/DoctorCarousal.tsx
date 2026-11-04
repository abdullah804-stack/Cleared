// components/DoctorCarousel.tsx
// Slow auto-advancing carousel of dentist tips. Pauses while the user touches it.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Gradient, RadialGlow } from "./Gradient";
import { useThemeColors, glow, radius, spacing } from "../constants/theme";
import { TIPS } from "../constants/tools";

const GAP = 12;
const EVERY_MS = 5500;

function Dot({ active, color }: { active: boolean; color: string }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 22 : 7, { duration: 260 }),
    opacity: withTiming(active ? 1 : 0.35, { duration: 260 }),
  }));
  return <Animated.View style={[{ height: 7, borderRadius: 4, backgroundColor: color }, style]} />;
}

export function DoctorCarousel() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const cardW = width - spacing.md * 2;
  const snap = cardW + GAP;
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const paused = useRef(false);
  const resume = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (i: number) => {
      indexRef.current = i;
      setIndex(i);
      ref.current?.scrollTo({ x: i * snap, animated: true });
    },
    [snap]
  );

  useEffect(() => {
    const id = setInterval(() => {
      if (paused.current) return;
      goTo((indexRef.current + 1) % TIPS.length);
    }, EVERY_MS);
    return () => {
      clearInterval(id);
      if (resume.current) clearTimeout(resume.current);
    };
  }, [goTo]);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / snap);
    indexRef.current = i;
    setIndex(i);
  };

  const hold = () => {
    paused.current = true;
    if (resume.current) clearTimeout(resume.current);
  };
  const release = () => {
    if (resume.current) clearTimeout(resume.current);
    resume.current = setTimeout(() => (paused.current = false), 6000);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { width: cardW, minHeight: 168, borderRadius: radius.xl, padding: spacing.lg, overflow: "hidden", borderWidth: 1 },
        label: { fontSize: 11, fontWeight: "800", letterSpacing: 1.3, textTransform: "uppercase" },
        title: { fontSize: 21, lineHeight: 27, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.4, marginTop: 6, paddingRight: 56 },
        text: { fontSize: 14.5, lineHeight: 21, color: "rgba(255,255,255,0.78)", marginTop: 8 },
        icon: { position: "absolute", top: spacing.lg, right: spacing.lg, width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 1 },
        dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.md },
      }),
    [cardW]
  );

  return (
    <View>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snap}
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: GAP }}
        onScrollBeginDrag={hold}
        onScrollEndDrag={release}
        onMomentumScrollEnd={settle}
      >
        {TIPS.map((t) => (
          <Gradient key={t.title} colors={["#05090D", "#0A141C", `${t.tint}33`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { borderColor: `${t.tint}44` }, glow(t.tint, 0.25)]}>
            <RadialGlow color={t.tint} size={220} opacity={0.35} style={{ position: "absolute", top: -90, right: -70 }} />
            <Text style={[styles.label, { color: t.tint }]}>Dentist's tip</Text>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.text}>{t.text}</Text>
            <View style={[styles.icon, { backgroundColor: `${t.tint}22`, borderColor: `${t.tint}66` }]}>
              <Ionicons name={t.icon} size={24} color={t.tint} />
            </View>
          </Gradient>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {TIPS.map((t, i) => (
          <Dot key={t.title} active={i === index} color={colors.accent} />
        ))}
      </View>
    </View>
  );
}