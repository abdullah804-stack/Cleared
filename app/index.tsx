// app/index.tsx
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics"; // (was missing: tapping the mic crashed the app)
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { TodayCard } from "../components/TodayCard";
import { Gradient, RadialGlow } from "../components/Gradient";
import { useThemeColors, ThemeColors, gradients, motion, radius, shadows, spacing, type } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = () => {};
try {
  const SpeechRecognition = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = SpeechRecognition.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = SpeechRecognition.useSpeechRecognitionEvent;
} catch (e) {}

type IconName = keyof typeof Ionicons.glyphMap;

const PROBLEM_CHIPS: { label: string; icon: IconName; tint: string }[] = [
  { label: "Toothache", icon: "thermometer", tint: "#F43F5E" },
  { label: "Swelling", icon: "body", tint: "#F59E0B" },
  { label: "Broken Tooth", icon: "construct", tint: "#8B5CF6" },
  { label: "Cleaning", icon: "sparkles", tint: "#0EA5E9" },
  { label: "Kids", icon: "happy", tint: "#14B8A6" },
];

type Tool = { title: string; sub: string; icon: IconName; tint: string; path: string };
type ToolGroup = { heading: string; tools: Tool[] };

// Add, remove or reorder tiles here. Remove any tile whose screen doesn't exist yet.
const TOOL_GROUPS: ToolGroup[] = [
  {
    heading: "Your care",
    tools: [
      { title: "Daily Routine", sub: "Brush, floss, keep your streak", icon: "flame", tint: "#F59E0B", path: "/routine" },
      { title: "My Visits", sub: "Upcoming and past appointments", icon: "calendar", tint: "#0EA5E9", path: "/appointments" },
      { title: "Recovery Plan", sub: "Day-by-day after treatment", icon: "heart", tint: "#F43F5E", path: "/recovery" },
      { title: "Visit Notes", sub: "What your dentist said", icon: "document-text", tint: "#6366F1", path: "/visit-notes" },
    ],
  },
  {
    heading: "Track and learn",
    tools: [
      { title: "Pain Journal", sub: "Spot patterns over 7 days", icon: "analytics", tint: "#14B8A6", path: "/journal" },
      { title: "Photo Timeline", sub: "Private, stays on your phone", icon: "camera", tint: "#8B5CF6", path: "/photos" },
      { title: "Cost Estimator", sub: "Typical prices in rupees", icon: "calculator", tint: "#0EA5E9", path: "/estimator" },
      { title: "Community Prices", sub: "What others paid", icon: "people", tint: "#F59E0B", path: "/community-prices" },
    ],
  },
  {
    heading: "Get help",
    tools: [
      { title: "Ask Cleared", sub: "Questions about your care", icon: "chatbubbles", tint: "#0EA5E9", path: "/chat" },
      { title: "Case Card", sub: "Share your case with a clinic", icon: "id-card", tint: "#14B8A6", path: "/case-card" },
      { title: "Dental Profile", sub: "Allergies, medicines, history", icon: "medkit", tint: "#6366F1", path: "/dental-profile" },
      { title: "Family", sub: "Care for your loved ones", icon: "home", tint: "#F43F5E", path: "/family-profiles" },
    ],
  },
  {
    heading: "More",
    tools: [
      { title: "Kids Brushing", sub: "A fun 2-minute timer", icon: "happy", tint: "#14B8A6", path: "/kids-timer" },
      { title: "Ramadan Mode", sub: "Reminders for suhoor and iftar", icon: "moon", tint: "#6366F1", path: "/ramadan" },
      { title: "Audit Log", sub: "Everything the AI did", icon: "shield-checkmark", tint: "#64748B", path: "/audit" },
    ],
  },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Mic button that pulses while listening. */
function MicButton({ listening, onPress, colors }: { listening: boolean; onPress: () => void; colors: ThemeColors }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (listening) pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, false);
    else pulse.value = withTiming(0, { duration: 200 });
  }, [listening]);

  const ring = useAnimatedStyle(() => ({
    opacity: listening ? 0.5 * (1 - pulse.value) : 0,
    transform: [{ scale: 1 + pulse.value * 0.7 }],
  }));

  return (
    <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", width: 48, height: 48, borderRadius: 24, backgroundColor: colors.danger }, ring]}
      />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={listening ? "Stop voice input" : "Start voice input"}
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: listening ? colors.danger : colors.accentMuted,
        }}
      >
        <Ionicons name={listening ? "stop" : "mic"} size={20} color={listening ? "#FFFFFF" : colors.accentStrong} />
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);

  const focus = useSharedValue(0);
  const inputBox = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.border, colors.accent]),
    backgroundColor: interpolateColor(focus.value, [0, 1], [colors.surfaceAlt, colors.surface]),
  }));

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "there";
  const initial = displayName.charAt(0).toUpperCase();

  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("result", (event: any) => setInput(event.results[0]?.transcript || ""));

  const toggleListening = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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
    router.push({ pathname: "/triage", params: { request: text } } as any);
  };

  // Staggered entrance: each block waits a little longer than the one above it.
  const enter = (i: number) => FadeInDown.delay(80 + i * 70).duration(500).springify().damping(18);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── Fixed header ─────────────────────────── */}
      <Gradient colors={gradients.hero} style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <RadialGlow color="#0EA5E9" size={320} opacity={0.4} style={{ position: "absolute", top: -150, right: -110 }} />
        <RadialGlow color="#14B8A6" size={240} opacity={0.25} style={{ position: "absolute", bottom: -140, left: -90 }} />

        <Animated.View entering={FadeInDown.duration(500)} style={styles.headerRow}>
          <Pressable onPress={() => router.push("/settings")} style={styles.profile} accessibilityRole="button" accessibilityLabel="Open settings">
            <Gradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </Gradient>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push("/settings")}
            style={styles.glassBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      </Gradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Ask card ───────────────────────────── */}
          <Animated.View entering={enter(0)} style={[styles.askCard, shadows.md]}>
            <View style={styles.askHeader}>
              <Image source={require("../assets/images/assistant.png")} style={styles.assistantAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.askTitle}>How can I help today?</Text>
                <Text style={styles.askSub}>Describe it in your own words. English or Urdu.</Text>
              </View>
            </View>

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
              <Button
                title="Generate Plan"
                icon="sparkles"
                onPress={() => handlePlan()}
                disabled={!input.trim()}
                style={{ flex: 1, marginLeft: spacing.sm + 2 }}
              />
            </View>
          </Animated.View>

          {/* ── Today ──────────────────────────────── */}
          <Animated.View entering={enter(1)}>
            <TodayCard />
          </Animated.View>

          {/* ── One-tap problems ───────────────────── */}
          <Animated.View entering={enter(1)}>
            <Text style={styles.label}>Or start with one tap</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.chipsContainer}
            >
              {PROBLEM_CHIPS.map((chip) => (
                <Card key={chip.label} onPress={() => handlePlan(chip.label)} padded={false} style={styles.chip} accessibilityLabel={chip.label}>
                  <View style={[styles.chipIcon, { backgroundColor: `${chip.tint}1F` }]}>
                    <Ionicons name={chip.icon} size={16} color={chip.tint} />
                  </View>
                  <Text style={styles.chipText}>{chip.label}</Text>
                </Card>
              ))}
            </ScrollView>
          </Animated.View>

          {/* ── Emergency ──────────────────────────── */}
          <Animated.View entering={enter(2)}>
            <Pressable
              onPress={() => router.push("/emergency-aid" as any)}
              style={({ pressed }) => [styles.emergency, pressed && { opacity: 0.9 }]}
              accessibilityRole="button"
              accessibilityLabel="Dental emergency first-aid"
            >
              <View style={styles.emergencyIcon}>
                <Ionicons name="medkit" size={22} color={colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emergencyTitle}>Dental emergency?</Text>
                <Text style={styles.emergencySub}>Knocked-out tooth, bleeding, swelling. Steps that work offline.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.danger} />
            </Pressable>
          </Animated.View>

          {/* ── Tools ──────────────────────────────── */}
          {TOOL_GROUPS.map((group, gi) => (
            <Animated.View key={group.heading} entering={enter(3 + gi)} style={styles.group}>
              <Text style={styles.sectionTitle}>{group.heading}</Text>
              <View style={styles.grid}>
                {group.tools.map((tool) => (
                  <Card
                    key={tool.title}
                    onPress={() => router.push(tool.path as any)}
                    style={styles.tile}
                    accessibilityLabel={`${tool.title}. ${tool.sub}`}
                  >
                    <View style={[styles.tileIcon, { backgroundColor: `${tool.tint}1F` }]}>
                      <Ionicons name={tool.icon} size={22} color={tool.tint} />
                    </View>
                    <Text style={styles.tileTitle} numberOfLines={1}>
                      {tool.title}
                    </Text>
                    <Text style={styles.tileSub} numberOfLines={2}>
                      {tool.sub}
                    </Text>
                  </Card>
                ))}
              </View>
            </Animated.View>
          ))}

          <Text style={styles.footnote}>Cleared gives guidance, not a diagnosis. In an emergency, call your local emergency number.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    header: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg + 6,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      zIndex: 2,
    },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    profile: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexShrink: 1 },
    avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.35)" },
    avatarText: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
    greeting: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.7)" },
    name: { fontSize: 21, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.4, maxWidth: 220 },
    glassBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.1)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
    },

    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.lg },

    askCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md + 2,
    },
    askHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, marginBottom: spacing.md },
    assistantAvatar: { width: 42, height: 42, borderRadius: 21 },
    askTitle: { ...type.heading, color: colors.text },
    askSub: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
    inputBox: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
    input: { fontSize: 16, lineHeight: 23, color: colors.text, minHeight: 72, padding: 0 },
    askFooter: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },

    label: { ...type.overline, color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm + 2 },
    chipsContainer: { gap: spacing.sm + 2, paddingRight: spacing.md, paddingBottom: 4 },
    chip: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 7, paddingLeft: 7, paddingRight: spacing.md, borderRadius: radius.full },
    chipIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    chipText: { fontSize: 14, fontWeight: "600", color: colors.text },

    emergency: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.dangerMuted,
      borderWidth: 1,
      borderColor: `${colors.danger}33`,
    },
    emergencyIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
    emergencyTitle: { fontSize: 15, fontWeight: "700", color: colors.danger },
    emergencySub: { fontSize: 12.5, lineHeight: 17, color: colors.danger, opacity: 0.85, marginTop: 1 },

    group: { marginTop: spacing.lg + 4 },
    sectionTitle: { ...type.title, fontSize: 19, color: colors.text, marginBottom: spacing.md },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    tile: { width: "47.6%", minHeight: 128, gap: 2 },
    tileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
    tileTitle: { fontSize: 15, fontWeight: "700", color: colors.text, letterSpacing: -0.1 },
    tileSub: { fontSize: 12.5, lineHeight: 17, color: colors.textMuted },

    footnote: { fontSize: 12, lineHeight: 17, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  });