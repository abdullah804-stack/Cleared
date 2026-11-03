// app/community-prices.tsx
// Anonymous price reports from other patients. Reads only the safe columns (see supabase/price_reports.sql).
import { useCallback, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { useThemeColors, ThemeColors, radius, spacing, type } from "../constants/theme";
import { CURRENCIES, formatMoney } from "../constants/pricing";
import { supabase } from "../contexts/AuthContext";

type Report = { id: string; treatment: string; price: number; city: string; created_at: string };

const TREATMENTS = ["Scaling & polishing", "Filling", "Root canal", "Extraction", "Crown", "Whitening", "Braces"];
const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Peshawar", "Faisalabad", "Multan"];
const PKR = CURRENCIES.PKR;

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

const ago = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

export default function CommunityPricesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [treatment, setTreatment] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("price_reports")
      .select("id, treatment, price, city, created_at") // never select("*"): the reporter id is hidden from the app
      .order("created_at", { ascending: false })
      .limit(60);
    setFailed(!!error);
    if (data) setReports(data as Report[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const priceNum = parseInt(price.replace(/[^0-9]/g, ""), 10);
  const valid = treatment.trim().length >= 2 && city.trim().length >= 2 && priceNum >= 100 && priceNum <= 2000000;

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from("price_reports").insert({ treatment: treatment.trim(), price: priceNum, city: city.trim() });
    setSubmitting(false);
    if (error) {
      Alert.alert("Couldn't submit", /limit/i.test(error.message) ? "You've reached today's limit of 5 reports. Thank you!" : "Please check your internet and try again.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert("Thank you!", "Your anonymous report helps others know what's fair.");
    setTreatment("");
    setPrice("");
    setCity("");
    load();
  };

  // Typical price per treatment, only when there are at least 2 reports (one number proves nothing).
  const typical = useMemo(() => {
    const groups = new Map<string, number[]>();
    reports.forEach((r) => {
      const k = r.treatment.trim().toLowerCase();
      groups.set(k, [...(groups.get(k) ?? []), r.price]);
    });
    return [...groups.entries()]
      .filter(([, v]) => v.length >= 2)
      .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), mid: median(v), n: v.length }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 4);
  }, [reports]);

  const chip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} style={[styles.chip, active && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={[styles.chipText, active && { color: colors.onAccent }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={styles.title}>Community prices</Text>
            <Text style={styles.sub}>What real patients in Pakistan paid. Reports are anonymous.</Text>
          </Animated.View>

          {typical.length > 0 && (
            <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.typicalRow}>
              {typical.map((t) => (
                <View key={t.name} style={styles.typical}>
                  <Text style={styles.typicalPrice}>{formatMoney(t.mid, PKR)}</Text>
                  <Text style={styles.typicalName} numberOfLines={1}>{t.name}</Text>
                  <Text style={styles.typicalN}>typical, {t.n} reports</Text>
                </View>
              ))}
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(120).duration(400)}>
            <Card style={{ marginTop: spacing.lg }}>
              <Text style={styles.cardTitle}>Report a price you paid</Text>
              <View style={styles.chips}>{TREATMENTS.map((t) => chip(t, treatment === t, () => setTreatment(t)))}</View>
              <Input icon="medkit-outline" placeholder="Treatment" value={treatment} onChangeText={setTreatment} maxLength={60} style={{ marginTop: spacing.sm }} />
              <View style={{ height: spacing.sm }} />
              <Input icon="cash-outline" placeholder="Price in Rs" value={price} onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" maxLength={7} />
              <View style={styles.chips}>{CITIES.map((c) => chip(c, city === c, () => setCity(c)))}</View>
              <Input icon="location-outline" placeholder="City" value={city} onChangeText={setCity} maxLength={40} style={{ marginTop: spacing.sm }} />
              <Button title="Submit anonymously" icon="send" onPress={submit} loading={submitting} disabled={!valid} style={{ marginTop: spacing.md }} />
            </Card>
          </Animated.View>

          <Text style={styles.section}>Recent reports</Text>
          {loading ? null : failed && reports.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cloud-offline-outline" size={30} color={colors.textMuted} />
              <Text style={styles.emptyText}>Couldn't load reports. Pull down to retry.</Text>
            </View>
          ) : reports.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="pricetags-outline" size={30} color={colors.textMuted} />
              <Text style={styles.emptyText}>No reports yet. Be the first to add one.</Text>
            </View>
          ) : (
            reports.map((r, i) => (
              <Animated.View key={r.id} entering={FadeInDown.delay(Math.min(i, 8) * 40).duration(350)} layout={LinearTransition} style={{ marginBottom: spacing.sm }}>
                <Card style={styles.report}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rTreatment} numberOfLines={1}>{r.treatment}</Text>
                    <Text style={styles.rMeta}>{r.city} · {ago(r.created_at)}</Text>
                  </View>
                  <Text style={styles.rPrice}>{formatMoney(r.price, PKR)}</Text>
                </Card>
              </Animated.View>
            ))
          )}
          <Text style={styles.disclaimer}>Prices are user-reported and unverified. Always confirm with the clinic.</Text>
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
    typicalRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
    typical: { width: "48.5%", padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.accentMuted },
    typicalPrice: { fontSize: 19, fontWeight: "800", color: colors.accentStrong, letterSpacing: -0.4 },
    typicalName: { fontSize: 13.5, fontWeight: "700", color: colors.text, marginTop: 2 },
    typicalN: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
    cardTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
    chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { fontSize: 12.5, fontWeight: "600", color: colors.text },
    section: { ...type.overline, color: colors.textMuted, marginTop: spacing.xl, marginBottom: spacing.md },
    report: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    rTreatment: { fontSize: 15.5, fontWeight: "700", color: colors.text },
    rMeta: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
    rPrice: { fontSize: 16, fontWeight: "800", color: colors.accentStrong },
    empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
    emptyText: { ...type.body, color: colors.textMuted, textAlign: "center" },
    disclaimer: { ...type.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
  });