// app/index.tsx
import { useState, useMemo } from "react";
import { StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, ScrollView, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useThemeColors, radius, spacing } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const [input, setInput] = useState("");
  const router = useRouter();
  const { user, profile } = useAuth();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "there";
  const initial = displayName.charAt(0).toUpperCase();

  const handlePlan = () => {
    if (!input.trim()) return;
    router.push({ pathname: "/plan", params: { request: input.trim() } });
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll}>
          
          <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.header}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.name}>{displayName}</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push("/settings")} style={styles.settingsBtn}>
              <Ionicons name="settings-outline" size={22} color={colors.text} />
            </Pressable>
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
              <Pressable style={styles.iconBtn} onPress={() => router.push("/chat")}>
                <Ionicons name="chatbubbles" size={20} color={colors.accent} />
              </Pressable>
              <Button title="Generate Plan" onPress={handlePlan} disabled={!input.trim()} style={{ flex: 1, marginLeft: spacing.sm, height: 44 }} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(300).duration(600).springify()}>
            <Text style={styles.sectionTitle}>Quick Triage</Text>
            <View style={styles.triageGrid}>
              <Pressable style={styles.triageCard} onPress={() => setInput("My tooth hurts when I drink cold water")}>
                <View style={[styles.triageIcon, { backgroundColor: "#FEE2E2" }]}>
                  <Ionicons name="thermometer" size={24} color="#EF4444" />
                </View>
                <Text style={styles.triageTitle}>Tooth Pain</Text>
              </Pressable>
              <Pressable style={styles.triageCard} onPress={() => setInput("I need a routine dental cleaning")}>
                <View style={[styles.triageIcon, { backgroundColor: "#E0F2FE" }]}>
                  <Ionicons name="sparkles" size={24} color="#0EA5E9" />
                </View>
                <Text style={styles.triageTitle}>Cleaning</Text>
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(600).springify()}>
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
              <Pressable style={styles.actionCard} onPress={() => router.push("/photos")}>
                <Ionicons name="images" size={24} color={colors.accent} />
                <Text style={styles.actionText}>Photos</Text>
              </Pressable>
              <Pressable style={styles.actionCard} onPress={() => router.push("/dental-profile")}>
                <Ionicons name="person-circle-outline" size={24} color={colors.accent} />
                <Text style={styles.actionText}>Dental Profile</Text>
              </Pressable>
              <Pressable style={styles.actionCard} onPress={() => router.push("/estimator")}>
                <Ionicons name="calculator" size={24} color={colors.accent} />
                <Text style={styles.actionText}>Cost Estimator</Text>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
  
  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  avatarText: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  greeting: { fontSize: 14, fontWeight: "500", color: colors.textMuted, marginBottom: 2 },
  name: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  
  settingsBtn: { padding: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.full, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  
  inputCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 4, marginBottom: spacing.xl },
  assistantHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  assistantAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: spacing.sm, backgroundColor: colors.accentMuted },
  inputLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  
  input: { fontSize: 16, color: colors.text, lineHeight: 24, minHeight: 70 },
  inputFooter: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
  iconBtn: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.accentMuted, alignItems: "center", justifyContent: "center" },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  triageGrid: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  triageCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  triageIcon: { width: 56, height: 56, borderRadius: radius.full, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  triageTitle: { fontSize: 15, fontWeight: "600", color: colors.text },

  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  actionCard: { width: "47%", backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2, gap: spacing.sm },
  actionText: { fontSize: 14, fontWeight: "600", color: colors.text },
});