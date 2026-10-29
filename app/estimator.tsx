// app/estimator.tsx
import { useMemo, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TextInput, KeyboardAvoidingView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { useThemeColors, ThemeColors, radius, spacing, shadows, type } from "../constants/theme";
import { CURRENCIES, CurrencyCode, formatMoney, getDefaultCurrency } from "../constants/pricing";

// Rough typical out-of-pocket prices. These are PLACEHOLDERS: adjust the PKR column to what
// clinics in your area actually charge before you launch.
const PROCEDURES: { id: string; name: string; category: string; prices: Record<CurrencyCode, number> }[] = [
  { id: "1", name: "Routine Cleaning", category: "Preventative", prices: { USD: 80, PKR: 3500 } },
  { id: "2", name: "Dental Checkup & X-Ray", category: "Preventative", prices: { USD: 100, PKR: 2500 } },
  { id: "3", name: "Composite Filling", category: "Restorative", prices: { USD: 150, PKR: 4500 } },
  { id: "4", name: "Root Canal (Molar)", category: "Surgical", prices: { USD: 800, PKR: 20000 } },
  { id: "5", name: "Simple Extraction", category: "Surgical", prices: { USD: 200, PKR: 3000 } },
  { id: "6", name: "Teeth Whitening", category: "Cosmetic", prices: { USD: 300, PKR: 20000 } },
  { id: "7", name: "Porcelain Crown", category: "Restorative", prices: { USD: 900, PKR: 15000 } },
];

export default function EstimatorScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(getDefaultCurrency().code);
  const currency = CURRENCIES[currencyCode];

  const [budget, setBudget] = useState("");
  const [focused, setFocused] = useState(false);

  const hasBudget = budget.length > 0;
  const maxBudget = hasBudget ? Number(budget) : Infinity;
  const withinCount = PROCEDURES.filter((p) => p.prices[currencyCode] <= maxBudget).length;

  const switchCurrency = (code: CurrencyCode) => {
    if (code === currencyCode) return;
    setCurrencyCode(code);
    setBudget(""); // an amount typed in one currency means something else in the other
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
          <View style={styles.header}>
            <Text style={styles.title}>Cost Estimator</Text>
            <Text style={styles.subtitle}>Typical out-of-pocket prices (no insurance).</Text>
          </View>

          <View style={styles.segment}>
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
              const active = code === currencyCode;
              return (
                <Pressable key={code} style={[styles.segmentBtn, active && styles.segmentBtnActive]} onPress={() => switchCurrency(code)}>
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{code}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.inputContainer, focused && styles.inputFocused]}>
            <Text style={styles.inputLabel}>Max budget</Text>
            <View style={styles.inputRow}>
              <Text style={styles.currency}>{currency.symbol.trim()}</Text>
              <TextInput
                style={styles.input}
                placeholder={currencyCode === "PKR" ? "e.g. 5000" : "e.g. 200"}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={budget}
                onChangeText={(t) => setBudget(t.replace(/[^0-9]/g, "").slice(0, 7))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="done"
              />
            </View>
            {hasBudget && (
              <Text style={styles.summary}>
                {withinCount} of {PROCEDURES.length} procedures fit your budget
              </Text>
            )}
          </View>

          <View style={styles.list}>
            {PROCEDURES.map((proc) => {
              const price = proc.prices[currencyCode];
              const isWithinBudget = price <= maxBudget;
              return (
                <View key={proc.id} style={[styles.card, hasBudget && !isWithinBudget && { opacity: 0.6 }]}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{proc.name}</Text>
                    <Text style={styles.cardCategory}>{proc.category}</Text>
                  </View>
                  <View style={styles.cardPriceContainer}>
                    <Text style={styles.cardPrice}>{formatMoney(price, currency)}</Text>
                    {hasBudget ? (
                      <View style={[styles.badge, { backgroundColor: isWithinBudget ? colors.successMuted : colors.dangerMuted }]}>
                        <Ionicons
                          name={isWithinBudget ? "checkmark-circle" : "close-circle"}
                          size={12}
                          color={isWithinBudget ? colors.success : colors.danger}
                        />
                        <Text style={[styles.badgeText, { color: isWithinBudget ? colors.success : colors.danger }]}>
                          {isWithinBudget ? "In budget" : "Over budget"}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.disclaimer}>Estimates only. Actual prices vary by clinic and city.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { flexGrow: 1, paddingBottom: spacing.xxl },
    header: { marginTop: spacing.sm, marginBottom: spacing.lg },
    title: { ...type.display, color: colors.text },
    subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },

    segment: {
      flexDirection: "row",
      alignSelf: "flex-start",
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.full,
      padding: 4,
      marginBottom: spacing.md,
    },
    segmentBtn: { paddingHorizontal: spacing.lg, paddingVertical: 8, borderRadius: radius.full },
    segmentBtnActive: { backgroundColor: colors.surface, ...shadows.sm },
    segmentText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
    segmentTextActive: { color: colors.accentStrong },

    inputContainer: {
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: radius.xl,
      borderWidth: 1.5,
      borderColor: colors.border,
      marginBottom: spacing.lg,
      ...shadows.sm,
    },
    inputFocused: { borderColor: colors.accent },
    inputLabel: { ...type.overline, color: colors.textMuted, marginBottom: spacing.xs },
    inputRow: { flexDirection: "row", alignItems: "center" },
    currency: { fontSize: 24, fontWeight: "700", color: colors.textMuted, marginRight: spacing.sm },
    input: { flex: 1, fontSize: 26, fontWeight: "800", color: colors.text, paddingVertical: spacing.xs },
    summary: { fontSize: 13, fontWeight: "600", color: colors.accentStrong, marginTop: spacing.xs },

    list: { gap: spacing.sm + 2 },
    card: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    cardInfo: { flex: 1, paddingRight: spacing.sm },
    cardName: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 3, letterSpacing: -0.2 },
    cardCategory: { ...type.overline, fontSize: 10, color: colors.textMuted },
    cardPriceContainer: { alignItems: "flex-end" },
    cardPrice: { fontSize: 19, fontWeight: "800", color: colors.text, marginBottom: 4, letterSpacing: -0.3 },
    badge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
    badgeText: { fontSize: 11, fontWeight: "700" },

    disclaimer: { ...type.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
  });