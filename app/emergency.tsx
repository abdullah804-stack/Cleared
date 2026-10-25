// app/emergency.tsx
import { StyleSheet, Text, View, Linking, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../components/Screen";
import { colors, spacing, radius } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export default function EmergencyScreen() {
  const router = useRouter();

  const callEmergency = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Linking.openURL("tel:911"); // Replace with local emergency number
  };

  return (
    <Screen style={styles.container}>
      <View style={styles.iconBox}>
        <Ionicons name="warning" size={60} color="#FFF" />
      </View>
      
      <Text style={styles.title}>Seek Urgent Care</Text>
      <Text style={styles.subtitle}>
        Based on your symptoms, this may be a dental emergency. Please do not wait for a regular appointment.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Call Emergency Services</Text>
        <Pressable style={styles.callButton} onPress={callEmergency}>
          <Ionicons name="call" size={20} color="#FFF" />
          <Text style={styles.callText}>Call Now</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => router.back()} style={{ marginTop: spacing.xl }}>
        <Text style={{ color: colors.textMuted, fontWeight: "600" }}>Go Back</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: "center", alignItems: "center", padding: spacing.xl },
  iconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: 16, color: colors.textMuted, textAlign: "center", lineHeight: 24, marginBottom: spacing.xl },
  card: { backgroundColor: "#FEF2F2", padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: "#FECACA", width: "100%", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#991B1B", marginBottom: spacing.md },
  callButton: { flexDirection: "row", backgroundColor: colors.danger, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.full, alignItems: "center", gap: spacing.sm },
  callText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});