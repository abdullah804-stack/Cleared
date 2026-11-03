// app/settings.tsx
import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Gradient } from "../components/Gradient";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { deleteAllLocalData } from "../utils/wipe";
import { useThemeColors, ThemeColors, gradients, radius, spacing, type } from "../constants/theme";

type MenuItem = { icon: keyof typeof Ionicons.glyphMap; label: string; hint: string; route: string; tint: string };

export default function SettingsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, signOut, updateProfile } = useAuth();
  const { lang, toggleLanguage } = useLanguage();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The profile loads after the screen opens; fill the field once, without overwriting typing.
  useEffect(() => {
    if (profile?.full_name) setName((prev) => prev || profile.full_name || "");
  }, [profile?.full_name]);

  const displayName = name.trim() || user?.email?.split("@")[0] || "You";
  const unchanged = name.trim() === (profile?.full_name ?? "");

  const MENU: MenuItem[] = [
    { icon: "person-circle", label: "Dental profile", hint: "Allergies, medicines, history", route: "/dental-profile", tint: colors.accentStrong },
    { icon: "people", label: "Family", hint: "Care for the people you look after", route: "/family-profiles", tint: "#7C3AED" },
    { icon: "cash", label: "Community prices", hint: "What others paid", route: "/community-prices", tint: colors.success },
    { icon: "calculator", label: "Cost estimator", hint: "Typical prices in PKR", route: "/estimator", tint: "#EA580C" },
    { icon: "bandage", label: "First aid", hint: "Urgent step-by-step help", route: "/emergency-aid", tint: colors.danger },
    { icon: "star", label: "Kids brushing", hint: "A two-minute game", route: "/kids-timer", tint: "#D97706" },
    { icon: "moon", label: "Ramadan mode", hint: "Care that fits fasting", route: "/ramadan", tint: "#4F46E5" },
    { icon: "document-text", label: "Audit log", hint: "What the AI did for you", route: "/audit", tint: colors.textMuted },
  ];

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return Alert.alert("Name needed", "Please enter a name to save.");
    setSaving(true);
    try {
      await updateProfile(trimmed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      Alert.alert("Couldn't save", "Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const switchLanguage = async () => {
    const { restartRequired } = await toggleLanguage();
    if (restartRequired) Alert.alert("Restart needed", "Close the app completely and open it again to finish switching the layout direction.");
  };

  const confirmDelete = () =>
    Alert.alert(
      "Delete all your data?",
      "This erases your logs, journal, routine, recovery, photos, notes, chat and care plans from this phone, removes your profile, bookings and price reports from the cloud, and signs you out. It can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAllLocalData(user?.id);
              await signOut();
            } catch {
              setDeleting(false);
              Alert.alert("Couldn't delete everything", "Please try again.");
            }
          },
        },
      ]
    );

  const confirmSignOut = () =>
    Alert.alert("Sign out?", "You'll need to sign in again to see your plans.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.hero}>
            <Gradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </Gradient>
            <Text style={styles.heroName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.heroEmail} numberOfLines={1}>{user?.email}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <Text style={styles.section}>Profile</Text>
            <Card>
              <Text style={styles.label}>What should we call you?</Text>
              <Input icon="person-outline" placeholder="e.g. Abdullah" value={name} onChangeText={setName} autoCapitalize="words" maxLength={40} returnKeyType="done" onSubmitEditing={save} />
              <Button title={unchanged ? "Saved" : "Save name"} icon={unchanged ? "checkmark" : "save"} onPress={save} loading={saving} disabled={unchanged || !name.trim()} style={{ marginTop: spacing.md }} />
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(400)}>
            <Text style={styles.section}>Explore</Text>
            <View style={styles.menu}>
              {MENU.map((m, i) => (
                <Pressable
                  key={m.route}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    router.push(m.route as any);
                  }}
                  style={({ pressed }) => [styles.item, i > 0 && styles.itemBorder, pressed && { backgroundColor: colors.surfaceAlt }]}
                  accessibilityRole="button"
                  accessibilityLabel={m.label}
                >
                  <View style={[styles.itemIcon, { backgroundColor: `${m.tint}1F` }]}>
                    <Ionicons name={m.icon} size={19} color={m.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemLabel}>{m.label}</Text>
                    <Text style={styles.itemHint}>{m.hint}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Text style={styles.section}>Preferences</Text>
            <Pressable onPress={switchLanguage} style={styles.menu} accessibilityRole="button" accessibilityLabel="Switch language">
              <View style={styles.item}>
                <View style={[styles.itemIcon, { backgroundColor: colors.accentMuted }]}>
                  <Ionicons name="language" size={19} color={colors.accentStrong} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemLabel}>Language</Text>
                  <Text style={styles.itemHint}>{lang === "en" ? "English" : "اردو"}</Text>
                </View>
                <Text style={styles.switchText}>{lang === "en" ? "Switch to اردو" : "Switch to English"}</Text>
              </View>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(260).duration(400)}>
            <Text style={styles.section}>Privacy and account</Text>
            <Card>
              <Text style={styles.privacy}>
                Your journal, routine, photos and audit log stay on this phone. Only your typed request and approximate location are sent to the AI to build a plan.
              </Text>
              <Button title="Sign out" variant="ghost" onPress={confirmSignOut} style={{ marginTop: spacing.md }} />
              <Button title="Delete my data" icon="trash" variant="danger" onPress={confirmDelete} loading={deleting} style={{ marginTop: spacing.xs }} />
            </Card>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    hero: { alignItems: "center", marginTop: spacing.sm },
    avatar: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
    avatarText: { fontSize: 36, fontWeight: "800", color: "#FFFFFF" },
    heroName: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.4, maxWidth: 300 },
    heroEmail: { fontSize: 14, color: colors.textMuted, marginTop: 2, maxWidth: 300 },
    section: { ...type.overline, color: colors.textMuted, marginTop: spacing.xl, marginBottom: spacing.sm, marginLeft: 4 },
    label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
    menu: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: "hidden" },
    item: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
    itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    itemIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    itemLabel: { fontSize: 15.5, fontWeight: "600", color: colors.text },
    itemHint: { fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
    switchText: { fontSize: 13, fontWeight: "700", color: colors.accentStrong },
    privacy: { fontSize: 14, lineHeight: 21, color: colors.textMuted },
  });