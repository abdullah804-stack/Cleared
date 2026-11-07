export { ErrorBoundary } from "expo-router";
// app/(tabs)/index.tsx  (Home)
import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, interpolateColor, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { thud } from "../../utils/haptics";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Avatar } from "../../components/Avatar";
import { Gradient, RadialGlow } from "../../components/Gradient";
import { TodayCard } from "../../components/TodayCard";
import { VideoRail } from "../../components/VideoRail";
import { HomeChat } from "../../components/HomeChat";
import { AdviceMarquee } from "../../components/AdviceMarquee";
import { useThemeColors, ThemeColors, glow, gradients, motion, radius, spacing, type } from "../../constants/theme";
import { QUICK_ACTIONS } from "../../constants/tools";
import { useIdentity } from "../../hooks/useIdentity";

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = () => {};
try {
  const SpeechRecognition = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = SpeechRecognition.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = SpeechRecognition.useSpeechRecognitionEvent;
} catch (e) {}

const PROBLEM_CHIPS: { label: string; icon: keyof typeof Ionicons.glyphMap; tint: string }[] = [
  { label: "Toothache", icon: "thermometer", tint: "#FB7185" },
  { label: "Swelling", icon: "body", tint: "#FBBF24" },
  { label: "Broken tooth", icon: "construct", tint: "#A78BFA" },
  { label: "Bleeding gums", icon: "water", tint: "#F87171" },
  { label: "Sensitivity", icon: "snow", tint: "#60A5FA" },
  { label: "Cleaning", icon: "sparkles", tint: "#22D3EE" },
  { label: "Bad breath", icon: "leaf", tint: "#34D399" },
  { label: "Wisdom tooth", icon: "alert-circle", tint: "#F97316" },
  { label: "Braces", icon: "git-compare", tint: "#2DD4BF" },
  { label: "Kids", icon: "happy", tint: "#F472B6" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function MicButton({ listening, onPress, colors }: { listening: boolean; onPress: () => void; colors: ThemeColors }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (listening) pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, false);
    else pulse.value = withTiming(0, { duration: 200 });
  }, [listening]);
  const ring = useAnimatedStyle(() => ({ opacity: listening ? 0.5 * (1 - pulse.value) : 0, transform: [{ scale: 1 + pulse.value * 0.7 }] }));
  return (
    <View style={{ width: 54, height: 54, alignItems: "center", justifyContent: "center" }}>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", width: 54, height: 54, borderRadius: 27, backgroundColor: colors.danger }, ring]} />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={listening ? "Stop voice input" : "Start voice input"}
        style={{ width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: listening ? colors.danger : colors.accentMuted, borderWidth: 1, borderColor: listening ? colors.danger : "rgba(34,211,238,0.4)" }}
      >
        <Ionicons name={listening ? "stop" : "mic"} size={22} color={listening ? "#FFFFFF" : colors.accentStrong} />
      </Pressable>
    </View>
  );
}

function SectionTitle({ title, hint, colors }: { title: string; hint?: string; colors: ThemeColors }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: spacing.md, marginTop: spacing.xl, marginBottom: spacing.md }}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text, letterSpacing: -0.4 }}>{title}</Text>
      {hint ? <Text style={{ fontSize: 12, color: colors.textMuted }}>{hint}</Text> : null}
    </View>
  );
}

