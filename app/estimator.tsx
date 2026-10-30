// app/estimator.tsx
import { useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

// Realistic PKR Ranges (Approximate 2024 Pakistani Market Rates)
const PROCEDURES = [
  { id: "1", name: "Scaling & Polishing", min: 3000, max: 6000, category: "Preventative" },
  { id: "2", name: "Dental Checkup & X-Ray", min: 1000, max: 2500, category: "Preventative" },
  { id: "3", name: "Composite Filling", min: 4000, max: 8000, category: "Restorative" },
  { id: "4", name: "Root Canal (RCT)", min: 15000, max: 30000, category: "Surgical" },
  { id: "5", name: "Tooth Extraction", min: 3000, max: 8000, category: "Surgical" },
  { id: "6", name: "Teeth Whitening", min: 15000, max: 40000, category: "Cosmetic" },
  { id: "7", name: "Zirconia Crown", min: 20000, max: 45000, category: "Restorative" },
  { id: "8", name: "Braces (Orthodontics)", min: 80000, max: 250000, category: "Cosmetic" },
];

export default function EstimatorScreen() {
  const router = useRouter();
  const [budget, setBudget] = useState("");

  const maxBudget = Number(budget) || Infinity;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Cost Estimator</Text>
          <Text style={styles.subtitle}>Typical ranges in PKR (without insurance).</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Max Budget (PKR)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 20000"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={budget}
            onChangeText={setBudget}
          />
        </View>

        <View style={styles.list}>
          {PROCEDURES.map((proc) => {
            const isWithinBudget = proc.min <= maxBudget;
            return (
              <View key={proc.id} style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{proc.name}</Text>
                  <Text style={styles.cardCategory}>{proc.category}</Text>
                </View>
                <View style={styles.cardPriceContainer}>
                  <Text style={styles.cardPrice}>Rs {proc.min.toLocaleString()} - {proc.max.toLocaleString()}</Text>
                  {budget ? (
                    <View style={[styles.badge, { backgroundColor: isWithinBudget ? "#F0FDF4" : "#FEF2F2" }]}>
                      <Text style={[styles.badgeText, { color: isWithinBudget ? "#166534" : "#991B1B" }]}>
                        {isWithinBudget ? "Within Budget" : "Over Budget"}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button title="Back to Home" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 120 },
  header: { marginTop: spacing.md, marginBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  
  inputContainer: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  inputLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.xs },
  input: { fontSize: 20, fontWeight: "700", color: colors.text, paddingVertical: spacing.xs },
  
  list: { gap: spacing.sm },
  card: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 2 },
  cardCategory: { fontSize: 12, color: colors.textMuted, textTransform: "uppercase", fontWeight: "600" },
  cardPriceContainer: { alignItems: "flex-end", maxWidth: "50%" },
  cardPrice: { fontSize: 14, fontWeight: "800", color: colors.text, marginBottom: 4, textAlign: "right" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: "700" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});