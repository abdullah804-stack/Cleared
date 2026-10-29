// app/settings.tsx
import { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { deleteAllLocalData } from "../utils/wipe";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useThemeColors, ThemeColors, radius, spacing, shadows, type } from "../constants/theme";

export default function SettingsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { user, profile, signOut, updateProfile } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(profile?.full_name || "");
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The profile loads asynchronously, so fill the field once it arrives
  useEffect(() => {
    if (profile?.full_name) setName((prev) => prev || profile.full_name || "");
  }, [profile?.full_name]);

  const displayName = name.trim() || user?.email?.split("@")[0] || "You";
  const initial = displayName.charAt(0).toUpperCase();
  const unchanged = name.trim() === (profile?.full_name || "");

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return Alert.alert("Name needed", "Please enter a name to save.");
    setSaving(true);
    try {
      await updateProfile(trimmed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setTimeout(() => router.back(), 700);
    } catch {
      Alert.alert("Couldn't save", "Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete all your data?",
      "This permanently erases your audit log, pain journal and saved care plan from this phone, removes your profile, and signs you out. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAllLocalData(user?.id);
              await signOut(); // the root layout then returns to the login screen
            } catch {
              setDeleting(false);
              Alert.alert("Couldn't delete everything", "Please try again.");
            }
          },
        },
      ]
    );
  };

  const confirmSignOut = () => {
    Alert.alert("Sign out?", "You'll need to sign in again to see your plans.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            </View>
            <Text style={styles.heroName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.heroEmail} numberOfLines={1}>{user?.email}</Text>
          </View>

          <Text style={styles.sectionTitle}>Personal profile</Text>
          <View style={styles.card}>
            <Text style={styles.label}>What should we call you?</Text>
            <View style={[styles.field, focused && styles.fieldFocused]}>
              <Ionicons name="person-outline" size={18} color={focused ? colors.accent : colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Abdullah"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setSaved(false);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                autoCapitalize="words"
                maxLength={40}
              />
            </View>
            <Button
              title={saved ? "Saved ✓" : "Save Profile"}
              onPress={handleSave}
              loading={saving}
              disabled={unchanged || saved}
              style={{ marginTop: spacing.md }}
            />
          </View>

          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="mail-outline" size={18} color={colors.accentStrong} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Signed in as</Text>
                <Text style={styles.rowValue} numberOfLines={1}>{user?.email}</Text>
              </View>
            </View>
            <Button title="Sign Out" variant="ghost" onPress={confirmSignOut} style={{ marginTop: spacing.md }} />
          </View>

          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.card}>
            <Text style={styles.privacyText}>
              Your audit log and pain journal stay on this device. Only your typed request and approximate location are
              sent to the AI to build a plan.
            </Text>
            <Button
              title="Delete My Data"
              variant="danger"
              onPress={confirmDelete}
              loading={deleting}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { paddingTop: spacing.md, paddingBottom: spacing.xxl },

    hero: { alignItems: "center", marginTop: spacing.sm, marginBottom: spacing.sm },
    avatarRing: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.accentMuted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 32, fontWeight: "700", color: colors.onAccent },
    heroName: { ...type.title, color: colors.text, maxWidth: 280 },
    heroEmail: { fontSize: 14, color: colors.textMuted, marginTop: 2, maxWidth: 280 },

    sectionTitle: { ...type.overline, color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.lg, marginLeft: 4 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      ...shadows.sm,
    },
    label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      height: 54,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1.5,
      borderColor: "transparent",
      borderRadius: radius.md,
    },
    fieldFocused: { borderColor: colors.accent, backgroundColor: colors.surface },
    input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 0 },

    row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.sm + 2,
      backgroundColor: colors.accentMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    rowLabel: { ...type.caption, color: colors.textMuted },
    rowValue: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 1 },
    privacyText: { fontSize: 14, lineHeight: 21, color: colors.textMuted },
  });