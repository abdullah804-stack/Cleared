// app/emergency-aid.tsx
// Offline first-aid steps for urgent dental problems, with a countdown for knocked-out teeth.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useThemeColors, ThemeColors, radius, spacing, type } from "../constants/theme";

type Guide = { id: string; title: string; icon: keyof typeof Ionicons.glyphMap; tone: "danger" | "warning" | "accent"; steps: string[]; warn?: string };

const GUIDES: Guide[] = [
  {
    id: "knocked",
    title: "Knocked-out tooth",
    icon: "alert-circle",
    tone: "danger",
    steps: [
      "Pick the tooth up by the crown (the white part). Never touch the root.",
      "If it's dirty, rinse it very briefly with milk or saline. Don't scrub it and don't use tap water for long.",
      "Try to put it back in the socket and bite gently on a clean cloth to hold it.",
      "If you can't, keep it in a cup of milk or inside your cheek. Never let it dry out.",
      "Get to a dentist straight away. The first 30 minutes matter most.",
    ],
    warn: "Only re-insert adult teeth. A knocked-out baby tooth should not be put back.",
  },
  {
    id: "broken",
    title: "Broken or chipped",
    icon: "construct",
    tone: "warning",
    steps: [
      "Save any pieces and rinse your mouth with warm water.",
      "Press clean gauze on any bleeding for 10 minutes.",
      "Hold a cold compress on your cheek to reduce swelling.",
      "See a dentist within 24 hours. Sharp edges can cut your tongue.",
    ],
  },
  {
    id: "bleeding",
    title: "Heavy bleeding",
    icon: "water",
    tone: "danger",
    steps: [
      "Rinse gently with cold water once.",
      "Bite firmly on gauze or a clean damp tea bag for 15 to 20 minutes.",
      "Don't spit or rinse during this time, and sit upright instead of lying down.",
      "If it hasn't stopped after 20 minutes, go to an emergency room.",
    ],
  },
  {
    id: "swelling",
    title: "Face swelling",
    icon: "body",
    tone: "accent",
    steps: [
      "Hold a cold compress on the swollen area for 15 minutes at a time.",
      "Keep your head raised, with extra pillows when you sleep.",
      "Take an over-the-counter painkiller if it is safe for you.",
      "See a dentist the same day. Swelling with fever needs urgent care.",
    ],
    warn: "Trouble breathing or swallowing: call 1122 now.",
  },
];

const TOTAL = 30 * 60;

export default function EmergencyAidScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState("knocked");
  const [left, setLeft] = useState(TOTAL);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);

  // Count down against the clock so it stays right if the phone sleeps or the app is backgrounded.
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const remain = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(remain);
      if (remain === 0) {
        setRunning(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        Alert.alert("30 minutes are up", "Get to a dentist now. The tooth is harder to save the longer it waits.");
      }
    };
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [running]);

  const toggleTimer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (running) {
      setRunning(false);
    } else {
      endAt.current = Date.now() + (left > 0 ? left : TOTAL) * 1000;
      if (left === 0) setLeft(TOTAL);
      setRunning(true);
    }
  }, [running, left]);

  const call = () => Linking.openURL("tel:1122").catch(() => Alert.alert("Can't place a call", "Dial 1122 from your phone."));

  const guide = GUIDES.find((g) => g.id === active)!;
  const toneColor = guide.tone === "danger" ? colors.danger : guide.tone === "warning" ? colors.warning : colors.accentStrong;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const urgentTime = left <= 5 * 60;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>First aid</Text>
          <Text style={styles.sub}>Works without internet. Pick what happened.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(400)} style={{ marginTop: spacing.md }}>
          <Pressable onPress={call} style={styles.callBar} accessibilityRole="button" accessibilityLabel="Call emergency services, 1122">
            <Ionicons name="call" size={20} color={colors.onDanger} />
            <Text style={styles.callText}>Call 1122 (Rescue)</Text>
          </Pressable>
        </Animated.View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}>
          {GUIDES.map((g) => {
            const on = g.id === active;
            return (
              <Pressable
                key={g.id}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setActive(g.id);
                }}
                style={[styles.tab, on && { backgroundColor: colors.text, borderColor: colors.text }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                <Ionicons name={g.icon} size={16} color={on ? colors.background : colors.textMuted} />
                <Text style={[styles.tabText, on && { color: colors.background }]}>{g.title}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Animated.View key={guide.id} entering={FadeIn.duration(260)}>
          <Card>
            <View style={styles.head}>
              <View style={[styles.headIcon, { backgroundColor: toneColor + "22" }]}>
                <Ionicons name={guide.icon} size={22} color={toneColor} />
              </View>
              <Text style={styles.guideTitle}>{guide.title}</Text>
            </View>

            {guide.steps.map((s, i) => (
              <View key={i} style={styles.step}>
                <View style={[styles.num, { backgroundColor: toneColor }]}>
                  <Text style={styles.numText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{s}</Text>
              </View>
            ))}

            {guide.warn && (
              <View style={styles.warn}>
                <Ionicons name="warning" size={17} color={colors.danger} />
                <Text style={styles.warnText}>{guide.warn}</Text>
              </View>
            )}

            {guide.id === "knocked" && (
              <View style={styles.timer}>
                <Text style={styles.timerLabel}>Time to reach a dentist</Text>
                <Text style={[styles.timerText, urgentTime && { color: colors.danger }]}>{mm}:{ss}</Text>
                <Button title={running ? "Pause" : left === TOTAL ? "Start 30-minute timer" : "Resume"} icon={running ? "pause" : "play"} variant={running ? "ghost" : "danger"} onPress={toggleTimer} />
                {left !== TOTAL && !running && (
                  <Button title="Reset" variant="ghost" onPress={() => setLeft(TOTAL)} style={{ marginTop: spacing.xs }} />
                )}
              </View>
            )}
          </Card>
        </Animated.View>

        <Text style={styles.disclaimer}>General first-aid guidance, not a diagnosis. In a serious emergency go to the nearest hospital.</Text>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    title: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.8 },
    sub: { ...type.body, color: colors.textMuted, marginTop: 4 },
    callBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 52, borderRadius: radius.lg, backgroundColor: colors.danger },
    callText: { fontSize: 16, fontWeight: "800", color: colors.onDanger },
    tabs: { marginVertical: spacing.lg, flexGrow: 0 },
    tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    tabText: { fontSize: 13.5, fontWeight: "700", color: colors.text },
    head: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
    headIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    guideTitle: { flex: 1, fontSize: 21, fontWeight: "800", color: colors.text, letterSpacing: -0.4 },
    step: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
    num: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 1 },
    numText: { fontSize: 12.5, fontWeight: "800", color: "#FFFFFF" },
    stepText: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.text },
    warn: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.dangerMuted, marginTop: spacing.xs },
    warnText: { flex: 1, fontSize: 13.5, lineHeight: 19, fontWeight: "600", color: colors.text },
    timer: { alignItems: "center", marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    timerLabel: { ...type.overline, color: colors.textMuted },
    timerText: { fontSize: 54, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"], marginVertical: spacing.sm },
    disclaimer: { ...type.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  });