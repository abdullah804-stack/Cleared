// app/index.tsx
import { useState, useMemo } from "react";
import { StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, ScrollView, Pressable, Image, Alert } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useThemeColors, radius, spacing } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = () => {};
try {
  const SpeechRecognition = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = SpeechRecognition.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = SpeechRecognition.useSpeechRecognitionEvent;
} catch (e) {}

export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const router = useRouter();
  const { user, profile } = useAuth();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "there";
  const initial = displayName.charAt(0).toUpperCase();

  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("result", (event: any) => setInput(event.results[0]?.transcript || ""));

  const toggleListening = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    router.push({ pathname: "/triage", params: { request: text } });
  };

  const PROBLEM_CHIPS = [
    { label: "Toothache", icon: "thermometer" },
    { label: "Swelling", icon: "body" },
    { label: "Broken Tooth", icon: "construct" },
    { label: "Cleaning", icon: "sparkles" },
    { label: "Kids", icon: "happy" },
  ];

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll}>
          
          <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.header}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
              <View>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.name}>{displayName}</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push("/settings")} style={styles.settingsBtn}>
              <Ionicons name="settings-outline" size={22} color={colors.text} />
            </Pressable>
          </Animated.View>

          {/* ONE-TAP PROBLEM CHIPS */}
          <Animated.View entering={FadeInDown.delay(100).duration(600).springify()}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
              {PROBLEM_CHIPS.map((chip, i) => (
                <Pressable key={i} style={styles.chip} onPress={() => handlePlan(chip.label)}>
                  <Ionicons name={chip.icon as any} size={18} color={colors.accent} />
                  <Text style={styles.chipText}>{chip.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={styles.inputCard}>
            <View style={styles.assistantHeader}>
              <Image source={require("../assets/images/assistant.png")} style={styles.assistantAvatar} />
              <Text style={styles.inputLabel}>How can I help you today?</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Describe your dental issue..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={input}
              onChangeText={setInput}
              textAlignVertical="top"
            />
            <View style={styles.inputFooter}>
              <Pressable style={[styles.iconBtn, isListening && { backgroundColor: colors.danger }]} onPress={toggleListening}>
                <Ionicons name={isListening ? "stop" : "mic"} size={20} color={isListening ? "#FFF" : colors.accent} />
              </Pressable>
              <Button title="Generate Plan" onPress={() => handlePlan()} disabled={!input.trim()} style={{ flex: 1, marginLeft: spacing.sm, height: 44 }} />
            </View>
          </Animated.View>

          {/* HEALTH TOOLS GRID */}
          <Animated.View entering={FadeInUp.delay(300).duration(600).springify()}>
            <Text style={styles.sectionTitle}>Your Health</Text>
            <View style={styles.actionRow}>
              <Pressable style={styles.actionCard} onPress={() => router.push("/routine")}>
                <Ionicons name="flame" size={24} color="#F59E0B" />
                <Text style={styles.actionText}>Daily Routine</Text>
              </Pressable>
              <Pressable style={styles.actionCard} onPress={() => router.push("/appointments")}>
                <Ionicons name="calendar" size={24} color={colors.accent} />
                <Text style={styles.actionText}>My Visits</Text>
              </Pressable>
              <Pressable style={styles.actionCard} onPress={() => router.push("/journal")}>
                <Ionicons name="analytics" size={24} color={colors.accent} />
                <Text style={styles.actionText}>Pain Journal</Text>
              </Pressable>
              <Pressable style={styles.actionCard} onPress={() => router.push("/visit-notes")}>
                <Ionicons name="document-text" size={24} color={colors.accent} />
                <Text style={styles.actionText}>Visit Notes</Text>
              </Pressable>
            </View>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: spacing.xl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.lg },
  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  greeting: { fontSize: 14, fontWeight: "500", color: colors.textMuted, marginBottom: 2 },
  name: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  settingsBtn: { padding: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  
  chipsContainer: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg, paddingRight: spacing.lg },
  chip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.surface, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 14, fontWeight: "600", color: colors.text },

  inputCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
  assistantHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  assistantAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: spacing.sm },
  inputLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  input: { fontSize: 16, color: colors.text, lineHeight: 24, minHeight: 70 },
  inputFooter: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
  iconBtn: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.accentMuted, alignItems: "center", justifyContent: "center", marginRight: spacing.sm },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  actionCard: { width: "47%", backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  actionText: { fontSize: 14, fontWeight: "600", color: colors.text },
});