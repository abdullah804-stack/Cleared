// app/dental-profile.tsx
import { useState } from "react";
import { StyleSheet, Text, View, TextInput, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function DentalProfileScreen() {
  const router = useRouter();
  const { user, profile, updateProfile } = useAuth();
  
  const [allergies, setAllergies] = useState(profile?.allergies || "");
  const [medications, setMedications] = useState(profile?.medications || "");
  const [pastTreatments, setPastTreatments] = useState(profile?.past_treatments || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await updateProfile({
      allergies,
      medications,
      past_treatments: pastTreatments,
    });
    setLoading(false);
    Alert.alert("Saved", "Your dental profile has been updated.");
  };

  const handleExportPDF = async () => {
    const htmlContent = `
      <html>
        <body style="font-family: Helvetica, sans-serif; padding: 40px; color: #0F172A;">
          <h1 style="color: #0EA5E9; border-bottom: 2px solid #0EA5E9; padding-bottom: 10px;">Patient Dental Profile</h1>
          <p><strong>Name:</strong> ${profile?.full_name || "N/A"}</p>
          <p><strong>Email:</strong> ${user?.email}</p>
          <br/>
          <h3 style="color: #F43F5E;">Allergies</h3>
          <p style="background: #FEE2E2; padding: 10px; border-radius: 8px;">${allergies || "None reported"}</p>
          
          <h3 style="color: #0EA5E9;">Current Medications</h3>
          <p style="background: #E0F2FE; padding: 10px; border-radius: 8px;">${medications || "None reported"}</p>
          
          <h3 style="color: #14B8A6;">Past Dental Treatments</h3>
          <p style="background: #CCFBF1; padding: 10px; border-radius: 8px;">${pastTreatments || "None reported"}</p>
          
          <p style="margin-top: 50px; font-size: 12px; color: #64748B;">Generated securely by Cleared App.</p>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert("Error", "Could not generate PDF.");
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Dental Profile</Text>
          <Text style={styles.subtitle}>Keep this updated for your dentist.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Allergies</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Penicillin, Latex"
              placeholderTextColor={colors.textMuted}
              value={allergies}
              onChangeText={setAllergies}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Medications</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Blood thinners, Insulin"
              placeholderTextColor={colors.textMuted}
              value={medications}
              onChangeText={setMedications}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Past Dental Treatments</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Root canal 2022, Braces"
              placeholderTextColor={colors.textMuted}
              value={pastTreatments}
              onChangeText={setPastTreatments}
              multiline
            />
          </View>

          <Button title="Save Profile" onPress={handleSave} loading={loading} style={{ marginTop: spacing.md }} />
        </View>

        <Button 
          title="Export as PDF Summary" 
          variant="ghost" 
          onPress={handleExportPDF} 
          style={{ marginTop: spacing.xl }} 
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
  inputGroup: { marginBottom: spacing.lg },
  label: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text, minHeight: 80, textAlignVertical: "top" },
});