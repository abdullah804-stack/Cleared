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
import { Avatar, AVATAR_COUNT, AVATAR_NAMES, avatarFromText } from "../components/Avatar";
import { useThemeColors, ThemeColors, radius, spacing, type } from "../constants/theme";

const KEY = "family_profiles";
type Member = { name: string; avatar: number };

export default function FamilyProfilesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [profiles, setProfiles] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [pick, setPick] = useState(1);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(KEY)
        .then((raw) => {
          const parsed = raw ? JSON.parse(raw) : [];
          // Older versions stored plain names; give those an avatar too.
          const list: Member[] = (Array.isArray(parsed) ? parsed : [])
            .map((p: any) => (typeof p === "string" ? { name: p, avatar: avatarFromText(p) } : { name: String(p?.name ?? ""), avatar: Number(p?.avatar) || 0 }))
            .filter((m: Member) => m.name);
          setProfiles(list);
        })
        .catch(() => {});
    }, [])
  );

  const persist = async (list: Member[]) => {
    setProfiles(list);
    await AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});
  };

  const add = async () => {
    const clean = name.trim();
    if (!clean) return;
    if (profiles.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
      Alert.alert("Already added", `${clean} is already in your family list.`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setName("");
    await persist([...profiles, { name: clean, avatar: pick }]);
    setPick((pick + 1) % AVATAR_COUNT);
  };

  const remove = (target: string) => {
    Alert.alert("Remove profile", `Remove ${target} from your family?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => persist(profiles.filter((p) => p.name !== target)) },
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
              <Text style={styles.pickLabel}>Pick an avatar</Text>
              <View style={styles.picks}>
                {Array.from({ length: AVATAR_COUNT }, (_, i) => (
                  <Pressable key={i} onPress={() => setPick(i)} accessibilityRole="button" accessibilityState={{ selected: pick === i }} accessibilityLabel={`Avatar ${AVATAR_NAMES[i]}`} style={{ padding: 3 }}>
                    <Avatar id={i} size={46} selected={pick === i} />
                  </Pressable>
                ))}
              </View>
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
              <Animated.View key={p.name} entering={ZoomIn.delay(i * 40).springify().damping(16)} layout={LinearTransition} style={{ marginBottom: spacing.sm }}>
                <Card style={styles.person}>
                  <Avatar id={p.avatar} size={50} ring />
                  <Text style={styles.personName} numberOfLines={1}>{p.name}</Text>
                  <Pressable onPress={() => remove(p.name)} hitSlop={10} style={styles.del} accessibilityRole="button" accessibilityLabel={`Remove ${p.name}`}>
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
    pickLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted, marginBottom: spacing.sm },
    picks: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
    personName: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
    del: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.dangerMuted },
    empty: { alignItems: "center", paddingVertical: spacing.xl },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentMuted, marginBottom: spacing.md },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    emptyText: { ...type.body, color: colors.textMuted, textAlign: "center", marginTop: 4, paddingHorizontal: spacing.lg },
  });