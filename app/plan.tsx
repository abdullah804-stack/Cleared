// app/plan.tsx
import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View, ScrollView, Pressable, Switch, Linking, TextInput, Alert } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { colors, radius, spacing } from "../constants/theme";
import { useAgent } from "../hooks/useAgent";
import { writeAudit } from "../shared/audit";
import { useAuth } from "../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function PlanScreen() {
  const { request } = useLocalSearchParams<{ request: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id || "demo-user-123";
  
  const [stepByStep, setStepByStep] = useState(false);
  const [modification, setModification] = useState("");

  const { state, plan, approve, reject, skip, retry, resume, executeCurrent, removeStep } = useAgent({
    planEndpoint: "https://gevnakyvjxvnzasruzwh.supabase.co/functions/v1/plan",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdldm5ha3l2anh2bnphc3J1endoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MjE5MzAsImV4cCI6MjEwODM5NzkzMH0.6bYEiX5yEupRDZWJfhI2_VVPYbxJSVErCzTvv1hytfU",
    userId, userEmail: user?.email,
    onAudit: async (entry: any) => await writeAudit(userId, entry.type, entry.description, entry.detail),
  });

  useEffect(() => {
    if (request && state.status === "IDLE") plan(request);
  }, [request, state.status, plan]);

  useEffect(() => {
    if (state.status === "EXECUTING" && "currentIndex" in state) executeCurrent();
  }, [state, executeCurrent]);

  useEffect(() => {
    if (state.status === "COMPLETED") router.replace("/appointment");
  }, [state.status, router]);

  const handleModify = () => {
    if (!modification.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Re-trigger the AI with the new modification request
    plan(`The user wants to modify the previous plan. Modification request: "${modification}". Original request was: "${request}"`);
    setModification("");
  };

  // We extract the pain level from the enriched prompt
  const painMatch = request?.match(/Pain Level: (\d+)\/10/);
  const painLevel = painMatch ? parseInt(painMatch[1]) : 0;

  const renderStep = (step: any, index: number) => {
    let statusColor = colors.border; let statusText = "Pending"; let iconColor = colors.textMuted;

    if (state.status === "EXECUTING" || state.status === "STEP_FAILED" || state.status === "COMPLETED") {
      const currentIdx = "currentIndex" in state ? state.currentIndex : state.plan.length;
      if (index < currentIdx) {
        const result = state.results[index];
        if (result?.status === "success") { statusColor = "#10B981"; statusText = "Done"; iconColor = "#10B981"; }
        else if (result?.status === "failure") { statusColor = colors.danger; statusText = "Failed"; iconColor = colors.danger; }
      } else if (index === currentIdx) {
        if (state.status === "EXECUTING") { statusColor = colors.accent; statusText = "Running..."; iconColor = colors.accent; }
        if (state.status === "STEP_FAILED") { statusColor = colors.danger; statusText = "Failed"; iconColor = colors.danger; }
      }
    }

    return (
      <Animated.View key={step.id} entering={FadeInDown.delay(index * 100).springify()} style={[styles.stepCard, index === ("currentIndex" in state ? state.currentIndex : -1) && styles.activeCard]}>
        <View style={styles.stepHeader}>
          <View style={[styles.iconBox, { backgroundColor: statusColor === colors.border ? colors.background : `${statusColor}15` }]}>
            <Ionicons name="medical" size={20} color={iconColor} />
          </View>
          <View style={styles.stepTextContainer}>
            <Text style={styles.stepDescription}>{step.description}</Text>
            <Text style={[styles.stepMeta, { color: iconColor }]}>{statusText}</Text>
            <Text style={styles.stepImpact}>Why: {step.estimatedImpact}</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        {state.status === "PLANNING" && <SkeletonLoader />}

        {(state.status === "AWAITING_APPROVAL" || state.status === "EXECUTING" || state.status === "STEP_FAILED" || state.status === "COMPLETED") && (
          <View style={styles.planContainer}>
            
            {/* REAL URGENCY CARD */}
            {state.status === "AWAITING_APPROVAL" && (
              <Animated.View entering={FadeInDown} style={[styles.urgencyCard, { backgroundColor: painLevel >= 8 ? "#FEF2F2" : "#F0FDF4" }]}>
                <View style={styles.urgencyHeader}>
                  <Ionicons name={painLevel >= 8 ? "warning" : "checkmark-circle"} size={24} color={painLevel >= 8 ? "#EF4444" : "#10B981"} />
                  <Text style={[styles.urgencyTitle, { color: painLevel >= 8 ? "#991B1B" : "#166534" }]}>
                    {painLevel >= 8 ? "Urgent: See a dentist within 48 hours" : "Routine Care"}
                  </Text>
                </View>
                <Text style={[styles.urgencyText, { color: painLevel >= 8 ? "#991B1B" : "#166534" }]}>
                  Based on your triage (Pain Level: {painLevel}/10), this is the recommended timeframe.
                </Text>
              </Animated.View>
            )}

            {/* COST FORECAST */}
            {state.status === "AWAITING_APPROVAL" && (
              <Animated.View entering={FadeInDown.delay(100)} style={styles.forecastCard}>
                <Text style={styles.forecastTitle}>Estimated Cost Forecast</Text>
                <Text style={styles.forecastAmount}>Rs 3,500 - 8,000</Text>
                <Text style={styles.forecastSub}>Consultation + likely treatment (Filling)</Text>
              </Animated.View>
            )}

            {/* PLAN OPTIONS (Cheapest / Fastest / Closest) */}
            {state.status === "AWAITING_APPROVAL" && (
              <Animated.View entering={FadeInDown.delay(200)}>
                <Text style={styles.sectionTitle}>Plan Options</Text>
                <View style={styles.optionsRow}>
                  <Pressable style={[styles.optionBtn, { backgroundColor: "#E0F2FE" }]}><Text style={styles.optionText}>Cheapest</Text></Pressable>
                  <Pressable style={[styles.optionBtn, { backgroundColor: "#FCE7F3" }]}><Text style={styles.optionText}>Fastest</Text></Pressable>
                  <Pressable style={[styles.optionBtn, { backgroundColor: "#DCFCE7" }]}><Text style={styles.optionText}>Closest</Text></Pressable>
                </View>
              </Animated.View>
            )}

            <Text style={styles.sectionTitle}>Agent Trace</Text>
            <View style={styles.stepsList}>
              {state.plan.map((step, i) => renderStep(step, i))}
            </View>

            {/* TYPE TO MODIFY */}
            {state.status === "AWAITING_APPROVAL" && (
              <View style={styles.modifyContainer}>
                <TextInput
                  style={styles.modifyInput}
                  placeholder='e.g. "make it cheaper" or "evenings only"'
                  placeholderTextColor={colors.textMuted}
                  value={modification}
                  onChangeText={setModification}
                />
                <Pressable style={styles.modifyBtn} onPress={handleModify}>
                  <Ionicons name="arrow-up" size={20} color="#FFF" />
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Animated.View entering={FadeInUp.delay(300)} style={styles.footer}>
        {state.status === "AWAITING_APPROVAL" && (
          <View style={styles.row}>
            <Button title="Cancel" variant="ghost" onPress={reject} style={styles.flexButton} />
            <Button title="Approve & Execute" onPress={() => approve(stepByStep)} style={styles.flexButton} />
          </View>
        )}
        {state.status === "EXECUTING" && <Button title="Executing..." disabled onPress={() => {}} />}
        {state.status === "STEP_FAILED" && (
          <View style={styles.errorFooter}>
            <View style={styles.row}>
              <Button title="Abort" variant="danger" onPress={() => router.back()} style={styles.flexButton} />
              <Button title="Retry Step" onPress={retry} style={styles.flexButton} />
            </View>
            <Button title="Skip & Continue" variant="ghost" onPress={skip} style={{ marginTop: spacing.sm }} />
          </View>
        )}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 180 },
  planContainer: { marginTop: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md, marginTop: spacing.md },
  
  urgencyCard: { padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  urgencyHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  urgencyTitle: { fontSize: 18, fontWeight: "800" },
  urgencyText: { fontSize: 14, lineHeight: 20 },

  forecastCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, alignItems: "center" },
  forecastTitle: { fontSize: 14, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.xs },
  forecastAmount: { fontSize: 28, fontWeight: "800", color: colors.text, marginBottom: 4 },
  forecastSub: { fontSize: 12, color: colors.textMuted },

  optionsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  optionBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.full, alignItems: "center" },
  optionText: { fontSize: 14, fontWeight: "700", color: colors.text },

  stepsList: { gap: spacing.sm },
  stepCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  activeCard: { borderColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.1, elevation: 3 },
  stepHeader: { flexDirection: "row", alignItems: "flex-start" },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  stepTextContainer: { flex: 1 },
  stepDescription: { fontSize: 15, fontWeight: "500", color: colors.text, marginBottom: 4 },
  stepMeta: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", marginBottom: 6 },
  stepImpact: { fontSize: 13, color: colors.textMuted, fontStyle: "italic", lineHeight: 18, marginBottom: spacing.sm },

  modifyContainer: { flexDirection: "row", alignItems: "center", marginTop: spacing.xl, backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  modifyInput: { flex: 1, fontSize: 15, color: colors.text, paddingHorizontal: spacing.md },
  modifyBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, paddingBottom: 32, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: "row", gap: spacing.md },
  flexButton: { flex: 1 },
  errorFooter: { gap: spacing.sm }
});