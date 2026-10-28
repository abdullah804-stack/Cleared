// app/consent.tsx
import { useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function ConsentScreen() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  const handleAgree = async () => {
    if (!agreed) return;
    
    try {
      // Try to save, but don't let it block the navigation
      SecureStore.setItemAsync("has_consented", "true").catch(console.error);
      AsyncStorage.setItem("has_consented", "true").catch(console.error);
    } finally {
      // Force navigation no matter what
      router.replace("/(auth)/login");
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons name="shield-checkmark" size={40} color={colors.accent} />
          </View>
          <Text style={styles.title}>Privacy & Consent</Text>
          <Text style={styles.subtitle}>Before you use Cleared, please review how we handle your data.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What we send to the AI</Text>
          <Text style={styles.cardText}>• Your typed symptoms and requests.</Text>
          <Text style={styles.cardText}>• Your approximate location (to find real dentists nearby).</Text>
          
          <Text style={[styles.cardTitle, { marginTop: spacing.lg }]}>What we keep on your device</Text>
          <Text style={styles.cardText}>• Your AI audit log (SQLite).</Text>
          <Text style={styles.cardText}>• Your secure login token.</Text>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>Cleared is an AI assistant, not a doctor. Always seek professional medical advice for emergencies.</Text>
        </View>

        <Pressable style={styles.checkRow} onPress={() => setAgreed(!agreed)}>
          <Ionicons name={agreed ? "checkbox" : "square-outline"} size={24} color={agreed ? colors.accent : colors.border} />
          <Text style={styles.checkText}>I understand and consent to this data usage.</Text>
        </Pressable>

        <View style={styles.spacer} />
        
        <Button 
          title="Agree & Continue" 
          onPress={handleAgree} 
          disabled={!agreed} 
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: spacing.xl },
  header: { alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.xl },
  iconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#E0E7FF", alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: "center", paddingHorizontal: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  cardText: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs, lineHeight: 20 },
  disclaimer: { backgroundColor: "#FEF2F2", padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.xl },
  disclaimerText: { fontSize: 13, color: "#991B1B", fontWeight: "500", lineHeight: 18 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  checkText: { fontSize: 14, color: colors.text, fontWeight: "500", flex: 1 },
  spacer: { flex: 1 },
});