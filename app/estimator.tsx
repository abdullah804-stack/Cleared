// app/estimator.tsx
// Typical treatment prices in Pakistan (PKR) and what fits a budget.
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { useThemeColors, ThemeColors, radius, spacing, type } from "../constants/theme";

type Category = "Preventative" | "Restorative" | "Surgical" | "Cosmetic";

// Approximate Pakistani private-clinic ranges (PKR). Real prices vary by city and clinic.
const PROCEDURES: { id: string; name: string; min: number; max: number; category: Category; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "1", name: "Scaling & polishing", min: 3000, max: 6000, category: "Preventative", icon: "sparkles" },
  { id: "2", name: "Checkup & X-ray", min: 1000, max: 2500, category: "Preventative", icon: "scan" },
  { id: "3", name: "Composite filling", min: 4000, max: 8000, category: "Restorative", icon: "construct" },
  { id: "4", name: "Root canal (RCT)", min: 15000, max: 30000, category: "Surgical", icon: "medkit" },
  { id: "5", name: "Tooth extraction", min: 3000, max: 8000, category: "Surgical", icon: "cut" },
  { id: "6", name: "Teeth whitening", min: 15000, max: 40000, category: "Cosmetic", icon: "sunny" },
  { id: "7", name: "Zirconia crown", min: 20000, max: 45000, category: "Restorative", icon: "diamond" },
  { id: "8", name: "Braces", min: 80000, max: 250000, category: "Cosmetic", icon: "git-compare" },
];

const CATEGORIES: ("All" | Category)[] = ["All", "Preventative", "Restorative", "Surgical", "Cosmetic"];
const money = (n: number) => `Rs ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

export default function EstimatorScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [budgetText, setBudgetText] = useState("");
  const [category, setCategory] = useState<"All" | Category>("All");

  const budget = Number(budgetText.replace(/[^0-9]/g, "")) || 0;
  const hasBudget = budget > 0;
  const list = PROCEDURES.filter((p) => category === "All" || p.category === category);

  const status = (p: (typeof PROCEDURES)[number]) => (p.max <= budget ? "within" : p.min <= budget ? "maybe" : "over");
  const fit = PROCEDURES.filter((p) => p.min <= budget).length;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>Cost estimator</Text>
          <Text style={styles.sub}>Typical private-clinic prices in Pakistan, before any insurance.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
          <Card style={{ marginTop: spacing.lg }}>
            <Text style={styles.label}>Your budget (PKR)</Text>
            <Input icon="wallet-outline" placeholder="e.g. 20000" keyboardType="number-pad" value={budgetText} onChangeText={(t) => setBudgetText(t.replace(/[^0-9]/g, ""))} maxLength={8} />
            {hasBudget && (
              <Text style={styles.summary}>
                {fit === 0 ? "Nothing here fits that budget. Ask a clinic about payment plans." : `${fit} of ${PROCEDURES.length} treatments start within ${money(budget)}.`}
              </Text>
            )}
          </Card>
        </Animated.View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md, flexGrow: 0 }} contentContainerStyle={{ gap: spacing.sm }}>
          {CATEGORIES.map((c) => {
            const on = c === category;
            return (
              <Pressable
                key={c}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setCategory(c);
                }}
                style={[styles.chip, on && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, on && { color: colors.onAccent }]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          {list.map((p, i) => {
            const st = hasBudget ? status(p) : null;
            const tone = st === "within" ? { bg: colors.successMuted, fg: colors.success, text: "Within budget" } : st === "maybe" ? { bg: colors.warningMuted, fg: colors.warning, text: "Might fit" } : st === "over" ? { bg: colors.dangerMuted, fg: colors.danger, text: "Over budget" } : null;
            return (
              <Animated.View key={p.id} entering={FadeInDown.delay(120 + i * 40).duration(380)} layout={LinearTransition}>
                <Card style={styles.proc}>
                  <View style={[styles.procIcon, { backgroundColor: colors.accentMuted }]}>
                    <Ionicons name={p.icon} size={20} color={colors.accentStrong} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.procName}>{p.name}</Text>
                    <Text style={styles.procCat}>{p.category}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", maxWidth: "46%" }}>
                    <Text style={styles.price}>{money(p.min)}</Text>
                    <Text style={styles.priceTo}>to {money(p.max)}</Text>
                    {tone && (
                      <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                        <Text style={[styles.badgeText, { color: tone.fg }]}>{tone.text}</Text>
                      </View>
                    )}
                  </View>
                </Card>
              </Animated.View>
            );
          })}
        </View>

        <Text style={styles.disclaimer}>Estimates only. Your dentist will give an exact quote after examining you.</Text>
        <Button title="See what others paid" icon="people" variant="soft" onPress={() => router.push("/community-prices" as never)} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    title: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.8 },
    sub: { ...type.body, color: colors.textMuted, marginTop: 4 },
    label: { fontSize: 13, fontWeight: "700", color: colors.textMuted, marginBottom: spacing.sm },
    summary: { fontSize: 13.5, lineHeight: 19, color: colors.accentStrong, fontWeight: "600", marginTop: spacing.sm },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    chipText: { fontSize: 13.5, fontWeight: "700", color: colors.text },
    proc: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    procIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    procName: { fontSize: 15.5, fontWeight: "700", color: colors.text },
    procCat: { ...type.caption, color: colors.textMuted, marginTop: 2 },
    price: { fontSize: 15, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    priceTo: { fontSize: 12, color: colors.textMuted, fontVariant: ["tabular-nums"] },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, marginTop: 6 },
    badgeText: { fontSize: 10.5, fontWeight: "800" },
    disclaimer: { ...type.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
  });