export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { username, avatarId } = useIdentity();

  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);

  const focus = useSharedValue(0);
  const inputBox = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.border, colors.accent]),
    backgroundColor: interpolateColor(focus.value, [0, 1], [colors.surfaceAlt, colors.surface]),
  }));

  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("result", (event: any) => setInput(event.results[0]?.transcript || ""));

  const toggleListening = async () => {
    thud();
    if (!ExpoSpeechRecognitionModule) return Alert.alert("Not Available", "Voice requires the APK build.");
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
    } else {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) return;
      ExpoSpeechRecognitionModule.start({ lang: "ur-PK", interimResults: true });
    }
  };

  const handlePlan = (customText?: string) => {
    const text = customText || input;
    if (!text.trim()) return;
    router.push({ pathname: "/triage", params: { request: text } } as never);
  };

  const enter = (i: number) => FadeInDown.delay(60 + i * 70).duration(480);
  const today = new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ─────────────────────────────── */}
          <Gradient colors={gradients.hero} style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
            <RadialGlow color="#22D3EE" size={340} opacity={0.38} style={{ position: "absolute", top: -170, right: -110 }} />
            <RadialGlow color="#2DD4BF" size={260} opacity={0.2} style={{ position: "absolute", bottom: -150, left: -100 }} />
            <Animated.View entering={FadeInDown.duration(480)} style={styles.headerRow}>
              <Pressable onPress={() => router.push("/settings")} style={styles.profile} accessibilityRole="button" accessibilityLabel="Open your profile">
                <Avatar id={avatarId} size={58} ring />
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.greeting}>{greeting()}</Text>
                  <Text style={styles.name} numberOfLines={1}>{username}</Text>
                  <Text style={styles.date}>{today}</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => router.push("/settings")} style={styles.glassBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Settings">
                <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
              </Pressable>
            </Animated.View>

            <Animated.View entering={enter(1)} style={styles.quickRow}>
              {QUICK_ACTIONS.map((q) => (
                <Pressable key={q.path} onPress={() => router.push(q.path as any)} style={styles.quick} accessibilityRole="button" accessibilityLabel={q.title}>
                  <View style={[styles.quickIcon, { backgroundColor: `${q.tint}1A`, borderColor: `${q.tint}66` }, glow(q.tint, 0.5)]}>
                    <Ionicons name={q.icon} size={22} color={q.tint} />
                  </View>
                  <Text style={styles.quickLabel}>{q.title}</Text>
                </Pressable>
              ))}
            </Animated.View>
          </Gradient>

          {/* ── Streak ─────────────────────────────── */}
          <Animated.View entering={enter(3)} style={{ paddingHorizontal: spacing.md, marginTop: spacing.lg }}>
            <TodayCard />
          </Animated.View>

          {/* ── AI plan ────────────────────────────── */}
          <SectionTitle title="Get a care plan" hint="AI plans, you approve" colors={colors} />
          <Animated.View entering={enter(4)} style={{ paddingHorizontal: spacing.md }}>
            <Card padded={false} style={[styles.askCard, glow(colors.accent, 0.18)]}>
              <Text style={styles.askTitle}>What's bothering you?</Text>
              <Text style={styles.askSub}>Describe it in your own words. English or Urdu.</Text>

              <Animated.View style={[styles.inputBox, inputBox]}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. My molar hurts when I drink something cold"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.accent}
                  multiline
                  value={input}
                  onChangeText={setInput}
                  onFocus={() => (focus.value = withTiming(1, { duration: motion.fast }))}
                  onBlur={() => (focus.value = withTiming(0, { duration: motion.fast }))}
                  textAlignVertical="top"
                />
              </Animated.View>

              <View style={styles.askFooter}>
                <MicButton listening={isListening} onPress={toggleListening} colors={colors} />
                <View style={{ flex: 1 }}>
                  <Button title="Generate Plan" icon="sparkles" onPress={() => handlePlan()} disabled={!input.trim()} />
                </View>
              </View>

              <View style={styles.divider} />
              <Text style={styles.pickLabel}>OR PICK A COMMON PROBLEM</Text>
              <View style={styles.grid}>
                {PROBLEM_CHIPS.slice(0, 6).map((chip) => (
                  <Pressable
                    key={chip.label}
                    onPress={() => handlePlan(chip.label)}
                    style={({ pressed }) => [styles.tile, { borderColor: `${chip.tint}40`, opacity: pressed ? 0.8 : 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Start a plan for ${chip.label}`}
                  >
                    <View style={[styles.tileIcon, { backgroundColor: `${chip.tint}1F`, borderColor: `${chip.tint}55` }]}>
                      <Ionicons name={chip.icon} size={20} color={chip.tint} />
                    </View>
                    <Text style={styles.tileText} numberOfLines={1}>{chip.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          </Animated.View>

          {/* ── Advice ─────────────────────────────── */}
          <SectionTitle title="Dentist advice" hint="Quick tips" colors={colors} />
          <Animated.View entering={enter(5)}>
            <AdviceMarquee />
          </Animated.View>

          {/* ── Videos ─────────────────────────────── */}
          <SectionTitle title="Watch and learn" hint="Opens in YouTube" colors={colors} />
          <Animated.View entering={enter(6)}>
            <VideoRail />
          </Animated.View>

          {/* ── Chat ───────────────────────────────── */}
          <SectionTitle title="Ask a question" colors={colors} />
          <Animated.View entering={enter(7)} style={{ paddingHorizontal: spacing.md }}>
            <HomeChat />
          </Animated.View>

          <Text style={styles.footnote}>Cleared gives guidance, not a diagnosis. In an emergency call 1122.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: "#000000" },
    header: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    profile: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexShrink: 1 },
    greeting: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.65)" },
    name: { fontSize: 24, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5, maxWidth: 230 },
    date: { fontSize: 12, color: colors.accentStrong, marginTop: 1, opacity: 0.9 },
    glassBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
    quickRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.lg },
    quick: { alignItems: "center", gap: 7, flex: 1 },
    quickIcon: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
    quickLabel: { fontSize: 11.5, fontWeight: "700", color: "rgba(255,255,255,0.85)" },

    askCard: { padding: spacing.md + 2, borderColor: "rgba(34,211,238,0.28)" },
    askTitle: { fontSize: 18, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
    askSub: { fontSize: 13, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
    inputBox: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
    input: { fontSize: 16, lineHeight: 23, color: colors.text, minHeight: 72, padding: 0 },
    askFooter: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, marginTop: spacing.md },
    divider: { height: 1, backgroundColor: colors.border, marginTop: spacing.md + 2 },
    pickLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm + 2 },
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.sm },
    tile: { width: "31.5%", alignItems: "center", paddingVertical: 12, paddingHorizontal: 6, borderRadius: radius.md, borderWidth: 1, backgroundColor: colors.surfaceAlt },
    tileIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 7 },
    tileText: { fontSize: 12.5, fontWeight: "700", color: colors.text },

    footnote: { ...type.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl, paddingHorizontal: spacing.xl },
  });