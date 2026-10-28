// app/appointment.tsx
import { useState, useEffect, useMemo } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from "react-native-reanimated";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useThemeColors, ThemeColors, radius, spacing, shadows, glow, type } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function AppointmentScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const router = useRouter();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const scale = useSharedValue(0);
  const animatedIconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const [appointmentTime, setAppointmentTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  });

  const [showPicker, setShowPicker] = useState(false);
  const [timeLeft, setTimeLeft] = useState(appointmentTime.getTime() - Date.now());

  const [carePlan, setCarePlan] = useState<string[]>([]);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 100 }),
      withSpring(1, { damping: 10, stiffness: 100 })
    );

    const loadCarePlan = async () => {
      const savedPlan = await AsyncStorage.getItem("current_care_plan");
      const savedChecks = await AsyncStorage.getItem("care_plan_checks");

      if (savedPlan) setCarePlan(JSON.parse(savedPlan));
      else setCarePlan(["Avoid very cold or hot foods until evaluated.", "Use desensitizing toothpaste and avoid hard chewing."]);

      if (savedChecks) setCheckedItems(JSON.parse(savedChecks));
    };
    loadCarePlan();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = appointmentTime.getTime() - Date.now();
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [appointmentTime]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const toggleCheck = async (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newChecked = { ...checkedItems, [index]: !checkedItems[index] };
    setCheckedItems(newChecked);
    await AsyncStorage.setItem("care_plan_checks", JSON.stringify(newChecked));
  };

  const onTimeChange = async (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === "ios");
    if (selectedDate) {
      setAppointmentTime(selectedDate);
      const Notifications = await import("expo-notifications");

      const testTrigger = new Date(selectedDate);
      testTrigger.setMinutes(testTrigger.getMinutes() + 1);
      await Notifications.scheduleNotificationAsync({
        content: { title: "Test Alert!", body: "This proves the notification system works." },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: testTrigger },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleReadAloud = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      const text = carePlan.join(". ");
      Speech.speak(text, { onDone: () => setIsSpeaking(false) });
      setIsSpeaking(true);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.successHeader}>
          <View style={styles.checkHalo}>
            <Animated.View style={[styles.checkCircle, animatedIconStyle]}>
              <Ionicons name="checkmark" size={36} color={colors.onAccent} />
            </Animated.View>
          </View>
          <Text style={styles.title}>Booked Successfully</Text>
          <View style={styles.clinicPill}>
            <Ionicons name="location" size={13} color={colors.accentStrong} />
            <Text style={styles.subtitle}>Bright Smile Dental</Text>
          </View>
        </View>

        <View style={styles.ticket}>
          <View style={styles.ticketAccent} />
          <View style={styles.ticketTop}>
            <Text style={styles.timerLabel}>Time until appointment</Text>
            <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
            <View style={styles.datePill}>
              <Ionicons name="calendar-outline" size={14} color={colors.accentStrong} />
              <Text style={styles.appointmentDate}>
                {appointmentTime.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })} at{" "}
                {appointmentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          </View>
        </View>

        <Button
          title="Test Notifications (Change Time)"
          variant="ghost"
          onPress={() => setShowPicker(true)}
          style={{ marginBottom: spacing.lg }}
        />

        {showPicker && (
          <DateTimePicker value={appointmentTime} mode="datetime" display="default" onChange={onTimeChange} />
        )}

        <View style={styles.carePlanCard}>
          <View style={styles.carePlanHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.overline}>Before your visit</Text>
              <Text style={styles.sectionTitle}>AI Pre-Visit Care Plan</Text>
            </View>
            <Pressable
              onPress={handleReadAloud}
              style={({ pressed }) => [styles.speakerBtn, pressed && { opacity: 0.7 }]}
              accessibilityLabel={isSpeaking ? "Stop reading" : "Read aloud"}
            >
              <Ionicons name={isSpeaking ? "stop" : "volume-high"} size={20} color={colors.accentStrong} />
            </Pressable>
          </View>

          {carePlan.map((item, index) => (
            <Pressable
              key={index}
              style={[styles.careItem, index === carePlan.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}
              onPress={() => toggleCheck(index)}
            >
              <Ionicons
                name={checkedItems[index] ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={checkedItems[index] ? colors.success : colors.border}
              />
              <Text style={[styles.careItemDesc, checkedItems[index] && styles.careItemDone]}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="View Audit Log" onPress={() => router.push("/audit")} />
        <Button title="Book another" variant="ghost" onPress={() => router.replace("/")} style={{ marginTop: spacing.sm }} />
      </View>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { flexGrow: 1, paddingBottom: 170 },

    successHeader: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
    checkHalo: {
      width: 104,
      height: 104,
      borderRadius: 52,
      backgroundColor: colors.successMuted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    checkCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.success,
      alignItems: "center",
      justifyContent: "center",
      ...glow(colors.success, 0.35),
    },
    title: { ...type.title, fontSize: 26, color: colors.text, marginBottom: spacing.sm },
    clinicPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.accentMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.full,
    },
    subtitle: { fontSize: 14, fontWeight: "600", color: colors.accentStrong },

    ticket: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
      overflow: "hidden",
      ...shadows.md,
    },
    ticketAccent: { height: 5, backgroundColor: colors.accent },
    ticketTop: { paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, alignItems: "center" },
    timerLabel: { ...type.overline, color: colors.textMuted, marginBottom: spacing.sm },
    timerValue: {
      fontSize: 48,
      fontWeight: "800",
      color: colors.text,
      fontVariant: ["tabular-nums"],
      letterSpacing: 1,
      marginBottom: spacing.md,
    },
    datePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.accentMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
    },
    appointmentDate: { fontSize: 13, fontWeight: "600", color: colors.accentStrong },

    carePlanCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    carePlanHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
    overline: { ...type.overline, color: colors.accentStrong, marginBottom: 2 },
    sectionTitle: { ...type.heading, color: colors.text },
    speakerBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: colors.accentMuted,
      alignItems: "center",
      justifyContent: "center",
    },

    careItem: {
      flexDirection: "row",
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      alignItems: "center",
    },
    careItemDesc: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
    careItemDone: { textDecorationLine: "line-through", color: colors.textMuted },

    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: spacing.md,
      paddingBottom: spacing.lg,
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      ...shadows.lg,
    },
  });