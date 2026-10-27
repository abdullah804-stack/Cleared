// app/plan.tsx
import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View, ScrollView, Pressable, Switch, Linking, Alert, Platform } from "react-native";
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
  
  const [stepByStep, setStepByStep] = useState(false);

  const { state, plan, approve, reject, skip, retry, resume, executeCurrent, removeStep, editStep } = useAgent({
    planEndpoint: "https://gevnakyvjxvnzasruzwh.supabase.co/functions/v1/plan",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdldm5ha3l2anh2bnphc3J1endoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MjE5MzAsImV4cCI6MjEwODM5NzkzMH0.6bYEiX5yEupRDZWJfhI2_VVPYbxJSVErCzTvv1hytfU",
    userId, 
    userEmail: user?.email,
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

  const handleEditBudget = (stepId: string, currentBudget: number) => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        "Edit Budget",
        "Enter new max price ($)",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save", onPress: (val) => { if (val) editStep(stepId, { max_price: Number(val) }); } }
        ],
        "plain-text",
        String(currentBudget)
      );
    } else {
      Alert.alert(
        "Edit Budget",
        `Current budget is $${currentBudget}. To change it, please type the new amount in the home screen.`,
        [{ text: "OK" }]
      );
    }
  };

  const renderStep = (step: any, index: number) => {
    let statusColor = colors.border; 
    let statusText = "Pending"; 
    let iconColor = colors.textMuted;

    if (state.status === "EXECUTING" || state.status === "STEP_FAILED" || state.status === "COMPLETED" || state.status === "PAUSED") {
      const currentIdx = "currentIndex" in state ? state.currentIndex : state.plan.length;
      if (index < currentIdx) {
        const result = state.results[index];
        if (result?.status === "success") { statusColor = "#10B981"; statusText = "Done"; iconColor = "#10B981"; }
        else if (result?.status === "failure") { statusColor = colors.danger; statusText = "Failed"; iconColor = colors.danger; }
      } else if (index === currentIdx && state.status !== "PAUSED") {
        if (state.status === "EXECUTING") { statusColor = colors.accent; statusText = "Running..."; iconColor = colors.accent; }
        if (state.status === "STEP_FAILED") { statusColor = colors.danger; statusText = "Failed"; iconColor = colors.danger; }
      }
    }

    const isEditing = state.status === "AWAITING_APPROVAL";
    const isClinic = step.tool === "search_dentists";

    return (
      <Animated.View key={step.id} entering={FadeInDown.delay(index * 100).springify()} style={[styles.stepCard, index === ("currentIndex" in state ? state.currentIndex : -1) && styles.activeCard]}>
        <View style={styles.stepHeader}>
          <View style={[styles.iconBox, { backgroundColor: statusColor === colors.border ? colors.background : `${statusColor}15` }]}>
            <Ionicons name={TOOL_ICONS[step.tool] || "build"} size={20} color={iconColor} />
          </View>
          <View style={styles.stepTextContainer}>
            <Text style={styles.stepDescription}>{step.description}</Text>
            <Text style={[styles.stepMeta, { color: iconColor }]}>{statusText}</Text>
            <Text style={styles.stepImpact}>Why: {step.estimatedImpact}</Text>
            
            {isClinic && step.args.max_price && (
              <View style={styles.budgetBadge}>
                <Text style={styles.budgetText}>Budget: ${step.args.max_price}</Text>
              </View>
            )}

            {isClinic && state.status === "COMPLETED" && (
              <View style={styles.clinicActions}>
                <Pressable style={styles.clinicBtn} onPress={() => Linking.openURL(`tel:555-123-4567`)}>
                  <Ionicons name="call" size={14} color={colors.accent} />
                  <Text style={styles.clinicBtnText}>Call Clinic</Text>
                </Pressable>
                <Pressable style={styles.clinicBtn} onPress={() => Linking.openURL(`https://maps.google.com/?q=dentist`)}>
                  <Ionicons name="map" size={14} color={colors.accent} />
                  <Text style={styles.clinicBtnText}>Directions</Text>
                </Pressable>
              </View>
            )}
          </View>
          
          {isEditing && (
            <View style={styles.editActions}>
              {isClinic && (
                <Pressable onPress={() => handleEditBudget(step.id, step.args.max_price || 100)} style={styles.actionBtn}>
                  <Ionicons name="pencil" size={18} color={colors.accent} />
                </Pressable>
              )}
              <Pressable onPress={() => removeStep(step.id)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        {state.status === "PLANNING" && <SkeletonLoader />}

        {state.status === "PAUSED" && (
          <View style={styles.pausedContainer}>
            <Ionicons name="pause-circle" size={64} color={colors.accent} />
            <Text style={styles.pausedTitle}>Plan Paused</Text>
            <Text style={styles.pausedText}>
              Step-by-step approval is on. The next step is: <Text style={{fontWeight: "bold"}}>{state.plan[state.currentIndex]?.description}</Text>
            </Text>
            <Button title="Resume Next Step" onPress={resume} style={{ marginTop: spacing.lg, width: "100%" }} />
            <Button title="Abort Run" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.sm, width: "100%" }} />
          </View>
        )}

        {(state.status === "AWAITING_APPROVAL" || state.status === "EXECUTING" || state.status === "STEP_FAILED" || state.status === "COMPLETED") && (
          <View style={styles.planContainer}>
            <Text style={styles.sectionTitle}>{state.status === "AWAITING_APPROVAL" ? "Review Plan" : "Agent Trace"}</Text>
            
            {state.status === "AWAITING_APPROVAL" && (
              <>
                <View style={styles.dataPanel}>
                  <Ionicons name="information-circle" size={20} color={colors.accent} />
                  <Text style={styles.dataPanelText}>
                    What leaves this device: Your text prompt and approximate location will be sent to OpenRouter AI to generate this plan.
                  </Text>
                </View>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleText}>Step-by-Step Mode</Text>
                  <Switch value={stepByStep} onValueChange={setStepByStep} trackColor={{ true: colors.accent }} />
                </View>
              </>
            )}

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
  scroll: { flexGrow: 1, paddingBottom: 160 },
  planContainer: { marginTop: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  dataPanel: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "#E0E7FF", padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  dataPanelText: { flex: 1, fontSize: 13, color: "#3730A3", lineHeight: 18 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  toggleText: { fontSize: 15, fontWeight: "600", color: colors.text },
  stepsList: { gap: spacing.sm },
  stepCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  activeCard: { borderColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.1, elevation: 3 },
  stepHeader: { flexDirection: "row", alignItems: "flex-start" },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  stepTextContainer: { flex: 1 },
  stepDescription: { fontSize: 15, fontWeight: "500", color: colors.text, marginBottom: 4 },
  stepMeta: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", marginBottom: 6 },
  stepImpact: { fontSize: 13, color: colors.textMuted, fontStyle: "italic", lineHeight: 18, marginBottom: spacing.sm },
  
  budgetBadge: { backgroundColor: "#F0FDF4", alignSelf: "flex-start", paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, marginBottom: spacing.sm },
  budgetText: { fontSize: 13, fontWeight: "700", color: "#166534" },
  
  editActions: { flexDirection: "row", gap: spacing.sm, marginLeft: spacing.sm },
  actionBtn: { padding: spacing.xs, backgroundColor: "#F3F4F6", borderRadius: radius.full },

  clinicActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  clinicBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E0E7FF", paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.full },
  clinicBtnText: { fontSize: 12, fontWeight: "600", color: colors.accent },

  pausedContainer: { alignItems: "center", justifyContent: "center", marginTop: 100, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  pausedTitle: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  pausedText: { fontSize: 15, color: colors.textMuted, textAlign: "center", lineHeight: 22 },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: "row", gap: spacing.md },
  flexButton: { flex: 1 },
  errorFooter: { gap: spacing.sm }
});