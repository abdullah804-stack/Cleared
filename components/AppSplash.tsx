// components/AppSplash.tsx
// Launch animation: the tooth draws itself, the check pops in, the name rises, then the whole
// screen dissolves into the app. It sits ON TOP of the app, so sign-in and navigation finish
// underneath it and the first screen is already there when it fades.
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import { Gradient, RadialGlow } from "./Gradient";
import { LogoMark } from "./LogoMark";
import { gradients } from "../constants/theme";

// Keep the (static) native splash up until this animated one has rendered, so there is no white flash.
SplashScreen.preventAutoHideAsync().catch(() => {});

const MIN_VISIBLE_MS = 2300; // long enough to enjoy, short enough not to annoy
const EXIT_MS = 480;

export function AppSplash({ ready }: { ready: boolean }) {
  const { width, height } = useWindowDimensions();
  const [minElapsed, setMinElapsed] = useState(false);
  const [gone, setGone] = useState(false);

  const tooth = useSharedValue(0);
  const check = useSharedValue(0);
  const ring = useSharedValue(0);
  const pop = useSharedValue(1);
  const pulse = useSharedValue(0);
  const word = useSharedValue(0);
  const tagline = useSharedValue(0);
  const exit = useSharedValue(1);

  useEffect(() => {
    ring.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    tooth.value = withDelay(250, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    check.value = withDelay(1050, withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }));
    pop.value = withDelay(1300, withSequence(withSpring(1.1, { damping: 8, stiffness: 220 }), withSpring(1, { damping: 12 })));
    pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true);
    word.value = withDelay(850, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    tagline.value = withDelay(1250, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));

    const t = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(t);
  }, []);

  // Start fading only when the app underneath is ready AND the animation has had its moment.
  useEffect(() => {
    if (!ready || !minElapsed) return;
    exit.value = withTiming(0, { duration: EXIT_MS, easing: Easing.in(Easing.quad) });
    const t = setTimeout(() => setGone(true), EXIT_MS + 40);
    return () => clearTimeout(t);
  }, [ready, minElapsed]);

  const container = useAnimatedStyle(() => ({
    opacity: exit.value,
    transform: [{ scale: 1 + (1 - exit.value) * 0.06 }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value,
    transform: [{ scale: 0.7 + ring.value * 0.3 }],
  }));
  const halo = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.35,
    transform: [{ scale: 1 + pulse.value * 0.12 }],
  }));
  const logo = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: (1 - word.value) * 14 }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.value,
    transform: [{ translateY: (1 - tagline.value) * 10 }],
  }));

  if (gone) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, container]}
      pointerEvents="auto"
      onLayout={() => {
        SplashScreen.hideAsync().catch(() => {});
      }}
    >
      <Gradient colors={gradients.hero} style={StyleSheet.absoluteFill} />
      <RadialGlow color="#0EA5E9" size={width * 1.3} opacity={0.35} style={{ position: "absolute", top: -width * 0.45, right: -width * 0.5 }} />
      <RadialGlow color="#14B8A6" size={width * 1.2} opacity={0.25} style={{ position: "absolute", bottom: -width * 0.5, left: -width * 0.55 }} />

      <View style={[styles.center, { paddingBottom: height * 0.06 }]}>
        <View style={styles.logoWrap}>
          <Animated.View style={[styles.haloWrap, halo]}>
            <RadialGlow color="#38BDF8" size={260} opacity={0.5} />
          </Animated.View>
          <Animated.View style={[styles.ring, ringStyle]}>
            <Animated.View style={logo}>
              <LogoMark size={92} toothProgress={tooth} checkProgress={check} />
            </Animated.View>
          </Animated.View>
        </View>

        <Animated.Text style={[styles.word, wordStyle]}>Cleared</Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>Approve the plan before the AI acts.</Animated.Text>
      </View>

      <Text style={styles.footer}>Smarter dental care</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 999, elevation: 999 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoWrap: { width: 260, height: 260, alignItems: "center", justifyContent: "center" },
  haloWrap: { position: "absolute", width: 260, height: 260 },
  ring: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  word: { marginTop: 4, fontSize: 40, fontWeight: "800", color: "#FFFFFF", letterSpacing: -1 },
  tagline: { marginTop: 8, fontSize: 15, color: "rgba(255,255,255,0.68)", letterSpacing: 0.2 },
  footer: {
    position: "absolute",
    bottom: 42,
    alignSelf: "center",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)",
  },
});