// app/case-card.tsx
// A summary the patient sends to a clinic over WhatsApp. The clinic's reply is theirs to confirm: we never pretend a booking is confirmed.
import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Gradient } from "../components/Gradient";
import { useThemeColors, ThemeColors, gradients, radius, spacing, type } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";

type Status = "draft" | "sent" | "confirmed";

export default function CaseCardScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ request?: string; clinicPhone?: string }>();
  const { profile, user } = useAuth() as any;

  const [status, setStatus] = useState<Status>("draft");
  const [phone, setPhone] = useState(params.clinicPhone ?? "");
  const [summary, setSummary] = useState<{ request: string; duration: string; pain: number; canEat: boolean } | null>(null);

  useEffect(() => {
    AsyncStorage.multiGet(["case_card_status", "case_card_phone", "last_request"])
      .then(([s, p, r]) => {
        if (s[1] === "sent" || s[1] === "confirmed") setStatus(s[1]);
        if (!params.clinicPhone && p[1]) setPhone(p[1]);
        if (r[1]) setSummary(JSON.parse(r[1]));
      })
      .catch(() => {});
  }, []);

  const issue = params.request || summary?.request || "Dental issue";
  const digits = phone.replace(/[^0-9]/g, "");
  // Pakistani numbers are often typed 03xx...; WhatsApp needs the country code.
  const waNumber = digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
  const valid = waNumber.length >= 10;

  const setAndSave = (s: Status) => {
    setStatus(s);
    AsyncStorage.setItem("case_card_status", s).catch(() => {});
  };

  const send = async () => {
    if (!valid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    AsyncStorage.setItem("case_card_phone", phone).catch(() => {});

    const lines = [
      `*New patient request (Cleared app)*`,
      ``,
      `*Patient:* ${profile?.full_name || user?.email || "Patient"}`,
      `*Issue:* ${issue}`,
      summary?.duration ? `*Duration:* ${summary.duration}` : "",
      summary && summary.pain > 0 ? `*Pain:* ${summary.pain}/10` : "",
      summary && !summary.canEat ? `*Trouble eating:* Yes` : "",
      `*Allergies:* ${profile?.allergies?.trim() || "None reported"}`,
      `*Medications:* ${profile?.medications?.trim() || "None reported"}`,
      ``,
      `I'd like to book an appointment. Please let me know the available times.`,
    ].filter((l, i, a) => l !== "" || a[i - 1] !== "");

    try {
      await Linking.openURL(`https://wa.me/${waNumber}?text=${encodeURIComponent(lines.join("\n"))}`);
      if (status === "draft") setAndSave("sent");
    } catch {
      Alert.alert("WhatsApp not found", "Install WhatsApp, or copy these details and call the clinic.");
    }
  };

  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; warn?: boolean }[] = [
    { icon: "person", label: "Patient", value: profile?.full_name || user?.email || "Guest" },
    { icon: "medical", label: "Issue", value: issue },
    ...(summary?.duration ? [{ icon: "time" as const, label: "Duration", value: summary.duration }] : []),
    ...(summary && summary.pain > 0 ? [{ icon: "pulse" as const, label: "Pain", value: `${summary.pain} out of 10` }] : []),
    { icon: "warning", label: "Allergies", value: profile?.allergies?.trim() || "None reported", warn: !!profile?.allergies?.trim() },
    { icon: "medkit", label: "Medications", value: profile?.medications?.trim() || "None reported" },
  ];

  const badge =
    status === "confirmed"
      ? { text: "Confirmed by clinic", icon: "checkmark-circle" as const, color: colors.success, bg: colors.successMuted }
      : status === "sent"
      ? { text: "Sent. Waiting for the clinic's reply", icon: "time" as const, color: colors.warning, bg: colors.warningMuted }
      : { text: "Not sent yet", icon: "paper-plane-outline" as const, color: colors.textMuted, bg: colors.surfaceAlt };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={styles.title}>Case card</Text>
            <Text style={styles.sub}>Send this to the clinic so they're ready for you.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(400)} style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={20} color={badge.color} />
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(450)} style={{ marginTop: spacing.md }}>
            <View style={styles.cardWrap}>
              <Gradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cardTop}>
                <Ionicons name="document-text" size={18} color="#FFFFFF" />
                <Text style={styles.cardTopText}>Patient summary</Text>
              </Gradient>
              <View style={styles.cardBody}>
                {rows.map((r, i) => (
                  <View key={r.label} style={[styles.row, i > 0 && styles.rowBorder]}>
                    <Ionicons name={r.icon} size={17} color={r.warn ? colors.danger : colors.textMuted} style={{ marginTop: 2 }} />
                    <Text style={styles.label}>{r.label}</Text>
                    <Text style={[styles.value, r.warn && { color: colors.danger }]}>{r.value}</Text>
                  </View>
                ))}
              </View>
            </View>
            {!profile?.allergies?.trim() && (
              <Text style={styles.nudge} onPress={() => router.push("/dental-profile" as any)}>
                Add your allergies and medications so the clinic sees them. Tap to edit.
              </Text>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(220).duration(450)} style={{ marginTop: spacing.lg }}>
            <Text style={styles.fieldLabel}>Clinic's WhatsApp number</Text>
            <Input icon="logo-whatsapp" placeholder="03XX XXXXXXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={phone.length > 0 && !valid} />
            <Button title="Send via WhatsApp" icon="paper-plane" onPress={send} disabled={!valid} style={{ marginTop: spacing.md }} />

            {status === "sent" && (
              <Button title="The clinic confirmed my slot" icon="checkmark-circle-outline" variant="soft" onPress={() => setAndSave("confirmed")} style={{ marginTop: spacing.sm }} />
            )}
            {status === "confirmed" && (
              <Button title="View appointment" icon="calendar" variant="soft" onPress={() => router.replace("/appointment")} style={{ marginTop: spacing.sm }} />
            )}
            {status !== "draft" && (
              <Button title="Start over" variant="ghost" onPress={() => setAndSave("draft")} style={{ marginTop: spacing.xs }} />
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    title: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.8 },
    sub: { ...type.body, color: colors.textMuted, marginTop: 4 },
    badge: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.lg },
    badgeText: { flex: 1, fontSize: 14.5, fontWeight: "700" },
    cardWrap: { borderRadius: radius.xl, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12 },
    cardTopText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.3 },
    cardBody: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
    row: { flexDirection: "row", gap: spacing.sm, paddingVertical: 13 },
    rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    label: { width: 92, fontSize: 14, fontWeight: "600", color: colors.textMuted },
    value: { flex: 1, fontSize: 14.5, fontWeight: "600", color: colors.text },
    nudge: { ...type.caption, color: colors.accentStrong, marginTop: spacing.sm, textAlign: "center", fontWeight: "700" },
    fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted, marginBottom: spacing.sm },
  });