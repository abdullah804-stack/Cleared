// app/index.tsx
import { useState, useEffect } from "react";
import { StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { TriageWidget } from "../components/TriageWidget";
import { colors, radius, spacing } from "../constants/theme";
import { useAuth, supabase } from "../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  const [input, setInput] = useState("");
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(2);
      if (data) setRecentVisits(data);
    }
    fetchHistory();
  }, [user]);

  const handlePlan = (customPrompt?: string) => {
    const textToSubmit = customPrompt || input;
    if (!textToSubmit.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/plan", params: { request: textToSubmit.trim() } });
  };

  const greetingName = user?.email?.split("@")[0] || "there";

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll}>
          
          <View style={styles.header}>
            <Text style={styles.greeting}>Hello, {greetingName} 👋</Text>
            <Text style={styles.title}>What do you need today?</Text>
          </View>

          {/* NEW FEATURE: VISUAL TRIAGE WIDGET */}
          <TriageWidget onComplete={(prompt) => handlePlan(prompt)} />

          <Text style={styles.orDivider}>OR DESCRIBE IT YOURSELF</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="e.g. my tooth hurts, find a dentist open Saturday under $100"
              placeholderTextColor={colors.textMuted}
              multiline
              value={input}
              onChangeText={setInput}
              textAlignVertical="top"
            />
          </View>

          <Button title="Generate Custom Plan" onPress={() => handlePlan()} disabled={!input.trim()} />

          {recentVisits.length > 0 && (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={styles.sectionTitle}>Recent Visits</Text>
              <View style={styles.historyContainer}>
                {recentVisits.map((visit, index) => {
                  const dateStr = new Date(visit.appointment_time).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  return (
                    <Pressable 
                      key={index} 
                      style={({ pressed }) => [styles.historyCard, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]} 
                      onPress={() => setInput(`book another appointment at ${visit.clinic_name}`)}
                    >
                      <View style={styles.historyIcon}>
                        <Ionicons name="time-outline" size={20} color={colors.textMuted} />
                      </View>
                      <View style={styles.historyTextContainer}>
                        <Text style={styles.historyClinic}>{visit.clinic_name}</Text>
                        <Text style={styles.historyDate}>{dateStr}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.border} />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: spacing.xl },
  header: { marginTop: spacing.lg, marginBottom: spacing.lg },
  greeting: { fontSize: 16, color: colors.textMuted, marginBottom: spacing.xs },
  title: { fontSize: 28, fontWeight: "700", color: colors.text, letterSpacing: -0.5 },
  orDivider: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textAlign: "center", marginVertical: spacing.lg, letterSpacing: 1 },
  inputContainer: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, minHeight: 100, marginBottom: spacing.md,
  },
  input: { flex: 1, fontSize: 16, color: colors.text, lineHeight: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
  historyContainer: { gap: spacing.sm },
  historyCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  historyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  historyTextContainer: { flex: 1 },
  historyClinic: { fontSize: 15, fontWeight: "600", color: colors.text },
  historyDate: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});