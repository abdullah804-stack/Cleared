// app/settings.tsx
import { useState, useEffect } from "react";
import { StyleSheet, Text, View, Alert, TextInput, Pressable, ScrollView, Switch } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { clearAuditLog } from "../shared/audit";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { lang, t, toggleLanguage } = useLanguage();
  const router = useRouter();
  const [profiles, setProfiles] = useState<string[]>([]);
  const [newProfile, setNewProfile] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("family_profiles").then(data => {
      if (data) setProfiles(JSON.parse(data));
    });
  }, []);

  const addProfile = async () => {
    if (!newProfile.trim()) return;
    const updated = [...profiles, newProfile.trim()];
    setProfiles(updated);
    await AsyncStorage.setItem("family_profiles", JSON.stringify(updated));
    setNewProfile("");
  };

  const removeProfile = async (name: string) => {
    const updated = profiles.filter(p => p !== name);
    setProfiles(updated);
    await AsyncStorage.setItem("family_profiles", JSON.stringify(updated));
  };

  const handleDeleteData = () => {
    Alert.alert(
      "Delete My Data",
      "This will permanently delete your data. Cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            if (!user) return;
            await clearAuditLog(user.id);
            await supabase.from("appointments").delete().eq("user_id", user.id);
            await AsyncStorage.removeItem("family_profiles");
            setProfiles([]);
            router.replace("/");
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>{t.language}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowText}>{lang === "en" ? t.english : t.urdu}</Text>
            <Switch value={lang === "ur"} onValueChange={toggleLanguage} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.email}>{user?.email}</Text>
          <Button title="Sign Out" variant="ghost" onPress={signOut} style={{ marginTop: spacing.md }} />
        </View>

        <Text style={styles.sectionTitle}>Family Profiles</Text>
        <View style={styles.card}>
          {profiles.map((profile, i) => (
            <View key={i} style={styles.profileRow}>
              <Text style={styles.profileName}>{profile}</Text>
              <Pressable onPress={() => removeProfile(profile)}>
                <Ionicons name="trash" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))}
          <View style={styles.addRow}>
            <TextInput style={styles.addInput} placeholder="e.g. Sarah" placeholderTextColor={colors.textMuted} value={newProfile} onChangeText={setNewProfile} />
            <Pressable style={styles.addBtn} onPress={addProfile}>
              <Ionicons name="add" size={20} color="#FFF" />
            </Pressable>
          </View>
        </View>

        <Button title="Delete My Data" variant="danger" onPress={handleDeleteData} style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm, marginTop: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  email: { fontSize: 16, fontWeight: "600", color: colors.text },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowText: { fontSize: 15, color: colors.text, fontWeight: "500" },
  profileRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  profileName: { fontSize: 15, color: colors.text, fontWeight: "500" },
  addRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.md, gap: spacing.sm },
  addInput: { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, color: colors.text },
  addBtn: { backgroundColor: colors.accent, width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
});