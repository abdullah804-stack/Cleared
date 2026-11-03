// app/family-profiles.tsx
// Names of family members you manage care for. Stored on this phone only.
import { useCallback, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, { FadeInDown, LinearTransition, ZoomIn } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Gradient } from "../components/Gradient";
import { useThemeColors, ThemeColors, gradients, radius, spacing, type } from "../constants/theme";

const KEY = "family_profiles";
const TINTS = [gradients.brand, ["#7C3AED", "#A78BFA"], ["#EA580C", "#FB923C"], ["#059669", "#34D399"], ["#DB2777", "#F472B6"]] as const;

export default function FamilyProfilesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [profiles, setProfiles] = useState<string[]>([]);
  const [name, setName] = useState("");

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(KEY)
        .then((raw) => {
          const parsed = raw ? JSON.parse(raw) : [];
          setProfiles(Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : []);
        })
        .catch(() => {});
    }, [])
  );

  const persist = async (list: string[]) => {
    setProfiles(list);
    await AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});
  };

  const add = async () => {
    const clean = name.trim();
    if (!clean) return;
    if (profiles.some((p) => p.toLowerCase() === clean.toLowerCase())) {
      Alert.alert("Already added", `${clean} is already in your family list.`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setName("");
    await persist([...profiles, clean]);
  };

  const remove = (target: string) => {
    Alert.alert("Remove profile", `Remove ${target} from your family?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => persist(profiles.filter((p) => p !== target)) },
    ]);
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={styles.title}>Family</Text>
            <Text style={styles.sub}>Keep track of dental care for the people you look after.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <Card style={{ marginTop: spacing.lg }}>
              <Text style={styles.cardTitle}>Add a family member</Text>
              <Input icon="person-add-outline" placeholder="e.g. Sarah (daughter)" value={name} onChangeText={setName} returnKeyType="done" onSubmitEditing={add} maxLength={40} />
              <Button title="Add" icon="add" onPress={add} disabled={!name.trim()} style={{ marginTop: spacing.md }} />
            </Card>
          </Animated.View>

          <Text style={styles.section}>Your family ({profiles.length})</Text>
          {profiles.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={30} color={colors.accentStrong} />
              </View>
              <Text style={styles.emptyTitle}>No one added yet</Text>
              <Text style={styles.emptyText}>Add a parent, partner or child to keep their names handy.</Text>
            </Animated.View>
          ) : (
            profiles.map((p, i) => (
              <Animated.View key={p} entering={ZoomIn.delay(i * 40).springify().damping(16)} layout={LinearTransition} style={{ marginBottom: spacing.sm }}>
                <Card style={styles.person}>
                  <Gradient colors={[...TINTS[i % TINTS.length]]} style={styles.avatar}>
                    <Text style={styles.avatarText}>{p.charAt(0).toUpperCase()}</Text>
                  </Gradient>
                  <Text style={styles.personName} numberOfLines={1}>{p}</Text>
                  <Pressable onPress={() => remove(p)} hitSlop={10} style={styles.del} accessibilityRole="button" accessibilityLabel={`Remove ${p}`}>
                    <Ionicons name="trash-outline" size={19} color={colors.danger} />
                  </Pressable>
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
    title: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.8 },
    sub: { ...type.body, color: colors.textMuted, marginTop: 4 },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
    section: { ...type.overline, color: colors.textMuted, marginTop: spacing.xl, marginBottom: spacing.md },
    person: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
    personName: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
    del: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.dangerMuted },
    empty: { alignItems: "center", paddingVertical: spacing.xl },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentMuted, marginBottom: spacing.md },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    emptyText: { ...type.body, color: colors.textMuted, textAlign: "center", marginTop: 4, paddingHorizontal: spacing.lg },
  });