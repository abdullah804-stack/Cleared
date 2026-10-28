// app/consent.tsx
import { useMemo, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useConsent } from "../contexts/ConsentContext";
import { useThemeColors, ThemeColors, radius, spacing, shadows, type } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function ConsentScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { grantConsent } = useConsent();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  // No manual navigation here: once consent is granted, the root layout
  // redirects to login (or home if already signed in).
  const handleAgree = async () => {
    if (!agreed || saving) return;
    setSaving(true);
    await grantConsent();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons name="shield-checkmark" size={38} color={colors.accent} />
          </View>
          <Text style={styles.title}>Privacy & Consent</Text>
          <Text style={styles.subtitle}>Before you use Cleared, please review how we handle your data.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud-upload-outline" size={18} color={colors.accentStrong} />
            <Text style={styles.cardTitle}>What we send to the AI</Text>
          </View>
          <Text style={styles.cardText}>• Your typed symptoms and requests.</Text>
          <Text style={styles.cardText}>• Your approximate location (to find real dentists nearby).</Text>

          <View style={styles.divider} />

          <View style={styles.cardHeader}>
            <Ionicons name="phone-portrait-outline" size={18} color={colors.accentStrong} />
            <Text style={styles.cardTitle}>What we keep on your device</Text>
          </View>
          <Text style={styles.cardText}>• Your AI audit log (SQLite).</Text>
          <Text style={styles.cardText}>• Your secure login token.</Text>
        </View>

        <View style={styles.disclaimer}>
          <Ionicons name="medical-outline" size={18} color={colors.danger} style={{ marginTop: 1 }} />
          <Text style={styles.disclaimerText}>
            Cleared is an AI assistant, not a doctor. Always seek professional medical advice for emergencies.
          </Text>
        </View>

        <Pressable style={styles.checkRow} onPress={() => setAgreed(!agreed)} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
          <Ionicons
            name={agreed ? "checkbox" : "square-outline"}
            size={24}
            color={agreed ? colors.accent : colors.textMuted}
          />
          <Text style={styles.checkText}>I understand and consent to this data usage.</Text>
        </Pressable>

        <View style={styles.spacer} />

        <Button title="Agree & Continue" onPress={handleAgree} disabled={!agreed} loading={saving} />
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { flexGrow: 1, paddingBottom: spacing.xl },
    header: { alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.xl },
    iconBox: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.accentMuted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    title: { ...type.display, fontSize: 28, color: colors.text, marginBottom: spacing.sm },
    subtitle: { fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: "center", paddingHorizontal: spacing.lg },

    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.md,
      ...shadows.md,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
    cardTitle: { ...type.heading, fontSize: 16, color: colors.text },
    cardText: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs, lineHeight: 21 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.lg },

    disclaimer: {
      flexDirection: "row",
      gap: spacing.sm + 2,
      backgroundColor: colors.dangerMuted,
      padding: spacing.md,
      borderRadius: radius.md,
      marginBottom: spacing.lg,
    },
    disclaimerText: { flex: 1, fontSize: 13, color: colors.danger, fontWeight: "600", lineHeight: 19 },

    checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, marginBottom: spacing.xl, paddingVertical: spacing.xs },
    checkText: { fontSize: 14, color: colors.text, fontWeight: "500", flex: 1 },
    spacer: { flex: 1 },
  });