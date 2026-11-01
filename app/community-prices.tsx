// app/community-prices.tsx
import { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, TextInput, Pressable, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { supabase } from "../contexts/AuthContext";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function CommunityPricesScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [treatment, setTreatment] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");

  const fetchReports = async () => {
    // We will assume a table called "price_reports" exists in Supabase
    const { data } = await supabase.from("price_reports").select("*").order("created_at", { ascending: false }).limit(20);
    if (data) setReports(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSubmit = async () => {
    if (!treatment || !price || !city) return Alert.alert("Error", "Please fill all fields.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    await supabase.from("price_reports").insert({
      treatment,
      price: parseInt(price),
      city,
    });
    
    Alert.alert("Thank you!", "Your anonymous report helps others save money.");
    setTreatment(""); setPrice(""); setCity("");
    fetchReports();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Community Prices</Text>
          <Text style={styles.subtitle}>Anonymous reports from real patients in Pakistan.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Report a Price You Paid</Text>
          <TextInput style={styles.input} placeholder="Treatment (e.g. Root Canal)" placeholderTextColor={colors.textMuted} value={treatment} onChangeText={setTreatment} />
          <TextInput style={styles.input} placeholder="Price (PKR)" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={price} onChangeText={setPrice} />
          <TextInput style={styles.input} placeholder="City (e.g. Lahore)" placeholderTextColor={colors.textMuted} value={city} onChangeText={setCity} />
          <Button title="Submit Anonymous Report" onPress={handleSubmit} style={{ marginTop: spacing.md }} />
        </View>

        <Text style={styles.sectionTitle}>Recent Reports</Text>
        {loading ? <ActivityIndicator color={colors.accent} /> : (
          <View style={styles.list}>
            {reports.length === 0 && <Text style={styles.emptyText}>No reports yet. Be the first!</Text>}
            {reports.map((report, i) => (
              <View key={i} style={styles.reportRow}>
                <View style={styles.reportLeft}>
                  <Text style={styles.reportTreatment}>{report.treatment}</Text>
                  <Text style={styles.reportCity}>{report.city}</Text>
                </View>
                <Text style={styles.reportPrice}>Rs {report.price}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  cardTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.md, fontSize: 16, color: colors.text },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  list: { gap: spacing.sm },
  reportRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  reportLeft: { flex: 1 },
  reportTreatment: { fontSize: 16, fontWeight: "600", color: colors.text },
  reportCity: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  reportPrice: { fontSize: 16, fontWeight: "800", color: colors.accent },
  emptyText: { color: colors.textMuted, fontStyle: "italic" },
});