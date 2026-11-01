// app/kids-timer.tsx
import { useState, useEffect } from "react";
import { StyleSheet, Text, View, Pressable, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function KidsTimerScreen() {
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Awesome Job! 🌟", "You brushed for 2 whole minutes. You earned a star!");
      setTimeLeft(120);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = (120 - timeLeft) / 120;

  return (
    <Screen style={{ justifyContent: "center", alignItems: "center" }}>
      <Text style={styles.title}>Kids Brushing</Text>
      <Text style={styles.subtitle}>Brush for 2 minutes to earn a star!</Text>

      <View style={styles.timerCircle}>
        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        <Ionicons name="star" size={40} color={progress > 0.5 ? "#FBBF24" : "#E5E7EB"} style={{ marginTop: spacing.md }} />
      </View>

      <View style={styles.controls}>
        <Button 
          title={isRunning ? "Pause" : "Start Brushing"} 
          onPress={() => setIsRunning(!isRunning)} 
          style={{ width: 200 }}
        />
        <Pressable onPress={() => { setTimeLeft(120); setIsRunning(false); }} style={{ marginTop: spacing.lg }}>
          <Text style={{ color: colors.textMuted, fontWeight: "600" }}>Reset Timer</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 32, fontWeight: "900", color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: 16, color: colors.textMuted, marginBottom: spacing.xl },
  timerCircle: { width: 250, height: 250, borderRadius: 125, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center", borderWidth: 8, borderColor: "#BAE6FD", marginBottom: spacing.xl },
  timerText: { fontSize: 64, fontWeight: "800", color: colors.accent, fontVariant: ["tabular-nums"] },
  controls: { alignItems: "center" },
});