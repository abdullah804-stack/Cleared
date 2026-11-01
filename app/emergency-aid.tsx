// app/emergency-aid.tsx
import { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

const EMERGENCIES = [
  { id: "knocked", title: "Knocked-Out Tooth", icon: "alert-circle", color: "#EF4444" },
  { id: "broken", title: "Broken / Chipped Tooth", icon: "construct", color: "#F59E0B" },
  { id: "bleeding", title: "Severe Bleeding", icon: "water", color: "#DC2626" },
  { id: "swelling", title: "Facial Swelling", icon: "body", color: "#8B5CF6" },
];

export default function EmergencyAidScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("knocked");
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setTimerRunning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Time is up!", "You must get to a dentist immediately. The tooth may not survive.");
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const renderContent = () => {
    switch (activeTab) {
      case "knocked":
        return (
          <View>
            <Text style={styles.contentTitle}>Knocked-Out Tooth</Text>
            <Text style={styles.step}>1. Pick up the tooth by the crown (the white part). Do NOT touch the root.</Text>
            <Text style={styles.step}>2. If dirty, rinse gently with milk or saline. Do not use water.</Text>
            <Text style={styles.step}>3. Try to place it back in the socket. Bite down gently on a clean cloth.</Text>
            <Text style={styles.step}>4. If you can't put it back, keep it in a cup of milk or your saliva.</Text>
            <Text style={styles.step}>5. Get to a dentist IMMEDIATELY. You have 30 minutes.</Text>
            
            <View style={styles.timerCard}>
              <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              <Button 
                title={timerRunning ? "Pause Timer" : "Start 30-Min Timer"} 
                variant={timerRunning ? "ghost" : "danger"} 
                onPress={() => setTimerRunning(!timerRunning)} 
              />
            </View>
          </View>
        );
      case "broken":
        return (
          <View>
            <Text style={styles.contentTitle}>Broken / Chipped Tooth</Text>
            <Text style={styles.step}>1. Save any broken pieces and rinse your mouth with warm water.</Text>
            <Text style={styles.step}>2. Apply gauze to any bleeding areas for 10 minutes.</Text>
            <Text style={styles.step}>3. Apply a cold compress to the outside of your cheek to reduce swelling.</Text>
            <Text style={styles.step}>4. See a dentist within 24 hours.</Text>
          </View>
        );
      case "bleeding":
        return (
          <View>
            <Text style={styles.contentTitle}>Severe Bleeding</Text>
            <Text style={styles.step}>1. Rinse your mouth gently with cold water.</Text>
            <Text style={styles.step}>2. Bite firmly on a piece of gauze or a clean tea bag for 15-20 minutes.</Text>
            <Text style={styles.step}>3. Do not spit or rinse during this time. Do not lie down.</Text>
            <Text style={styles.step}>4. If bleeding doesn't stop after 20 minutes, go to an Emergency Room.</Text>
          </View>
        );
      case "swelling":
        return (
          <View>
            <Text style={styles.contentTitle}>Facial Swelling</Text>
            <Text style={styles.step}>1. Apply a cold compress to the swollen area for 15 minutes.</Text>
            <Text style={styles.step}>2. Keep your head elevated (sleep with extra pillows).</Text>
            <Text style={styles.step}>3. Take over-the-counter painkillers if safe for you.</Text>
            <Text style={styles.step}>4. If you have trouble breathing or swallowing, call emergency services immediately.</Text>
          </View>
        );
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Emergency First-Aid</Text>
          <Text style={styles.subtitle}>Step-by-step guides for urgent dental issues.</Text>
        </View>

        {/* TABS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={{ gap: spacing.sm }}>
          {EMERGENCIES.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.tab, activeTab === item.id && styles.tabActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(item.id);
              }}
            >
              <Ionicons name={item.icon as any} size={18} color={activeTab === item.id ? "#FFF" : item.color} />
              <Text style={[styles.tabText, activeTab === item.id && styles.tabTextActive]}>{item.title}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* CONTENT */}
        <View style={styles.contentCard}>
          {renderContent()}
        </View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: spacing.xl },
  header: { marginTop: spacing.md, marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  
  tabsContainer: { marginBottom: spacing.xl, flexGrow: 0 },
  tab: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.text, borderColor: colors.text },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.text },
  tabTextActive: { color: "#FFF" },

  contentCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  contentTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: spacing.md },
  step: { fontSize: 15, color: colors.text, lineHeight: 24, marginBottom: spacing.md, fontWeight: "500" },

  timerCard: { marginTop: spacing.xl, paddingTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border, alignItems: "center" },
  timerText: { fontSize: 48, fontWeight: "800", color: colors.danger, fontVariant: ["tabular-nums"], marginBottom: spacing.md },
});