// app/index.tsx
import { useState, useMemo } from "react";
import { StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, ScrollView, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useThemeColors, ThemeColors, radius, spacing, shadows, glow, type } from "../constants/theme";
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.header}>
            <View style={styles.profileRow}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
              </View>
              <View>
                <Text style={styles.greeting}>Welcome back</Text>
                <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push("/settings")}
              style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.7 }]}
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={styles.inputCard}>
            <View style={styles.assistantHeader}>
              <Image source={require("../assets/images/assistant.png")} style={styles.assistantAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>How can I help you today?</Text>
                <Text style={styles.inputHint}>Tell me what's going on — I'll build a care plan.</Text>
              </View>
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
              <Pressable style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]} accessibilityLabel="Dictate">
                <Ionicons name="mic" size={20} color={colors.accentStrong} />
              </Pressable>
              <Button
                title="Generate Plan"
                onPress={handlePlan}
                disabled={!input.trim()}
                style={{ flex: 1, marginLeft: spacing.sm, height: 48 }}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(300).duration(600).springify()}>
            <Text style={styles.sectionTitle}>Quick Triage</Text>
            <View style={styles.triageGrid}>
              <Pressable
                style={({ pressed }) => [styles.triageCard, pressed && styles.cardPressed]}
                onPress={() => setInput("My tooth hurts when I drink cold water")}
              >
                <View style={[styles.triageIcon, { backgroundColor: colors.dangerMuted }]}>
                  <Ionicons name="thermometer" size={22} color={colors.danger} />
                </View>
                <Text style={styles.triageTitle}>Tooth Pain</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.triageCard, pressed && styles.cardPressed]}
                onPress={() => setInput("I need a routine dental cleaning")}
              >
                <View style={[styles.triageIcon, { backgroundColor: colors.accentMuted }]}>
                  <Ionicons name="sparkles" size={22} color={colors.accent} />
                </View>
                <Text style={styles.triageTitle}>Cleaning</Text>
              </Pressable>
            </View>
          </Animated.View>

                    {/* Replace the Quick Triage section with this: */}
          <Animated.View entering={FadeInUp.delay(300).duration(600).springify()}>
            <Pressable style={styles.chatBanner} onPress={() => router.push("/chat")}>
              <View style={styles.chatIconBox}>
                <Ionicons name="chatbubbles" size={24} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.chatTitle}>Ask Cleared</Text>
                <Text style={styles.chatSubtitle}>Get instant answers about your dental health</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          </Animated.View>
            // Update the section:
                    <Text style={styles.sectionTitle}>Your Health</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.actionCard} onPress={() => router.push("/photos")}>
              <Ionicons name="images" size={24} color={colors.accent} />
              <Text style={styles.actionText}>Photos</Text>
            </Pressable>
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
          
            </Pressable>
            <Pressable style={styles.actionCard} onPress={() => router.push("/estimator")}>
              <Ionicons name="calculator" size={24} color={colors.accent} />
              <Text style={styles.actionText}>Cost Estimator</Text>
            </Pressable>
            <Pressable style={styles.actionCard} onPress={() => router.push("/dental-profile")}>
              <Ionicons name="person-circle-outline" size={24} color={colors.accent} />
              <Text style={styles.actionText}>Dental Profile</Text>
            </Pressable>
          </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { flexGrow: 1, paddingBottom: spacing.xxl },

    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 },
    avatarRing: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accentMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      ...glow(colors.accent, 0.25),
    },
    avatarText: { fontSize: 20, fontWeight: "700", color: colors.onAccent },
    greeting: { ...type.caption, color: colors.textMuted, marginBottom: 2 },
    name: { ...type.title, color: colors.text, maxWidth: 220 },
    settingsBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      ...shadows.sm,
    },

    inputCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.xl,
      ...shadows.md,
    },
    assistantHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
    assistantAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: spacing.md,
      backgroundColor: colors.accentMuted,
    },
    inputLabel: { ...type.heading, fontSize: 17, color: colors.text },
    inputHint: { ...type.caption, color: colors.textMuted, marginTop: 2 },
    input: {
      ...type.body,
      color: colors.text,
      minHeight: 96,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    inputFooter: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
    iconBtn: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      backgroundColor: colors.accentMuted,
      alignItems: "center",
      justifyContent: "center",
    },

    sectionTitle: { ...type.heading, color: colors.text, marginBottom: spacing.md },
    cardPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },

    triageGrid: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
    triageCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    triageIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
    },
    triageTitle: { ...type.bodyStrong, fontSize: 15, color: colors.text },

    actionRow: { flexDirection: "row", gap: spacing.md },
    actionCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
      ...shadows.sm,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.sm + 2,
      backgroundColor: colors.accentMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    actionFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    actionText: { ...type.bodyStrong, fontSize: 14, color: colors.text },
  });

  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  actionCard: { width: "47%", backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2, gap: spacing.sm },

  chatBanner: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  chatIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  chatTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  chatSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },