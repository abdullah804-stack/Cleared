// app/routine.tsx
import { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { colors, radius, spacing } from "../constants/theme";
import { logRoutine, getTodayStatus, getStreakCount } from "../shared/routine";
import { Ionicons } from "@expo/vector-icons";

export default function RoutineScreen() {
  const [morningDone, setMorningDone] = useState(false);
  const [nightDone, setNightDone] = useState(false);
  const [streak, setStreak] = useState(0);
  
  // Animation for the streak flame
  const scale = useSharedValue(1);
  const animatedFlame = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const loadData = async () => {
    const status = await getTodayStatus();
    setMorningDone(status.morning);
    setNightDone(status.night);
    
    const currentStreak = await getStreakCount();
    setStreak(currentStreak);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheck = async (type: "morning" | "night") => {
    if (type === "morning" && morningDone) return;
    if (type === "night" && nightDone) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Animate the flame
    scale.value = withSpring(1.3, { damping: 5 }, () => {
      scale.value = withSpring(1);
    });

    await logRoutine(type);
    await loadData();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* STREAK HEADER */}
        <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.header}>
          <Animated.View style={[styles.flameContainer, animatedFlame]}>
            <Ionicons name="flame" size={48} color="#F59E0B" />
          </Animated.View>
          <Text style={styles.streakCount}>{streak}</Text>
          <Text style={styles.streakLabel}>Day Streak</Text>
          <Text style={styles.subtitle}>Keep it up! Consistency is key to dental health.</Text>
        </Animated.View>

        {/* TASKS */}
        <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={styles.taskList}>
          
          <Text style={styles.sectionTitle}>Today's Routine</Text>

          <Pressable 
            style={[styles.taskCard, morningDone && styles.taskCardDone]} 
            onPress={() => handleCheck("morning")}
          >
            <View style={styles.iconBox}>
              <Ionicons name="sunny" size={28} color={morningDone ? "#FFF" : "#F59E0B"} />
            </View>
            <View style={styles.taskTextContainer}>
              <Text style={[styles.taskTitle, morningDone && styles.textDone]}>Morning Brush</Text>
              <Text style={[styles.taskDesc, morningDone && styles.textDone]}>2 minutes with fluoride toothpaste</Text>
            </View>
            <Ionicons name={morningDone ? "checkmark-circle" : "ellipse-outline"} size={32} color={morningDone ? "#FFF" : colors.border} />
          </Pressable>

          <Pressable 
            style={[styles.taskCard, nightDone && styles.taskCardDone]} 
            onPress={() => handleCheck("night")}
          >
            <View style={styles.iconBox}>
              <Ionicons name="moon" size={28} color={nightDone ? "#FFF" : "#6366F1"} />
            </View>
            <View style={styles.taskTextContainer}>
              <Text style={[styles.taskTitle, nightDone && styles.textDone]}>Night Floss & Brush</Text>
              <Text style={[styles.taskDesc, nightDone && styles.textDone]}>Clean between teeth before bed</Text>
            </View>
            <Ionicons name={nightDone ? "checkmark-circle" : "ellipse-outline"} size={32} color={nightDone ? "#FFF" : colors.border} />
          </Pressable>

        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: spacing.xl },
  header: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
  flameContainer: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  streakCount: { fontSize: 48, fontWeight: "800", color: colors.text, lineHeight: 56 },
  streakLabel: { fontSize: 18, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.sm },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: "center", paddingHorizontal: spacing.xl },
  
  taskList: { gap: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  
  taskCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
  taskCardDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginRight: spacing.md, backgroundColor: "rgba(255,255,255,0.2)" },
  taskTextContainer: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
  taskDesc: { fontSize: 13, color: colors.textMuted },
  textDone: { color: "#FFF" },
});