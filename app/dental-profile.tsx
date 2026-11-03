// app/dental-profile.tsx
// Medical details a dentist needs. Saved to the user's profile; can be exported as a PDF to hand over.
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useThemeColors, ThemeColors, radius, spacing, type } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");

type FieldProps = {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  tintBg: string;
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
};

export default function DentalProfileScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user, profile, updateProfile } = useAuth() as any;

  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");
  const [pastTreatments, setPastTreatments] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const hydrated = useRef(false);

  // The profile arrives after the screen opens. Fill the fields once it does, but never overwrite what the user is typing.
  useEffect(() => {
    if (!profile || hydrated.current) return;
    hydrated.current = true;
    setAllergies(profile.allergies ?? "");
    setMedications(profile.medications ?? "");
    setPastTreatments(profile.past_treatments ?? "");
  }, [profile]);

  const edit = (setter: (v: string) => void) => (v: string) => {
    setDirty(true);
    setter(v);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ allergies: allergies.trim(), medications: medications.trim(), past_treatments: pastTreatments.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setDirty(false);
      Alert.alert("Saved", "Your dental profile is up to date.");
    } catch {
      Alert.alert("Couldn't save", "Check your internet connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const exportPdf = async () => {
    const block = (title: string, color: string, bg: string, text: string) =>
      `<h3 style="color:${color};margin-bottom:6px">${title}</h3><p style="background:${bg};padding:12px;border-radius:8px;margin-top:0">${text.trim() ? esc(text) : "None reported"}</p>`;
    const html = `<html><body style="font-family:Helvetica,sans-serif;padding:40px;color:#0F172A">
      <h1 style="color:#0369A1;border-bottom:2px solid #0369A1;padding-bottom:10px">Patient Dental Profile</h1>
      <p><strong>Name:</strong> ${esc(profile?.full_name || "N/A")}</p>
      <p><strong>Email:</strong> ${esc(user?.email || "N/A")}</p>
      ${block("Allergies", "#BE123C", "#FFE4E6", allergies)}
      ${block("Current medications", "#0369A1", "#E0F2FE", medications)}
      ${block("Past dental treatments", "#0F766E", "#CCFBF1", pastTreatments)}
      <p style="margin-top:48px;font-size:12px;color:#64748B">Prepared by the patient using the Cleared app. Not a medical record.</p>
    </body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
      else Alert.alert("Saved", "PDF created, but sharing isn't available on this device.");
    } catch {
      Alert.alert("Error", "Could not create the PDF.");
    }
  };

  // A plain function, not a component: an inner component would remount on every keystroke and close the keyboard.
  const renderField = ({ icon, tint, tintBg, label, hint, placeholder, value, onChange }: FieldProps) => (
    <View key={label} style={styles.field}>
      <View style={styles.fieldHead}>
        <View style={[styles.fieldIcon, { backgroundColor: tintBg }]}>
          <Ionicons name={icon} size={16} color={tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.hint}>{hint}</Text>
        </View>
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        value={value}
        onChangeText={onChange}
        multiline
        maxLength={500}
      />
    </View>
  );

  const filled = [allergies, medications, pastTreatments].filter((s) => s.trim()).length;

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={styles.title}>Dental profile</Text>
            <Text style={styles.sub}>Your dentist needs this to treat you safely.</Text>
            <View style={styles.progress}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.seg, i < filled && { backgroundColor: colors.success }]} />
              ))}
            </View>
            <Text style={styles.progressText}>{filled} of 3 sections filled</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <Card style={{ marginTop: spacing.lg }}>
              {renderField({icon: "warning", tint: colors.danger, tintBg: colors.dangerMuted, label: "Allergies", hint: "Medicines, latex, anaesthetic", placeholder: "e.g. Penicillin, latex", value: allergies, onChange: edit(setAllergies),})}
              {renderField({icon: "medkit", tint: colors.accentStrong, tintBg: colors.accentMuted, label: "Current medications", hint: "Including blood thinners and insulin", placeholder: "e.g. Aspirin, insulin", value: medications, onChange: edit(setMedications),})}
              {renderField({icon: "time", tint: colors.success, tintBg: colors.successMuted, label: "Past dental treatments", hint: "Roots, crowns, braces, surgery", placeholder: "e.g. Root canal 2022, braces", value: pastTreatments, onChange: edit(setPastTreatments),})}
              <Button title={dirty ? "Save profile" : "Saved"} icon={dirty ? "save" : "checkmark"} onPress={save} loading={saving} disabled={!dirty} />
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(400)}>
            <Button title="Export as PDF" icon="document-text-outline" variant="soft" onPress={exportPdf} style={{ marginTop: spacing.md }} />
            <Text style={styles.note}>Stored on your account. Delete it any time from Settings, Delete my data.</Text>
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
    progress: { flexDirection: "row", gap: 6, marginTop: spacing.md },
    seg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border },
    progressText: { ...type.caption, color: colors.textMuted, marginTop: 6 },
    field: { marginBottom: spacing.lg },
    fieldHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, marginBottom: spacing.sm },
    fieldIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    label: { fontSize: 15, fontWeight: "700", color: colors.text },
    hint: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    input: { minHeight: 76, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt, fontSize: 15, lineHeight: 21, color: colors.text, textAlignVertical: "top" },
    note: { ...type.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.md },
  });