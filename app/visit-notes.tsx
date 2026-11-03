// app/visit-notes.tsx
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown, FadeOut, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useThemeColors, ThemeColors, motion, radius, spacing, type } from "../constants/theme";

interface Note {
  id: string;
  text: string;
  date: string; // ISO
  clinic?: string;
}

const KEY = "visit_notes";
const MAX_CHARS = 1000;
const QUICK = ["Follow-up needed", "Medicine prescribed", "Treatment advised", "All clear"];

async function readNotes(): Promise<Note[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function currentClinic(): Promise<string | undefined> {
  try {
    const raw = await AsyncStorage.getItem("current_booking");
    return raw ? JSON.parse(raw)?.clinic?.name : undefined;
  } catch {
    return undefined;
  }
}

export default function VisitNotesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focus = useSharedValue(0);
  const box = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.border, colors.accent]),
    backgroundColor: interpolateColor(focus.value, [0, 1], [colors.surfaceAlt, colors.surface]),
  }));

  useFocusEffect(
    useCallback(() => {
      readNotes().then(setNotes);
    }, [])
  );

  const toggleQuick = (phrase: string) => {
    Haptics.selectionAsync().catch(() => {});
    setText((t) => {
      if (t.includes(phrase)) return t.replace(`${phrase}. `, "").replace(phrase, "").trim();
      return `${t}${t && !/\s$/.test(t) ? " " : ""}${phrase}. `.slice(0, MAX_CHARS);
    });
  };

  const save = async () => {
    const clean = text.trim();
    if (!clean) return;
    const note: Note = {
      id: `${Date.now()}`,
      text: clean.slice(0, MAX_CHARS),
      date: new Date().toISOString(),
      clinic: await currentClinic(),
    };
    const next = [note, ...notes].slice(0, 100);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      return Alert.alert("Couldn't save", "Your phone's storage didn't accept the note. Please try again.");
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setNotes(next);
    setText("");
    setJustSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setJustSaved(false), 3500);
  };

  const remove = (id: string) => {
    Alert.alert("Delete this note?", "This removes it from your phone.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const next = notes.filter((n) => n.id !== id);
          setNotes(next);
          await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
        },
      },
    ]);
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(450)}>
            <Text style={styles.title}>What did the dentist say?</Text>
            <Text style={styles.subtitle}>Write it down while it's fresh. Stored only on this phone.</Text>
          </Animated.View>

          {/* Composer */}
          <Animated.View entering={FadeInDown.delay(80).duration(450)}>
            <Card style={{ marginTop: spacing.lg }}>
              <Animated.View style={[styles.inputBox, box]}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Needs a root canal next month. Antibiotics for 5 days."
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.accent}
                  multiline
                  maxLength={MAX_CHARS}
                  value={text}
                  onChangeText={setText}
                  onFocus={() => (focus.value = withTiming(1, { duration: motion.fast }))}
                  onBlur={() => (focus.value = withTiming(0, { duration: motion.fast }))}
                  textAlignVertical="top"
                />
                <Text style={styles.counter}>
                  {text.length}/{MAX_CHARS}
                </Text>
              </Animated.View>

              <Text style={styles.quickLabel}>Quick add</Text>
              <View style={styles.quickRow}>
                {QUICK.map((q) => {
                  const on = text.includes(q);
                  return (
                    <Pressable
                      key={q}
                      onPress={() => toggleQuick(q)}
                      style={[styles.quick, on && styles.quickOn]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      {on && <Ionicons name="checkmark" size={13} color={colors.accentStrong} />}
                      <Text style={[styles.quickText, on && { color: colors.accentStrong }]}>{q}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Button title="Save note" icon="bookmark" onPress={save} disabled={!text.trim()} style={{ marginTop: spacing.md }} />
            </Card>
          </Animated.View>

          {justSaved && (
            <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut.duration(250)} style={styles.savedBanner}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.savedText}>Saved to your history.</Text>
              <Pressable onPress={() => router.push("/recovery" as never)} hitSlop={8}>
                <Text style={styles.savedLink}>Start recovery plan</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* History */}
          <Text style={styles.sectionTitle}>History</Text>
          {notes.length === 0 ? (
            <Animated.View entering={FadeIn.delay(200)} style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="document-text-outline" size={28} color={colors.accentStrong} />
              </View>
              <Text style={styles.emptyTitle}>No notes yet</Text>
              <Text style={styles.emptyText}>After a visit, jot down the diagnosis, medicines and what to do next. It helps at your next appointment.</Text>
            </Animated.View>
          ) : (
            notes.map((n, i) => (
              <Animated.View key={n.id} entering={FadeInDown.delay(Math.min(i, 6) * 50).duration(350)} style={{ marginBottom: spacing.sm + 2 }}>
                <Card>
                  <View style={styles.noteHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noteDate}>{fmt(n.date)}</Text>
                      {n.clinic ? <Text style={styles.noteClinic}>{n.clinic}</Text> : null}
                    </View>
                    <Pressable onPress={() => remove(n.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Delete note">
                      <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                  <Text style={styles.noteText}>{n.text}</Text>
                </Card>
              </Animated.View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    title: { ...type.title, fontSize: 24, color: colors.text },
    subtitle: { fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 4 },

    inputBox: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, paddingBottom: spacing.sm },
    input: { fontSize: 16, lineHeight: 24, color: colors.text, minHeight: 130, padding: 0 },
    counter: { ...type.caption, color: colors.textMuted, textAlign: "right", marginTop: 4 },

    quickLabel: { ...type.overline, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm },
    quickRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    quick: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: "transparent",
    },
    quickOn: { backgroundColor: colors.accentMuted, borderColor: colors.accent },
    quickText: { fontSize: 13, fontWeight: "600", color: colors.text },

    savedBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.successMuted,
    },
    savedText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
    savedLink: { fontSize: 13, fontWeight: "700", color: colors.accentStrong },

    sectionTitle: { ...type.title, fontSize: 19, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
    empty: { alignItems: "center", paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
    emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accentMuted, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
    emptyTitle: { ...type.heading, color: colors.text },
    emptyText: { fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: "center", marginTop: 4 },

    noteHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.sm },
    noteDate: { fontSize: 13, fontWeight: "700", color: colors.accentStrong },
    noteClinic: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    noteText: { fontSize: 15, lineHeight: 22, color: colors.text },
  });