// app/index.tsx
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";

const PRESET_CHIPS = [
  { label: "Dentist", text: "find me a dentist open Saturday under $100" },
  { label: "Tooth pain", text: "my tooth hurts when I drink cold water" },
  { label: "Cleaning", text: "book a routine dental cleaning" },
];

export default function HomeScreen() {
  const [input, setInput] = useState("");
  const router = useRouter();

  const handlePlan = () => {
    if (!input.trim()) return;
    router.push({ pathname: "/plan", params: { request: input.trim() } });
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text style={styles.title}>Cleared</Text>
            <Text style={styles.subtitle}>Approve the plan before the AI acts.</Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="e.g. my tooth hurts, find a dentist open Saturday under $100"
              placeholderTextColor={colors.textMuted}
              multiline
              value={input}
              onChangeText={setInput}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.chipsContainer}>
            {PRESET_CHIPS.map((chip) => (
              <Pressable
                key={chip.label}
                style={styles.chip}
                onPress={() => setInput(chip.text)}
              >
                <Text style={styles.chipText}>{chip.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.spacer} />

          <Button
            title="Plan it"
            onPress={handlePlan}
            disabled={!input.trim()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 120,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  chipText: {
    fontSize: 14,
    color: colors.text,
  },
  spacer: {
    flex: 1,
  },
});