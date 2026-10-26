// app/settings.tsx
import { StyleSheet, Text, View, Alert } from "react-native";
import { useRouter } from "expo-router";
import { supabase, useAuth } from "../contexts/AuthContext";
import { clearAuditLog } from "../shared/audit";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleDeleteData = () => {
    Alert.alert(
      "Delete My Data",
      "This will permanently delete your audit logs and appointments. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            if (!user) return;
            await clearAuditLog(user.id);
            await supabase.from("appointments").delete().eq("user_id", user.id);
            Alert.alert("Deleted", "All your data has been removed.");
            router.replace("/");
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.email}>{user?.email}</Text>
          <Button title="Sign Out" variant="ghost" onPress={signOut} style={{ marginTop: spacing.md }} />
        </View>

        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
            <Text style={styles.rowText}>Biometric Lock is enabled</Text>
          </View>
          <View style={[styles.row, { marginTop: spacing.md }]}>
            <Ionicons name="server" size={20} color={colors.accent} />
            <Text style={styles.rowText}>Data is stored securely via Supabase</Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />
        <Button title="Delete My Data" variant="danger" onPress={handleDeleteData} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm, marginTop: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  email: { fontSize: 16, fontWeight: "600", color: colors.text },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowText: { fontSize: 15, color: colors.text, fontWeight: "500" },
});