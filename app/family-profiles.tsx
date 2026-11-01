// app/family-profiles.tsx
import { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, TextInput, Pressable, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function FamilyProfilesScreen() {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("family_profiles").then(data => {
      if (data) setProfiles(JSON.parse(data));
    });
  }, []);

  const addProfile = async () => {
    if (!newName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = [...profiles, newName.trim()];
    setProfiles(updated);
    await AsyncStorage.setItem("family_profiles", JSON.stringify(updated));
    setNewName("");
  };

  const removeProfile = async (name: string) => {
    Alert.alert("Remove Profile", `Remove ${name} from your family?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        const updated = profiles.filter(p => p !== name);
        setProfiles(updated);
        await AsyncStorage.setItem("family_profiles", JSON.stringify(updated));
      }}
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Family Profiles</Text>
          <Text style={styles.subtitle}>Manage dental care for your whole family.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add New Family Member</Text>
          <View style={styles.inputRow}>
            <TextInput style={styles.input} placeholder="e.g. Sarah (Daughter)" placeholderTextColor={colors.textMuted} value={newName} onChangeText={setNewName} />
            <Pressable style={styles.addBtn} onPress={addProfile}>
              <Ionicons name="add" size={24} color="#FFF" />
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Active Profiles</Text>
        {profiles.length === 0 ? (
          <Text style={styles.emptyText}>No family members added yet.</Text>
        ) : (
          <View style={styles.list}>
            {profiles.map((profile, index) => (
              <View key={index} style={styles.profileRow}>
                <View style={styles.profileInfo}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{profile.charAt(0)}</Text></View>
                  <Text style={styles.profileName}>{profile}</Text>
                </View>
                <Pressable onPress={() => removeProfile(profile)} style={styles.deleteBtn}>
                  <Ionicons name="trash" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  inputRow: { flexDirection: "row", gap: spacing.sm },
  input: { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, fontSize: 15, color: colors.text },
  addBtn: { width: 48, height: 48, backgroundColor: colors.accent, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  emptyText: { color: colors.textMuted, fontStyle: "italic" },
  list: { gap: spacing.sm },
  profileRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  profileInfo: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentMuted, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", color: colors.accent },
  profileName: { fontSize: 16, fontWeight: "600", color: colors.text },
  deleteBtn: { padding: spacing.sm },
});