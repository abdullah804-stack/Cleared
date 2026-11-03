// app/triage.tsx
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useThemeColors, ThemeColors, radius, spacing, shadows, type } from "../constants/theme";

const DURATIONS = ["Today", "2-3 days", "A week or more"];

const PAIN_LABELS: Record<number, string> = {
  1: "Barely there",
  2: "Mild",
  3: "Mild",
  4: "Noticeable",
  5: "Moderate",
  6: "Strong",
  7: "Strong",
  8: "Severe",
  9: "Very severe",
  10: "Worst possible",
};

// Teal → amber → red, so the scale reads at a glance.
const painColor = (level: number) => (level <= 3 ? "#14B8A6" : level <= 6 ? "#F59E0B" : "#F43F5E");

export default function TriageScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { request } = useLocalSearchParams<{ request: string }>();

  const [duration, setDuration] = useState<string>("");
  const [pain, setPain] = useState(5);
  const [swelling, setSwelling] = useState(false);
  const [fever, setFever] = useState(false);
  const [troubleEating, setTroubleEating] = useState(false);

  const urgentSymptoms = swelling || fever;

  const handleContinue = () => {
    // Offline safety check: facial swelling or fever can mean a spreading infection, so we skip the
    // planner and go straight to urgent-care help.
    if (urgentSymptoms) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      router.replace("/emergency");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // Pass the answers as separate values. (They used to be glued into one long sentence, which made the
    // planner's emergency check match the words "Swelling: No" and fire for every request.)
    router.replace({
      pathname: "/plan",
      params: { request: request || "Dental issue", duration, pain: String(pain), canEat: troubleEating ? "0" : "1" },
    });
  };

  const setLevel = (n: number) => {
    Haptics.selectionAsync().catch(() => {});
    setPain(n);
  };

  const accent = painColor(pain);

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.overline}>Quick check · step 1 of 2</Text>
          <Text style={styles.title}>A few quick questions</Text>
          <Text style={styles.subtitle}>It takes about 20 seconds and helps us plan the right care.</Text>
          <View style={styles.progress}>
            <View style={[styles.progressSeg, { backgroundColor: colors.accent }]} />
            <View style={[styles.progressSeg, { backgroundColor: colors.border }]} />
          </View>
        </Animated.View>

        {/* What they asked for */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.requestCard}>
          <Ionicons name="chatbubble-ellipses" size={18} color={colors.accentStrong} />
          <Text style={styles.requestText} numberOfLines={2}>
            {request || "Dental issue"}
          </Text>
        </Animated.View>

        {/* Duration */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.section}>
          <Text style={styles.label}>How long has it been bothering you?</Text>
          <View style={styles.segmented}>
            {DURATIONS.map((opt) => {
              const active = duration === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setDuration(opt);
                  }}
                  style={[styles.segment, active && styles.segmentActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Pain */}
        <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.section}>
          <Text style={styles.label}>How strong is the pain?</Text>
          <Card style={{ marginTop: spacing.sm }}>
            <View style={styles.painHeader}>
              <Text style={[styles.painNumber, { color: accent }]}>{pain}</Text>
              <Text style={styles.painOutOf}>/ 10</Text>
              <View style={[styles.painBadge, { backgroundColor: `${accent}1F` }]}>
                <Text style={[styles.painBadgeText, { color: accent }]}>{PAIN_LABELS[pain]}</Text>
              </View>
            </View>
            <View style={styles.painTrack}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setLevel(n)}
                  hitSlop={{ top: 12, bottom: 12 }}
                  style={[styles.painSeg, { backgroundColor: n <= pain ? painColor(n) : colors.surfaceAlt }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Pain level ${n}`}
                />
              ))}
            </View>
            <View style={styles.painEnds}>
              <Text style={styles.painEndText}>No pain</Text>
              <Text style={styles.painEndText}>Worst</Text>
            </View>
          </Card>
        </Animated.View>

        {/* Symptoms */}
        <Animated.View entering={FadeInDown.delay(240).duration(400)} style={styles.section}>
          <Text style={styles.label}>Do you have any of these?</Text>
          <View style={{ gap: spacing.sm + 2, marginTop: spacing.sm }}>
            <SymptomRow
              icon="alert-circle"
              title="Swelling in your face or jaw"
              sub="Can spread quickly, needs urgent care"
              value={swelling}
              onChange={setSwelling}
              danger
              colors={colors}
              styles={styles}
            />
            <SymptomRow
              icon="thermometer"
              title="Fever"
              sub="With tooth pain it can mean infection"
              value={fever}
              onChange={setFever}
              danger
              colors={colors}
              styles={styles}
            />
            <SymptomRow
              icon="restaurant"
              title="Trouble eating or chewing"
              sub="Helps us judge how soon to see someone"
              value={troubleEating}
              onChange={setTroubleEating}
              colors={colors}
              styles={styles}
            />
          </View>
        </Animated.View>

        {urgentSymptoms && (
          <Animated.View entering={FadeIn.duration(250)} style={styles.warning}>
            <Ionicons name="warning" size={20} color={colors.danger} />
            <Text style={styles.warningText}>
              Swelling or fever with a toothache should be seen quickly. Next we'll show you urgent-care steps instead of a regular plan.
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          title={urgentSymptoms ? "Show urgent care steps" : "Continue"}
          icon={urgentSymptoms ? "medkit" : "arrow-forward"}
          variant={urgentSymptoms ? "danger" : "primary"}
          onPress={handleContinue}
        />
      </View>
    </Screen>
  );
}

function SymptomRow({
  icon,
  title,
  sub,
  value,
  onChange,
  danger,
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const tone = danger && value ? colors.danger : colors.accent;
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onChange(!value);
      }}
      style={[styles.symptom, value && { borderColor: tone, backgroundColor: danger ? colors.dangerMuted : colors.accentMuted }]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View style={[styles.symptomIcon, { backgroundColor: `${tone}1F` }]}>
        <Ionicons name={icon} size={20} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.symptomTitle}>{title}</Text>
        <Text style={styles.symptomSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: tone, false: colors.border }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.border}
      />
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

    overline: { ...type.overline, color: colors.accentStrong, marginBottom: spacing.xs },
    title: { ...type.display, fontSize: 28, lineHeight: 34, color: colors.text },
    subtitle: { fontSize: 15, lineHeight: 22, color: colors.textMuted, marginTop: spacing.xs },
    progress: { flexDirection: "row", gap: 6, marginTop: spacing.md },
    progressSeg: { flex: 1, height: 4, borderRadius: 2 },

    requestCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      backgroundColor: colors.accentMuted,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    requestText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "600", color: colors.accentStrong },

    section: { marginTop: spacing.lg + 4 },
    label: { ...type.heading, color: colors.text },

    segmented: {
      flexDirection: "row",
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.full,
      padding: 4,
      marginTop: spacing.sm,
    },
    segment: { flex: 1, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.full },
    segmentActive: { backgroundColor: colors.surface, ...shadows.sm },
    segmentText: { fontSize: 13.5, fontWeight: "600", color: colors.textMuted },
    segmentTextActive: { color: colors.accentStrong, fontWeight: "700" },

    painHeader: { flexDirection: "row", alignItems: "baseline", marginBottom: spacing.md },
    painNumber: { fontSize: 44, fontWeight: "800", letterSpacing: -1, lineHeight: 50 },
    painOutOf: { fontSize: 16, fontWeight: "600", color: colors.textMuted, marginLeft: 4 },
    painBadge: { marginLeft: "auto", paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, alignSelf: "center" },
    painBadgeText: { fontSize: 13, fontWeight: "700" },
    painTrack: { flexDirection: "row", gap: 5, height: 40 },
    painSeg: { flex: 1, borderRadius: 8 },
    painEnds: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
    painEndText: { ...type.caption, color: colors.textMuted },

    symptom: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    symptomIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    symptomTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    symptomSub: { fontSize: 12.5, lineHeight: 17, color: colors.textMuted, marginTop: 1 },

    warning: {
      flexDirection: "row",
      gap: spacing.sm + 2,
      alignItems: "flex-start",
      backgroundColor: colors.dangerMuted,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    warningText: { flex: 1, fontSize: 13.5, lineHeight: 20, color: colors.danger, fontWeight: "600" },

    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });