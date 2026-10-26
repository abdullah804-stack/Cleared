// app/index.tsx
import { useState, useEffect, useMemo } from "react";
import { StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { TriageWidget } from "../components/TriageWidget";
import { useThemeColors, radius, spacing } from "../constants/theme";
import { useAuth, supabase } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";

export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const [input, setInput] = useState("");
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      const { data } = await supabase.from("appointments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(2);
      if (data) setRecentVisits(data);
    }
    fetchHistory();
  }, [user]);

  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("result", (event) => setInput(event.results[0]?.transcript || ""));
  useSpeechRecognitionEvent("error", () => setIsListening(false));

  const toggleListening = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isListening) ExpoSpeechRecognitionModule.stop();
    else {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) return;
      ExpoSpeechRecognitionModule.start({ lang: lang === "ur" ? "ur-PK" : "en-US", interimResults: true });
    }
  };

  const handlePlan = (customPrompt?: string) => {
    const textToSubmit = customPrompt || input;
    if (!textToSubmit.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/plan", params: { request: textToSubmit.trim() } });
  };

  const greetingName = user?.email?.split("@")[0] || "there";

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll}>
          
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{t.hello}, {greetingName} 👋</Text>
              <Text style={styles.title}>{t.whatDoYouNeed}</Text>
            </View>
            <Pressable onPress={() => router.push("/settings")} style={styles.settingsBtn}>
              <Ionicons name="settings-outline" size={24} color={colors.text} />
            </Pressable>
          </View>

          <TriageWidget onComplete={(prompt) => handlePlan(prompt)} />

          <Text style={styles.orDivider}>{t.orDescribe}</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t.inputPlaceholder}
              placeholderTextColor={colors.textMuted}
              multiline
              value={input}
              onChangeText={setInput}
              textAlignVertical="top"
            />
            <Pressable style={[styles.micButton, isListening && styles.micButtonActive]} onPress={toggleListening}>
              <Ionicons name={isListening ? "stop" : "mic"} size={22} color={isListening ? "#FFF" : colors.accent} />
            </Pressable>
          </View>

          <Button title={t.generatePlan} onPress={() => handlePlan()} disabled={!input.trim()} />

          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtn} onPress={() => router.push("/journal")}>
              <Ionicons name="analytics" size={20} color={colors.accent} />
              <Text style={styles.actionBtnText}>{t.painJournal}</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => router.push("/estimator")}>
              <Ionicons name="calculator" size={20} color={colors.accent} />
              <Text style={styles.actionBtnText}>{t.costEstimator}</Text>
            </Pressable>
          </View>

          {recentVisits.length > 0 && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.sectionTitle}>{t.recentVisits}</Text>
              <View style={styles.historyContainer}>
                {recentVisits.map((visit, index) => {
                  const dateStr = new Date(visit.appointment_time).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  return (
                    <Pressable key={index} style={({ pressed }) => [styles.historyCard, pressed && { opacity: 0.7 }]} onPress={() => setInput(`book another appointment at ${visit.clinic_name}`)}>
                      <View style={styles.historyIcon}><Ionicons name="time-outline" size={20} color={colors.textMuted} /></View>
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

const createStyles = (colors: any) => StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: spacing.xl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: spacing.lg, marginBottom: spacing.lg },
  greeting: { fontSize: 16, color: colors.textMuted, marginBottom: spacing.xs },
  title: { fontSize: 28, fontWeight: "700", color: colors.text, letterSpacing: -0.5, flexShrink: 1 },
  settingsBtn: { padding: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  orDivider: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textAlign: "center", marginVertical: spacing.lg, letterSpacing: 1 },
  inputContainer: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 100, marginBottom: spacing.md },
  input: { flex: 1, fontSize: 16, color: colors.text, lineHeight: 24, paddingRight: 40 },
  micButton: { position: "absolute", bottom: spacing.md, right: spacing.md, width: 44, height: 44, borderRadius: 22, backgroundColor: "#E0E7FF", alignItems: "center", justifyContent: "center" },
  micButtonActive: { backgroundColor: colors.danger },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.sm },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#E0E7FF", padding: spacing.md, borderRadius: radius.md, gap: spacing.xs },
  actionBtnText: { fontSize: 14, fontWeight: "600", color: colors.accent },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
  historyContainer: { gap: spacing.sm },
  historyCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  historyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  historyTextContainer: { flex: 1 },
  historyClinic: { fontSize: 15, fontWeight: "600", color: colors.text },
  historyDate: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});