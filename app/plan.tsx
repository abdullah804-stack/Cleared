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
  const [checklist, setChecklist] = useState<string[]>([]);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const { state, plan, approve, reject, skip, executeCurrent } = useAgent({
    planEndpoint: "https://gevnakyvjxvnzasruzwh.supabase.co/functions/v1/plan",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdldm5ha3l2anh2bnphc3J1endoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MjE5MzAsImV4cCI6MjEwODM5NzkzMH0.6bYEiX5yEupRDZWJfhI2_VVPYbxJSVErCzTvv1hytfU",
    userId,
    onAudit: async (entry) => {
      await writeAudit(userId, entry.type, entry.description, entry.detail);
    },
  });

  // Extract outputs from the tools as they succeed
  useEffect(() => {
    if (state.status === "COMPLETED" || state.status === "EXECUTING" || state.status === "STEP_FAILED") {
      state.results.forEach((result, index) => {
        if (result.status === "success" && result.output) {
          const step = state.plan[index];
          if (step.tool === "analyze_symptoms" && !triageResult) {
            setTriageResult(JSON.parse(result.output));
          }
          if (step.tool === "prepare_visit_checklist" && checklist.length === 0) {
            setChecklist(JSON.parse(result.output));
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
            
            {/* MAGIC FEATURE 1: TRIAGE CARD */}
            {triageResult && (
              <Animated.View entering={FadeInDown} style={styles.triageCard}>
                <View style={styles.triageHeader}>
                  <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                  <Text style={styles.triageTitle}>Smart Triage</Text>
                </View>
                <Text style={styles.triageUrgency}>Urgency: {triageResult.urgency.toUpperCase()}</Text>
                <Text style={styles.triageNote}>Treatment: {triageResult.treatment_type.replace('_', ' ')}</Text>
                <View style={styles.disclaimerBadge}>
                  <Text style={styles.disclaimerText}>AI suggestive only · Not medical advice</Text>
                </View>
              </Animated.View>
            )}

            <Text style={styles.sectionTitle}>Agent Trace</Text>
            <View style={styles.stepsList}>
              {state.plan.map((step, i) => renderStep(step, i))}
            </View>

            {/* MAGIC FEATURE 2: INTERACTIVE CHECKLIST */}
            {checklist.length > 0 && (
              <Animated.View entering={FadeInUp.delay(300)} style={styles.checklistContainer}>
                <Text style={styles.sectionTitle}>Pre-Visit Checklist</Text>
                <View style={styles.checklistCard}>
                  {checklist.map((item, idx) => (
                    <Pressable 
                      key={idx} 
                      style={styles.checkItem}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
                      }}
                    >
                      <Ionicons 
                        name={checkedItems[idx] ? "checkbox" : "square-outline"} 
                        size={24} 
                        color={checkedItems[idx] ? colors.accent : colors.border} 
                      />
                      <Text style={[styles.checkText, checkedItems[idx] && styles.checkTextDone]}>
                        {item}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            )}
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
        {state.status === "STEP_FAILED" && (
          <View style={styles.row}>
            <Button title="Abort" variant="danger" onPress={() => router.back()} style={styles.flexButton} />
            <Button title="Skip & Continue" onPress={skip} style={styles.flexButton} />
          </View>
        )}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 120 },
  planContainer: { marginTop: spacing.md },
  
  triageCard: { backgroundColor: "#F0FDF4", borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: "#BBF7D0" },
  triageHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  triageTitle: { fontSize: 18, fontWeight: "700", color: "#166534" },
  triageUrgency: { fontSize: 15, fontWeight: "600", color: "#15803D", marginBottom: 4 },
  triageNote: { fontSize: 14, color: "#166534", marginBottom: spacing.md },
  disclaimerBadge: { backgroundColor: "#DCFCE7", paddingVertical: 4, paddingHorizontal: 8, borderRadius: radius.sm, alignSelf: "flex-start" },
  disclaimerText: { fontSize: 11, color: "#166534", fontWeight: "600" },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  stepsList: { gap: spacing.sm, marginBottom: spacing.xl },
  
  stepCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  activeCard: { borderColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.1, elevation: 3 },
  stepHeader: { flexDirection: "row", alignItems: "center" },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  stepTextContainer: { flex: 1 },
  stepDescription: { fontSize: 15, fontWeight: "500", color: colors.text, marginBottom: 4 },
  stepMeta: { fontSize: 12, fontWeight: "600", textTransform: "uppercase" },

  checklistContainer: { marginTop: spacing.md },
  checklistCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md },
  checkItem: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  checkText: { fontSize: 15, color: colors.text, fontWeight: "500" },
  checkTextDone: { textDecorationLine: "line-through", color: colors.textMuted },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: "row", gap: spacing.md },
  flexButton: { flex: 1 },
});