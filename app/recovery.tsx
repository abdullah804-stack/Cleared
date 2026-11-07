// app/recovery.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Animated, { Easing, FadeInDown, ZoomIn, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { tap } from "../utils/haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Gradient } from "../components/Gradient";
import { useThemeColors, ThemeColors, gradients, radius, spacing, type } from "../constants/theme";
import { toggleRecoveryDay, getRecoveryProgress, clearRecovery } from "../shared/recovery";

const RECOVERY_PLAN = [
  { day: 1, title: "Rest and ice", desc: "Apply ice for 15 minutes at a time. No hot foods or drinks. Rest as much as you can.", icon: "snow" },
  { day: 2, title: "Gentle rinse", desc: "Rinse gently with warm salt water 3 times a day. Soft foods only.", icon: "water" },
  { day: 3, title: "Resume brushing", desc: "Brush gently, but avoid the treated area. Keep up the salt water rinses.", icon: "sparkles" },
  { day: 4, title: "Mild activity", desc: "Most swelling should be gone. You can return to your normal diet if it's comfortable.", icon: "walk" },
  { day: 5, title: "Final check", desc: "Make sure the pain is easing. If you have severe pain, contact the clinic straight away.", icon: "shield-checkmark" },
] as const;

export default function RecoveryScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [progress, setProgress] = useState<Record<number, boolean>>({});

  useFocusEffect(
    useCallback(() => {
      getRecoveryProgress().then(setProgress);
    }, [])
  );

  const doneCount = RECOVERY_PLAN.filter((s) => progress[s.day]).length;
  const total = RECOVERY_PLAN.length;
  const allDone = doneCount === total;
  const nextDay = RECOVERY_PLAN.find((s) => !progress[s.day])?.day;

  const bar = useSharedValue(0);
  useEffect(() => {
    bar.value = withTiming(doneCount / total, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [doneCount]);
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));

  const handleToggle = async (day: number) => {
    tap();
    const newState = !progress[day];
    setProgress((p) => ({ ...p, [day]: newState }));
    await toggleRecoveryDay(day, newState);
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        {/* Progress header */}
        <Animated.View entering={FadeInDown.duration(450)}>
          <Gradient colors={allDone ? gradients.brand : gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.heroOverline}>{allDone ? "All done" : "Your recovery"}</Text>
            <Text style={styles.heroTitle}>{allDone ? "Recovery complete" : `Day ${nextDay} of ${total}`}</Text>
            <Text style={styles.heroSub}>
              {allDone ? "Well done. If anything still bothers you, tell your dentist." : "Tick each day off as you go. It takes a few seconds."}
            </Text>
            <View style={styles.track}>
              <Animated.View style={[styles.fill, barStyle]} />
            </View>
            <Text style={styles.heroCount}>
              {doneCount} of {total} days done
            </Text>
          </Gradient>
        </Animated.View>

        {/* Timeline */}
        <View style={{ marginTop: spacing.lg }}>
          {RECOVERY_PLAN.map((step, index) => {
            const done = !!progress[step.day];
            const isNext = step.day === nextDay;
            const isLast = index === total - 1;

            return (
              <Animated.View key={step.day} entering={FadeInDown.delay(80 + index * 70).duration(400)} style={styles.item}>
                <View style={styles.rail}>
                  <Pressable
                    onPress={() => handleToggle(step.day)}
                    style={[styles.dot, done && styles.dotDone, isNext && !done && styles.dotNext]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: done }}
                    accessibilityLabel={`Day ${step.day}: ${step.title}`}
                    hitSlop={8}
                  >
                    {done ? (
                      <Animated.View entering={ZoomIn.springify()}>
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      </Animated.View>
                    ) : (
                      <Text style={[styles.dayNumber, isNext && { color: colors.accentStrong }]}>{step.day}</Text>
                    )}
                  </Pressable>
                  {!isLast && <View style={[styles.line, done && { backgroundColor: colors.success }]} />}
                </View>

                <View style={{ flex: 1, paddingBottom: isLast ? 0 : spacing.md }}>
                  <Card
                    onPress={() => handleToggle(step.day)}
                    accessibilityLabel={`Day ${step.day}: ${step.title}`}
                    style={[done && { backgroundColor: colors.successMuted, borderColor: colors.success }, isNext && !done && { borderColor: colors.accent, borderWidth: 1.5 }]}
                  >
                    <View style={styles.cardHead}>
                      <View style={[styles.stepIcon, { backgroundColor: done ? colors.success : colors.accentMuted }]}>
                        <Ionicons name={step.icon as any} size={16} color={done ? "#FFFFFF" : colors.accentStrong} />
                      </View>
                      <Text style={styles.cardTitle}>{step.title}</Text>
                      {isNext && !done && (
                        <View style={styles.nextPill}>
                          <Text style={styles.nextPillText}>Up next</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.cardDesc, done && { opacity: 0.65 }]}>{step.desc}</Text>
                  </Card>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {allDone && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <Button title="Log how you feel" icon="analytics" variant="soft" onPress={() => router.push("/journal")} style={{ marginTop: spacing.lg }} />
            <Button
              title="Start a new recovery"
              variant="ghost"
              onPress={async () => {
                await clearRecovery();
                setProgress({});
              }}
              style={{ marginTop: spacing.sm }}
            />
          </Animated.View>
        )}

        {/* Safety net */}
        <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.help}>
          <Ionicons name="alert-circle" size={22} color={colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={styles.helpTitle}>Something doesn't feel right?</Text>
            <Text style={styles.helpText}>Severe pain, heavy bleeding, fever, or swelling that spreads: don't wait.</Text>
          </View>
          <Pressable onPress={() => router.push("/emergency")} style={styles.helpBtn} accessibilityRole="button" accessibilityLabel="Get urgent help">
            <Text style={styles.helpBtnText}>Get help</Text>
          </Pressable>
        </Animated.View>

        <Text style={styles.disclaimer}>General guidance for after common procedures. Your dentist's instructions always come first.</Text>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

    hero: { borderRadius: radius.xl, padding: spacing.lg },
    heroOverline: { ...type.overline, color: "rgba(255,255,255,0.7)" },
    heroTitle: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.6, marginTop: 4 },
    heroSub: { fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.8)", marginTop: 4 },
    track: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.2)", marginTop: spacing.lg, overflow: "hidden" },
    fill: { height: 8, borderRadius: 4, backgroundColor: "#5EEAD4" },
    heroCount: { fontSize: 12.5, fontWeight: "700", color: "rgba(255,255,255,0.85)", marginTop: spacing.sm },

    item: { flexDirection: "row", gap: spacing.md },
    rail: { alignItems: "center", width: 36 },
    dot: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
    dotDone: { backgroundColor: colors.success, borderColor: colors.success },
    dotNext: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    dayNumber: { fontSize: 15, fontWeight: "800", color: colors.textMuted },
    line: { flex: 1, width: 2, marginVertical: 4, borderRadius: 1, backgroundColor: colors.border },

    cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 6 },
    stepIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text },
    nextPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.accentMuted },
    nextPillText: { fontSize: 11, fontWeight: "800", color: colors.accentStrong },
    cardDesc: { fontSize: 14, lineHeight: 21, color: colors.textMuted },

    help: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.dangerMuted },
    helpTitle: { fontSize: 14.5, fontWeight: "800", color: colors.danger },
    helpText: { fontSize: 12.5, lineHeight: 17, color: colors.text, opacity: 0.8, marginTop: 1 },
    helpBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, backgroundColor: colors.danger },
    helpBtnText: { fontSize: 13, fontWeight: "800", color: colors.onDanger },

    disclaimer: { ...type.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  });