// app/settings.tsx
import { useState } from "react";
import { StyleSheet, Text, View, Alert, TextInput, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(profile?.full_name || "");

  const handleSave = async () => {
    await updateProfile(name);
    Alert.alert("Saved", "Your profile has been updated.");
    router.back();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <Text style={styles.sectionTitle}>Personal Profile</Text>
        <View style={styles.card}>
          <Text style={styles.label}>What should we call you?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Abdullah"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <Button title="Save Profile" onPress={handleSave} style={{ marginTop: spacing.md }} />
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.email}>{user?.email}</Text>
          <Button title="Sign Out" variant="ghost" onPress={signOut} style={{ marginTop: spacing.md }} />
        </View>

        <Button title="Delete My Data" variant="danger" onPress={() => Alert.alert("Coming soon")} style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm, marginTop: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md, fontSize: 16, color: colors.text },
  email: { fontSize: 16, fontWeight: "600", color: colors.text },
});