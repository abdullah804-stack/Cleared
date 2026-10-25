// app/plan.tsx
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import Animated, { FadeInDown, FadeInUp, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { colors, radius, spacing } from "../constants/theme";
import { useAgent } from "../hooks/useAgent";
import { writeAudit } from "../shared/audit";
import { useAuth } from "../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

const TOOL_ICONS: Record<string, any> = {
  analyze_symptoms: "pulse",
  search_dentists: "search",
  check_availability: "calendar",
  book_appointment: "checkmark-circle",
  prepare_visit_checklist: "list",
  schedule_reminder: "notifications",
};

export default function PlanScreen() {
  const { request } = useLocalSearchParams<{ request: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id || "demo-user-123";
  
  const [triageResult, setTriageResult] = useState<any>(null);

  const { state, plan, approve, reject, skip, retry, executeCurrent, removeStep } = useAgent({
    planEndpoint: "https://gevnakyvjxvnzasruzwh.supabase.co/functions/v1/plan",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdldm5ha3l2anh2bnphc3J1endoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MjE5MzAsImV4cCI6MjEwODM5NzkzMH0.6bYEiX5yEupRDZWJfhI2_VVPYbxJSVErCzTvv1hytfU",
    userId,
    userEmail: user?.email,
    onAudit: async (entry) => {
      await writeAudit(userId, entry.type, entry.description, entry.detail);
    },
  });

  useEffect(() => {
    if (state.status === "COMPLETED" || state.status === "EXECUTING" || state.status === "STEP_FAILED") {
      state.results.forEach((result, index) => {
        if (result.status === "success" && result.output) {
          const step = state.plan[index];
          if (step.tool === "analyze_symptoms" && !triageResult) {
            setTriageResult(JSON.parse(result.output));
          }
        }
      });
    }
  }, [state]);

  useEffect(() => {
    if (state.status === "AWAITING_APPROVAL") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (state.status === "STEP_FAILED") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [state.status]);

  useEffect(() => {
    if (request && state.status === "IDLE") plan(request);
  }, [request, state.status, plan]);

  useEffect(() => {
    if (state.status === "EXECUTING" && "currentIndex" in state) executeCurrent();
  }, [state, executeCurrent]);

  useEffect(() => {
    if (state.status === "COMPLETED") router.replace("/appointment");
  }, [state.status, router]);

  const renderStep = (step: any, index: number) => {
    let statusColor = colors.border;
    let statusText = "Pending";
    let iconColor = colors.textMuted;

    if (state.status === "EXECUTING" || state.status === "STEP_FAILED" || state.status === "COMPLETED") {
      const currentIdx = "currentIndex" in state ? state.currentIndex : state.plan.length;
      if (index < currentIdx) {
        const result = state.results[index];
        if (result?.status === "success") { statusColor = "#10B981"; statusText = "Done"; iconColor = "#10B981"; }
        else if (result?.status === "failure") { statusColor = colors.danger; statusText = "Failed"; iconColor = colors.danger; }
        else if (result?.status === "skipped") { statusColor = "#F59E0B"; statusText = "Skipped"; iconColor = "#F59E0B"; }
      } else if (index === currentIdx) {
        if (state.status === "EXECUTING") { statusColor = colors.accent; statusText = "Running..."; iconColor = colors.accent; }
        else if (state.status === "STEP_FAILED") { statusColor = colors.danger; statusText = "Failed"; iconColor = colors.danger; }
      }
    }

    const isEditing = state.status === "AWAITING_APPROVAL";

    return (
      <Animated.View 
        key={step.id} 
        entering={FadeInDown.delay(index * 100).springify()} 
        style={[styles.stepCard, index === ("currentIndex" in state ? state.currentIndex : -1) && styles.activeCard]}
      >
        <View style={styles.stepHeader}>
          <View style={[styles.iconBox, { backgroundColor: statusColor === colors.border ? colors.background : `${statusColor}15` }]}>
            <Ionicons name={TOOL_ICONS[step.tool] || "build"} size={20} color={iconColor} />
          </View>
          <View style={styles.stepTextContainer}>
            <Text style={styles.stepDescription}>{step.description}</Text>
            <Text style={[styles.stepMeta, { color: iconColor }]}>{statusText}</Text>
            {/* NEW: The "Why" Reasoning */}
            <Text style={styles.stepImpact}>Why: {step.estimatedImpact}</Text>
          </View>
          {isEditing && (
            <Pressable onPress={() => removeStep(step.id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          )}
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
            
            {triageResult && (
              <Animated.View entering={FadeInDown} style={styles.triageCard}>
                <View style={styles.triageHeader}>
                  <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                  <Text style={styles.triageTitle}>Smart Triage</Text>
                </View>
                <Text style={styles.triageUrgency}>Urgency: {triageResult.urgency.toUpperCase()}</Text>
                <Text style={styles.triageNote}>Treatment: {triageResult.treatment_type.replace('_', ' ')}</Text>
              </Animated.View>
            )}

            <Text style={styles.sectionTitle}>{state.status === "AWAITING_APPROVAL" ? "Review Plan (Tap trash to remove)" : "Agent Trace"}</Text>
            <View style={styles.stepsList}>
              {state.plan.map((step, i) => renderStep(step, i))}
            </View>
          </View>
        )}
      </ScrollView>

      <Animated.View entering={FadeInUp.delay(300)} style={styles.footer}>
        {state.status === "AWAITING_APPROVAL" && (
          <View style={styles.row}>
            <Button title="Cancel" variant="ghost" onPress={reject} style={styles.flexButton} />
            <Button title="Approve & Execute" onPress={approve} style={styles.flexButton} />
          </View>
        )}
        {state.status === "EXECUTING" && <Button title="Executing tools..." disabled onPress={() => {}} />}
        
        {/* NEW: Smarter Error Recovery Footer */}
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
  scroll: { flexGrow: 1, paddingBottom: 160 },
  planContainer: { marginTop: spacing.md },
  triageCard: { backgroundColor: "#F0FDF4", borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: "#BBF7D0" },
  triageHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  triageTitle: { fontSize: 18, fontWeight: "700", color: "#166534" },
  triageUrgency: { fontSize: 15, fontWeight: "600", color: "#15803D", marginBottom: 4 },
  triageNote: { fontSize: 14, color: "#166534" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  stepsList: { gap: spacing.sm, marginBottom: spacing.xl },
  stepCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  activeCard: { borderColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.1, elevation: 3 },
  stepHeader: { flexDirection: "row", alignItems: "flex-start" },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  stepTextContainer: { flex: 1 },
  stepDescription: { fontSize: 15, fontWeight: "500", color: colors.text, marginBottom: 4 },
  stepMeta: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", marginBottom: 6 },
  stepImpact: { fontSize: 13, color: colors.textMuted, fontStyle: "italic", lineHeight: 18 },
  deleteBtn: { padding: spacing.xs, marginLeft: spacing.sm },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: "row", gap: spacing.md },
  flexButton: { flex: 1 },
  errorFooter: { gap: spacing.sm }
});