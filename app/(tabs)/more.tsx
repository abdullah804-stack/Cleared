export { ErrorBoundary } from "expo-router";
// app/(tabs)/more.tsx
// Extras that don't belong in the other tabs: family, modes, preferences, privacy and account.
import { ReactNode, useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { tick } from "../../utils/haptics";
import { Ionicons } from "@expo/vector-icons";
import { TabPage } from "../../components/TabPage";
import { Card } from "../../components/Card";
import { Avatar } from "../../components/Avatar";
import { useIdentity } from "../../hooks/useIdentity";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useThemeColors, ThemeColors, glow, radius, spacing, type } from "../../constants/theme";

type IconName = keyof typeof Ionicons.glyphMap;
type Row = { icon: IconName; tint: string; title: string; sub?: string; right?: string; onPress: () => void; danger?: boolean };

export default function MoreTab() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { username, avatarId } = useIdentity();
  const { user, signOut } = useAuth();
  const { lang, toggleLanguage } = useLanguage();

  const go = (path: string) => () => router.push(path as any);

  const switchLanguage = async () => {
    const { restartRequired } = await toggleLanguage();
    if (restartRequired) Alert.alert("Restart needed", "Close the app completely and open it again to finish switching the layout direction.");
  };

  const confirmSignOut = () =>
    Alert.alert("Sign out?", "You'll need to sign in again to see your plans.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);

  const group = (title: string, rows: Row[], delay: number): ReactNode => (
    <View>
      <Text style={styles.section}>{title}</Text>
      <View style={styles.group}>
        {rows.map((r, i) => (
          <Pressable
            key={r.title}
            onPress={() => {
              tick();
              r.onPress();
            }}
            style={({ pressed }) => [styles.item, i > 0 && styles.itemBorder, pressed && { backgroundColor: colors.surfaceAlt }]}
            accessibilityRole="button"
            accessibilityLabel={r.title}
          >
            <View style={[styles.itemIcon, { backgroundColor: `${r.tint}1A`, borderColor: `${r.tint}55` }]}>
              <Ionicons name={r.icon} size={19} color={r.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, r.danger && { color: colors.danger }]}>{r.title}</Text>
              {r.sub ? <Text style={styles.itemSub}>{r.sub}</Text> : null}
            </View>
            {r.right ? <Text style={styles.right}>{r.right}</Text> : <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />}
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <TabPage title="More" subtitle="Family, modes, preferences and privacy." icon="apps" tint="#818CF8">
      <View>
        <Card onPress={go("/settings")} style={[styles.profile, glow(colors.accent, 0.18)]} accessibilityLabel="Open your profile and settings">
          <Avatar id={avatarId} size={58} ring />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{username}</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
            <Text style={styles.edit}>Edit profile and avatar</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Card>
      </View>

      {group("Family and kids", [
        { icon: "people-circle", tint: "#F472B6", title: "Family profiles", sub: "Care for the people you look after", onPress: go("/family-profiles") },
        { icon: "happy", tint: "#2DD4BF", title: "Kids brushing", sub: "A fun two-minute timer with stars", onPress: go("/kids-timer") },
      ], 120)}

      {group("Special modes", [
        { icon: "moon", tint: "#818CF8", title: "Ramadan mode", sub: "Suhoor and iftar reminders and tips", onPress: go("/ramadan") },
      ], 180)}

      {group("Preferences", [
        { icon: "language", tint: "#22D3EE", title: "Language", sub: lang === "en" ? "English" : "اردو", right: lang === "en" ? "Switch to اردو" : "Switch to English", onPress: switchLanguage },
        { icon: "settings", tint: "#94A3B8", title: "Settings", sub: "Username, avatar and account", onPress: go("/settings") },
      ], 240)}

      {group("Privacy", [
        { icon: "shield-checkmark", tint: "#34D399", title: "Audit log", sub: "Everything the AI did for you", onPress: go("/audit") },
        { icon: "trash", tint: "#FB7185", title: "Delete my data", sub: "Erase your data from this phone and the cloud", onPress: go("/settings") },
      ], 300)}

      {group("Account", [{ icon: "log-out", tint: "#FB7185", title: "Sign out", danger: true, onPress: confirmSignOut }], 360)}

      <Text style={styles.foot}>Cleared {Constants.expoConfig?.version ?? ""}. Guidance, not a diagnosis. In an emergency call 1122.</Text>
    </TabPage>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    profile: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    name: { fontSize: 19, fontWeight: "800", color: colors.text },
    email: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
    edit: { fontSize: 12.5, fontWeight: "700", color: colors.accentStrong, marginTop: 4 },
    section: { ...type.overline, color: colors.textMuted, marginTop: spacing.xl, marginBottom: spacing.sm, marginLeft: 4 },
    group: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: "hidden" },
    item: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
    itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    itemIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1 },
    itemTitle: { fontSize: 15.5, fontWeight: "700", color: colors.text },
    itemSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
    right: { fontSize: 12.5, fontWeight: "800", color: colors.accentStrong },
    foot: { ...type.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  });