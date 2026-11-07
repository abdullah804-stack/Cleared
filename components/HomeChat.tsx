// components/HomeChat.tsx
// Chat entry on the home screen: a friendly preview, quick questions and an input that opens the full chat.
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { tick } from "../utils/haptics";
import { Card } from "./Card";
import { useThemeColors, ThemeColors, glow, radius, spacing } from "../constants/theme";

const QUICK = ["Is a toothache normal after a filling?", "How do I ease swelling?", "What happens in a root canal?", "Can I eat after an extraction?"];

export function HomeChat() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [text, setText] = useState("");

  const open = (q?: string) => {
    tick();
    const question = (q ?? text).trim();
    setText("");
    router.push({ pathname: "/chat", params: question ? { q: question } : undefined } as never);
  };

  return (
    <Card padded={false} style={[styles.card, glow(colors.accent, 0.2)]}>
      <View style={styles.head}>
        <View style={[styles.avatarWrap, glow(colors.accent, 0.6)]}>
          <Image source={require("../assets/images/assistant.png")} style={styles.avatar} />
          <View style={styles.online} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Ask Cleared AI</Text>
          <Text style={styles.sub}>Online · answers in seconds</Text>
        </View>
        <Pressable onPress={() => open()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Open full chat">
          <Ionicons name="expand" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>Hi! Ask me anything about your teeth, a procedure or your recovery. I'm an AI, not a doctor.</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
        {QUICK.map((q) => (
          <Pressable key={q} onPress={() => open(q)} style={styles.chip} accessibilityRole="button">
            <Text style={styles.chipText}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type your question..."
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
          value={text}
          onChangeText={setText}
          returnKeyType="send"
          onSubmitEditing={() => open()}
        />
        <Pressable onPress={() => open()} style={[styles.send, glow(colors.accent, 0.6)]} accessibilityRole="button" accessibilityLabel="Send">
          <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
        </Pressable>
      </View>
    </Card>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: { borderColor: "rgba(34,211,238,0.3)" },
    head: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, paddingBottom: spacing.sm },
    avatarWrap: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: colors.accent },
    avatar: { width: "100%", height: "100%", borderRadius: 23 },
    online: { position: "absolute", right: -1, bottom: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surface },
    title: { fontSize: 17, fontWeight: "800", color: colors.text },
    sub: { fontSize: 12.5, color: colors.success, marginTop: 1 },
    bubble: { marginHorizontal: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderTopLeftRadius: 6, backgroundColor: colors.surfaceAlt },
    bubbleText: { fontSize: 14.5, lineHeight: 21, color: colors.text },
    chips: { gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.sm },
    chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1, borderColor: "rgba(34,211,238,0.35)", backgroundColor: colors.accentMuted },
    chipText: { fontSize: 13, fontWeight: "600", color: colors.accentStrong },
    inputRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, paddingTop: spacing.xs },
    input: { flex: 1, height: 46, paddingHorizontal: 16, borderRadius: 23, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, fontSize: 15, color: colors.text },
    send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  });