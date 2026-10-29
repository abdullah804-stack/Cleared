// app/plan.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Switch,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { useThemeColors, ThemeColors, radius, spacing, shadows, glow, type } from "../constants/theme";
import { SUPABASE_ANON_KEY, PLAN_ENDPOINT } from "../constants/config";
import { getDefaultCurrency, formatMoney } from "../constants/pricing";
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
  generate_care_plan: "document-text",
};

export default function PlanScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { request } = useLocalSearchParams<{ request: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? "anonymous"; // must match the id the Audit screen reads
  const currency = getDefaultCurrency();

  const [stepByStep, setStepByStep] = useState(false);
  const [budgetEdit, setBudgetEdit] = useState<{ id: string; value: string } | null>(null);

  const { state, plan, approve, reject, skip, retry, resume, abort, executeCurrent, removeStep, editStep } = useAgent({
    planEndpoint: PLAN_ENDPOINT,
    anonKey: SUPABASE_ANON_KEY,
    userId,
    userEmail: user?.email,
    onAudit: async (entry: any) => await writeAudit(userId, entry.type, entry.description, entry.detail),
  });

  // Start planning ONCE per visit. (Before, cancelling reset the state to IDLE and this effect
  // immediately started a brand-new plan, so "Cancel" never actually cancelled.)
  const startedRef = useRef(false);
  useEffect(() => {
    if (request && !startedRef.current && state.status === "IDLE") {
      startedRef.current = true;
      plan(request);
    }
  }, [request, state.status, plan]);

  const retryPlan = () => {
    if (request) plan(request);
  };

  useEffect(() => {
    if (state.status === "EXECUTING" && "currentIndex" in state) executeCurrent();
  }, [state, executeCurrent]);

  useEffect(() => {
    if (state.status === "COMPLETED") router.replace("/appointment");
  }, [state.status, router]);

  // Works on Android AND iOS (Alert.prompt is iOS-only, so Android users could never edit the budget)
  const handleEditBudget = (stepId: string, currentBudget: number) => {
    setBudgetEdit({ id: stepId, value: String(currentBudget) });
  };

  const saveBudget = () => {
    if (!budgetEdit) return;
    const n = Number(budgetEdit.value);
    if (!Number.isFinite(n) || n <= 0) return;
    editStep(budgetEdit.id, { max_price: n });
    setBudgetEdit(null);
  };

  const renderStep = (step: any, index: number) => {
    let statusColor = colors.border;
    let statusText = "Pending";
    let iconColor = colors.textMuted;

    if (state.status === "EXECUTING" || state.status === "STEP_FAILED" || state.status === "COMPLETED" || state.status === "PAUSED") {
      const currentIdx = "currentIndex" in state ? state.currentIndex : state.plan.length;
      if (index < currentIdx) {
        const result = state.results[index];
        if (result?.status === "success") { statusColor = colors.success; statusText = "Done"; iconColor = colors.success; }
        else if (result?.status === "failure") { statusColor = colors.danger; statusText = "Failed"; iconColor = colors.danger; }
      } else if (index === currentIdx && state.status !== "PAUSED") {
        if (state.status === "EXECUTING") { statusColor = colors.accent; statusText = "Running..."; iconColor = colors.accent; }
        if (state.status === "STEP_FAILED") { statusColor = colors.danger; statusText = "Failed"; iconColor = colors.danger; }
      }
    }

    const isPending = statusColor === colors.border;
    const isEditing = state.status === "AWAITING_APPROVAL";
    const isClinic = step.tool === "search_dentists";

    return (
      <Animated.View
        key={step.id}
        entering={FadeInDown.delay(index * 100).springify()}
        style={[styles.stepCard, index === ("currentIndex" in state ? state.currentIndex : -1) && styles.activeCard]}
      >
        <View style={styles.stepHeader}>
          <View style={[styles.iconBox, { backgroundColor: isPending ? colors.surfaceAlt : `${statusColor}1F` }]}>
            <Ionicons name={TOOL_ICONS[step.tool] || "build"} size={20} color={iconColor} />
          </View>
          <View style={styles.stepTextContainer}>
            <View style={[styles.statusPill, { backgroundColor: isPending ? colors.surfaceAlt : `${statusColor}1F` }]}>
              <Text style={[styles.stepMeta, { color: iconColor }]}>{statusText}</Text>
            </View>
            <Text style={styles.stepDescription}>{step.description}</Text>
            <Text style={styles.stepImpact}>Why: {step.estimatedImpact}</Text>

            {isClinic && step.args.max_price && (
              <View style={styles.budgetBadge}>
                <Ionicons name="wallet-outline" size={13} color={colors.success} />
                <Text style={styles.budgetText}>Budget: {formatMoney(Number(step.args.max_price), currency)}</Text>
              </View>
            )}

            {isClinic && state.status === "COMPLETED" && (
              <View style={styles.clinicActions}>
                <Pressable style={styles.clinicBtn} onPress={() => Linking.openURL(`tel:555-123-4567`)}>
                  <Ionicons name="call" size={14} color={colors.accentStrong} />
                  <Text style={styles.clinicBtnText}>Call Clinic</Text>
                </Pressable>
                <Pressable style={styles.clinicBtn} onPress={() => Linking.openURL(`https://maps.google.com/?q=dentist`)}>
                  <Ionicons name="map" size={14} color={colors.accentStrong} />
                  <Text style={styles.clinicBtnText}>Directions</Text>
                </Pressable>
              </View>
            )}
          </View>

          {isEditing && (
            <View style={styles.editActions}>
              {isClinic && (
                <Pressable
                  onPress={() => handleEditBudget(step.id, step.args.max_price || 100)}
                  style={styles.actionBtn}
                  accessibilityLabel="Edit budget"
                >
                  <Ionicons name="pencil" size={16} color={colors.accentStrong} />
                </Pressable>
              )}
              <Pressable onPress={() => removeStep(step.id)} style={styles.actionBtn} accessibilityLabel="Remove step">
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </Pressable>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {state.status === "PLANNING" && <SkeletonLoader />}

        {/* Before, a failed plan (no internet, bad AI reply) left a blank screen with no way out. */}
        {state.status === "FAILED_PLANNING" && (
          <View style={styles.failedContainer}>
            <View style={styles.failedIcon}>
              <Ionicons name="cloud-offline-outline" size={36} color={colors.danger} />
            </View>
            <Text style={styles.pausedTitle}>Couldn't build your plan</Text>
            <Text style={styles.pausedText}>{state.reason}</Text>
            <Button title="Try again" onPress={retryPlan} style={{ marginTop: spacing.lg, width: "100%" }} />
            <Button title="Go back" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.sm, width: "100%" }} />
          </View>
        )}

        {state.status === "PAUSED" && (
          <View style={styles.pausedContainer}>
            <View style={styles.pausedIcon}>
              <Ionicons name="pause" size={36} color={colors.accentStrong} />
            </View>
            <Text style={styles.pausedTitle}>Plan Paused</Text>
            <Text style={styles.pausedText}>
              Step-by-step approval is on. The next step is:{" "}
              <Text style={{ fontWeight: "700", color: colors.text }}>{state.plan[state.currentIndex]?.description}</Text>
            </Text>
            <Button title="Resume Next Step" onPress={resume} style={{ marginTop: spacing.lg, width: "100%" }} />
            <Button
              title="Abort Run"
              variant="ghost"
              onPress={() => {
                abort();
                router.back();
              }}
              style={{ marginTop: spacing.sm, width: "100%" }}
            />
          </View>
        )}

        {(state.status === "AWAITING_APPROVAL" || state.status === "EXECUTING" || state.status === "STEP_FAILED" || state.status === "COMPLETED") && (
          <View style={styles.planContainer}>
            <Text style={styles.overline}>{state.status === "AWAITING_APPROVAL" ? "Your care plan" : "Live progress"}</Text>
            <Text style={styles.sectionTitle}>{state.status === "AWAITING_APPROVAL" ? "Review Plan" : "Agent Trace"}</Text>

            {state.status === "AWAITING_APPROVAL" && (
              <>
                <View style={styles.dataPanel}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.accentStrong} />
                  <Text style={styles.dataPanelText}>
                    What leaves this device: Your text prompt and approximate location will be sent to OpenRouter AI to generate this plan.
                  </Text>
                </View>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleText}>Step-by-Step Mode</Text>
                    <Text style={styles.toggleSub}>Approve each action before it runs</Text>
                  </View>
                  <Switch
                    value={stepByStep}
                    onValueChange={setStepByStep}
                    trackColor={{ true: colors.accent, false: colors.border }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={colors.border}
                  />
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
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => {
                reject();
                router.back();
              }}
              style={styles.flexButton}
            />
            <Button title="Approve & Execute" onPress={() => approve(stepByStep)} style={styles.flexButton} />
          </View>
        )}
        {state.status === "EXECUTING" && <Button title="Executing..." disabled onPress={() => {}} />}
        {state.status === "STEP_FAILED" && (
          <View style={styles.errorFooter}>
            <View style={styles.row}>
              <Button
                title="Abort"
                variant="danger"
                onPress={() => {
                  abort();
                  router.back();
                }}
                style={styles.flexButton}
              />
              <Button title="Retry Step" onPress={retry} style={styles.flexButton} />
            </View>
            <Button title="Skip & Continue" variant="ghost" onPress={skip} style={{ marginTop: spacing.sm }} />
          </View>
        )}
      </Animated.View>

      <Modal visible={!!budgetEdit} transparent animationType="fade" onRequestClose={() => setBudgetEdit(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior="padding">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setBudgetEdit(null)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit budget</Text>
            <Text style={styles.modalSub}>The most you're willing to pay for this visit.</Text>
            <View style={styles.modalField}>
              <Text style={styles.modalCurrency}>{currency.symbol.trim()}</Text>
              <TextInput
                style={styles.modalInput}
                value={budgetEdit?.value ?? ""}
                onChangeText={(t) => setBudgetEdit((b) => (b ? { ...b, value: t.replace(/[^0-9]/g, "").slice(0, 6) } : b))}
                keyboardType="number-pad"
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={saveBudget}
              />
            </View>
            <View style={styles.row}>
              <Button title="Cancel" variant="ghost" onPress={() => setBudgetEdit(null)} style={styles.flexButton} />
              <Button title="Save" onPress={saveBudget} style={styles.flexButton} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { flexGrow: 1, paddingBottom: 200 },
    planContainer: { marginTop: spacing.md },
    overline: { ...type.overline, color: colors.accentStrong, marginBottom: 4 },
    sectionTitle: { ...type.title, color: colors.text, marginBottom: spacing.md },

    dataPanel: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      backgroundColor: colors.accentMuted,
      padding: spacing.md,
      borderRadius: radius.md,
      marginBottom: spacing.md,
    },
    dataPanelText: { flex: 1, fontSize: 13, color: colors.accentStrong, lineHeight: 19, fontWeight: "500" },

    toggleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.surface,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
      ...shadows.sm,
    },
    toggleText: { fontSize: 15, fontWeight: "600", color: colors.text },
    toggleSub: { ...type.caption, color: colors.textMuted, marginTop: 2 },

    stepsList: { gap: spacing.md },
    stepCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      ...shadows.sm,
    },
    activeCard: { borderColor: colors.accent, borderWidth: 1.5, ...glow(colors.accent, 0.18) },
    stepHeader: { flexDirection: "row", alignItems: "flex-start" },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: radius.sm + 4,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    },
    stepTextContainer: { flex: 1 },
    statusPill: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
      marginBottom: 6,
    },
    stepMeta: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
    stepDescription: { fontSize: 15, fontWeight: "600", color: colors.text, lineHeight: 21, marginBottom: 4, letterSpacing: -0.1 },
    stepImpact: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: spacing.xs },

    budgetBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.successMuted,
      alignSelf: "flex-start",
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: radius.full,
      marginTop: spacing.xs,
    },
    budgetText: { fontSize: 12, fontWeight: "700", color: colors.success },

    editActions: { flexDirection: "row", gap: spacing.sm, marginLeft: spacing.sm },
    actionBtn: {
      width: 34,
      height: 34,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },

    clinicActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
    clinicBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.accentMuted,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: radius.full,
    },
    clinicBtnText: { fontSize: 12, fontWeight: "600", color: colors.accentStrong },

    pausedContainer: {
      alignItems: "center",
      justifyContent: "center",
      marginTop: 80,
      padding: spacing.xl,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.md,
    },
    pausedIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accentMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    pausedTitle: { ...type.title, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
    pausedText: { fontSize: 15, color: colors.textMuted, textAlign: "center", lineHeight: 22 },

    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: spacing.md,
      paddingBottom: 32,
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      ...shadows.lg,
    },
    row: { flexDirection: "row", gap: spacing.md },
    flexButton: { flex: 1 },
    errorFooter: { gap: spacing.sm },

    failedContainer: {
      alignItems: "center",
      justifyContent: "center",
      marginTop: 80,
      padding: spacing.xl,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.md,
    },
    failedIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.dangerMuted,
      alignItems: "center",
      justifyContent: "center",
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(11, 27, 43, 0.5)",
      justifyContent: "center",
      padding: spacing.lg,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      ...shadows.lg,
    },
    modalTitle: { ...type.title, color: colors.text },
    modalSub: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: spacing.lg },
    modalField: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      height: 60,
      marginBottom: spacing.lg,
      borderWidth: 1.5,
      borderColor: colors.accent,
    },
    modalCurrency: { fontSize: 24, fontWeight: "700", color: colors.textMuted, marginRight: spacing.xs },
    modalInput: { flex: 1, fontSize: 24, fontWeight: "800", color: colors.text, paddingVertical: 0 },
  });