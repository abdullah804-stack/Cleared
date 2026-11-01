// app/visit-notes.tsx
import { useState } from "react";
import { StyleSheet, Text, View, TextInput, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function VisitNotesScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    if (!notes.trim()) return Alert.alert("Error", "Please enter some notes.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved", "Your visit notes have been saved to your history.", [
      { text: "OK", onPress: () => router.replace("/") }
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Visit Notes</Text>
          <Text style={styles.subtitle}>What did the dentist say today?</Text>
        </View>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Dentist said I need a root canal next month. Prescribed antibiotics for 5 days."
            placeholderTextColor={colors.textMuted}
            multiline
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
        </View>

        <Button title="Save to History" onPress={handleSave} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.xl },
  input: { fontSize: 16, color: colors.text, minHeight: 150, lineHeight: 24 },
});