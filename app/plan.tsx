// app/plan.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { useThemeColors, ThemeColors, radius, spacing, shadows, glow, type } from "../constants/theme";
import { SUPABASE_ANON_KEY, PLAN_ENDPOINT } from "../constants/config";
import { getDefaultCurrency, formatMoney } from "../constants/pricing";
import { estimateCost } from "../constants/treatments";
import { useAgent } from "../hooks/useAgent";
import { writeAudit } from "../shared/audit";
import { useAuth } from "../contexts/AuthContext";

type Priority = "cheapest" | "fastest" | "closest";

const TOOL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  analyze_symptoms: "pulse",
  search_dentists: "search",
  check_availability: "calendar",
  book_appointment: "checkmark-circle",
  prepare_visit_checklist: "list",
  schedule_reminder: "notifications",
  generate_care_plan: "document-text",
};

const PRIORITIES: { key: Priority; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "cheapest", label: "Cheapest", sub: "Lowest price", icon: "cash-outline" },
  { key: "fastest", label: "Fastest", sub: "Earliest slot", icon: "flash-outline" },
  { key: "closest", label: "Closest", sub: "Nearest clinic", icon: "navigate-outline" },
];

const SUGGESTIONS = ["Make it cheaper", "Evenings only", "Closer to me"];

export default function PlanScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  // Triage passes the answers as separate values (see app/triage.tsx).
  const params = useLocalSearchParams<{ request: string; duration?: string; pain?: string; canEat?: string }>();
  const request = params.request ?? "";
  const painLevel = Number(params.pain) || 0;
  const canEat = params.canEat !== "0";

  const router = useRouter();
  const { user } = useAuth();

  // The Case Card (what you send the clinic) reads this, so it knows what the visit is about.
  useEffect(() => {
    if (!request) return;
    AsyncStorage.setItem(
      "last_request",
      JSON.stringify({ request, duration: params.duration ?? "", pain: painLevel, canEat })
    ).catch(() => {});
  }, [request, params.duration, painLevel, canEat]);
  const userId = user?.id ?? "anonymous"; // must match the id the Audit screen reads
  const currency = getDefaultCurrency();

  const [stepByStep, setStepByStep] = useState(false);
  const [budgetEdit, setBudgetEdit] = useState<{ id: string; value: string } | null>(null);
  const [modification, setModification] = useState("");
  const [mods, setMods] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [keyboardUp, setKeyboardUp] = useState(false);

  const { state, plan, approve, reject, skip, retry, resume, abort, executeCurrent, removeStep, editStep } = useAgent({
    planEndpoint: PLAN_ENDPOINT,
    anonKey: SUPABASE_ANON_KEY,
    userId,
    userEmail: user?.email,
    onAudit: async (entry: any) => await writeAudit(userId, entry.type, entry.description, entry.detail),
  });

  // The sentence the AI sees: the person's words plus the triage answers, kept short.
  const baseRequest = useMemo(() => {
    const parts = [`Request: ${request.slice(0, 300) || "Dental issue"}`];
    if (params.duration) parts.push(`Duration: ${params.duration}`);
    if (painLevel) parts.push(`Pain: ${painLevel}/10`);
    parts.push(`Can eat normally: ${canEat ? "yes" : "no"}`);
    parts.push("If pain is 8+, prioritize urgent care. If budget is a concern, find low-cost clinics.");
    return parts.join(". ");
  }, [request, params.duration, painLevel, canEat]);

  const withMods = (list: string[]) =>
    list.length ? `${baseRequest}. Changes the user asked for: ${list.map((m) => `"${m}"`).join("; ")}` : baseRequest;

  // Start planning ONCE per visit. (Cancelling used to reset to IDLE and instantly start a new plan.)
  const startedRef = useRef(false);
  useEffect(() => {
    if (request && !startedRef.current && state.status === "IDLE") {
      startedRef.current = true;
      plan(baseRequest, { emergencyText: request });
    }
  }, [request, state.status, plan, baseRequest]);

  useEffect(() => {
    if (state.status === "EXECUTING" && "currentIndex" in state) executeCurrent();
  }, [state, executeCurrent]);

  useEffect(() => {
    if (state.status === "COMPLETED") router.replace("/appointment");
  }, [state.status, router]);

  // Hide the bottom action bar while typing so it never covers the text box.
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardUp(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const retryPlan = () => plan(withMods(mods), { emergencyText: request });

  const handleModify = (text?: string) => {
    const value = (text ?? modification).trim().slice(0, 200);
    if (!value) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const next = [...mods, value].slice(-3);
    setMods(next);
    setModification("");
    setPriority(null);
    Keyboard.dismiss();
    plan(withMods(next), { emergencyText: value });
  };

  const applyPriority = (p: Priority) => {
    if (state.status !== "AWAITING_APPROVAL") return;
    Haptics.selectionAsync().catch(() => {});
    const next = priority === p ? null : p;
    setPriority(next);
    // Only the booking step needs it: that is where the clinic and time are chosen.
    state.plan.filter((s) => s.tool === "book_appointment").forEach((s) => editStep(s.id, { priority: next ?? undefined }));
  };

  const handleEditBudget = (stepId: string, currentBudget: number) => setBudgetEdit({ id: stepId, value: String(currentBudget) });

  const saveBudget = () => {
    if (!budgetEdit) return;
    const n = Number(budgetEdit.value);
    if (!Number.isFinite(n) || n <= 0) return;
    editStep(budgetEdit.id, { max_price: n });
    setBudgetEdit(null);
  };

  // ── Derived content ─────────────────────────────────────────────
  const urgency = useMemo(() => {
    if (painLevel >= 8 || (!canEat && painLevel >= 6)) {
      return {
        tone: "danger" as const,
        icon: "warning" as const,
        title: "Urgent: see a dentist within 48 hours",
        text: `Pain ${painLevel}/10${!canEat ? " and trouble eating" : ""} suggests this shouldn't wait.`,
      };
    }
    if (painLevel >= 5) {
      return {
        tone: "warning" as const,
        icon: "time" as const,
        title: "Soon: book within the week",
        text: `Pain ${painLevel}/10 is worth treating before it gets worse.`,
      };
    }
    return {
      tone: "success" as const,
      icon: "checkmark-circle" as const,
      title: "Routine care",
      text: painLevel ? `Pain ${painLevel}/10. A regular appointment is fine.` : "A regular appointment is fine.",
    };
  }, [painLevel, canEat]);

  const cost = useMemo(() => estimateCost(request, painLevel), [request, painLevel]);
  const costCurrency = cost.currencyCode === "PKR" ? { code: "PKR" as const, symbol: "Rs " } : { code: "USD" as const, symbol: "$" };

  const budget = useMemo(() => {
    if (!("plan" in state)) return null;
    const step = state.plan.find((s) => s.tool === "search_dentists");
    const n = Number(step?.args?.max_price);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [state]);

  const hasBooking = "plan" in state && state.plan.some((s) => s.tool === "book_appointment");

  const toneColors = {
    danger: { fg: colors.danger, bg: colors.dangerMuted },
    warning: { fg: colors.warning, bg: colors.warningMuted },
    success: { fg: colors.success, bg: colors.successMuted },
  }[urgency.tone];

  const failureReason = (stepId: string): string | null => {
    if (!("results" in state)) return null;
    const r = state.results.find((x) => x.stepId === stepId);
    if (!r || r.status !== "failure" || !r.error) return null;
    if (/appointments|schema cache|does not exist|relation/i.test(r.error)) {
      return `${r.error}\nFix: run supabase/appointments.sql in the Supabase SQL editor, then tap Retry Step.`;
    }
    return r.error;
  };

  const renderStep = (step: any, index: number) => {
    let tone = colors.textMuted;
    let statusText = "Pending";
    let phase: "pending" | "running" | "done" | "failed" = "pending";

    if (state.status === "EXECUTING" || state.status === "STEP_FAILED" || state.status === "COMPLETED" || state.status === "PAUSED") {
      const currentIdx = "currentIndex" in state ? state.currentIndex : state.plan.length;
      if (index < currentIdx) {
        const result = state.results[index];
        if (result?.status === "success") { tone = colors.success; statusText = "Done"; phase = "done"; }
        else if (result?.status === "failure") { tone = colors.danger; statusText = "Failed"; phase = "failed"; }
        else if (result?.status === "skipped") { statusText = "Skipped"; }
      } else if (index === currentIdx && state.status !== "PAUSED") {
        if (state.status === "EXECUTING") { tone = colors.accent; statusText = "Running"; phase = "running"; }
        if (state.status === "STEP_FAILED") { tone = colors.danger; statusText = "Failed"; phase = "failed"; }
      }
    }

    const isPending = phase === "pending";
    const isEditing = state.status === "AWAITING_APPROVAL";
    const isClinic = step.tool === "search_dentists";
    const active = phase === "running" || (phase === "failed" && state.status === "STEP_FAILED");
    const reason = phase === "failed" ? failureReason(step.id) : null;

    return (
      <Animated.View
        key={step.id}
        entering={FadeInDown.delay(index * 90).springify().damping(18)}
        style={[styles.stepCard, active && { borderColor: tone, borderWidth: 1.5, ...glow(tone, 0.18) }]}
      >
        <View style={styles.stepHeader}>
          <View style={[styles.iconBox, { backgroundColor: isPending ? colors.surfaceAlt : `${tone}1F` }]}>
            {phase === "running" ? (
              <ActivityIndicator size="small" color={tone} />
            ) : (
              <Ionicons
                name={phase === "failed" ? "alert-circle" : phase === "done" ? "checkmark" : TOOL_ICONS[step.tool] || "build"}
                size={20}
                color={isPending ? colors.textMuted : tone}
              />
            )}
          </View>
          <View style={styles.stepTextContainer}>
            <View style={styles.stepTopRow}>
              <Text style={styles.stepNumber}>STEP {index + 1}</Text>
              {!(isEditing && isPending) && (
                <View style={[styles.statusPill, { backgroundColor: isPending ? colors.surfaceAlt : `${tone}1F` }]}>
                  <Text style={[styles.statusText, { color: isPending ? colors.textMuted : tone }]}>{statusText}</Text>
                </View>
              )}
            </View>
            <Text style={styles.stepDescription}>{step.description}</Text>
            <Text style={styles.stepImpact}>{step.estimatedImpact}</Text>

            {reason && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{reason}</Text>
              </View>
            )}

            {isClinic && step.args?.max_price ? (
              <View style={styles.budgetBadge}>
                <Ionicons name="wallet-outline" size={13} color={colors.success} />
                <Text style={styles.budgetText}>Budget {formatMoney(Number(step.args.max_price), currency)}</Text>
              </View>
            ) : null}
          </View>

          {isEditing && (
            <View style={styles.editActions}>
              {isClinic && (
                <Pressable
                  onPress={() => handleEditBudget(step.id, step.args?.max_price || 100)}
                  style={styles.actionBtn}
                  accessibilityLabel="Edit budget"
                >
                  <Ionicons name="pencil" size={15} color={colors.accentStrong} />
                </Pressable>
              )}
              <Pressable onPress={() => removeStep(step.id)} style={styles.actionBtn} accessibilityLabel="Remove step">
                <Ionicons name="trash-outline" size={15} color={colors.danger} />
              </Pressable>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  const showSteps =
    state.status === "AWAITING_APPROVAL" || state.status === "EXECUTING" || state.status === "STEP_FAILED" || state.status === "COMPLETED";

  const progressText =
    state.status === "EXECUTING" && "currentIndex" in state
      ? `Running step ${Math.min(state.currentIndex + 1, state.plan.length)} of ${state.plan.length}`
      : "Every step is shown here as it runs";

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 200 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {state.status === "PLANNING" && (
            <Animated.View entering={FadeIn}>
              <View style={styles.planningHeader}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.planningText}>Building your plan…</Text>
              </View>
              <SkeletonLoader />
            </Animated.View>
          )}

          {/* A failed plan (no internet, bad AI reply) used to leave a blank screen. */}
          {state.status === "FAILED_PLANNING" && (
            <Animated.View entering={FadeInDown} style={styles.centerCard}>
              <View style={[styles.bigIcon, { backgroundColor: colors.dangerMuted }]}>
                <Ionicons name="cloud-offline-outline" size={36} color={colors.danger} />
              </View>
              <Text style={styles.centerTitle}>Couldn't build your plan</Text>
              <Text style={styles.centerText}>{state.reason}</Text>
              <Button title="Try again" icon="refresh" onPress={retryPlan} style={{ marginTop: spacing.lg, alignSelf: "stretch" }} />
              <Button title="Go back" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.sm, alignSelf: "stretch" }} />
            </Animated.View>
          )}

          {state.status === "PAUSED" && (
            <Animated.View entering={FadeInDown} style={styles.centerCard}>
              <View style={[styles.bigIcon, { backgroundColor: colors.accentMuted }]}>
                <Ionicons name="pause" size={36} color={colors.accentStrong} />
              </View>
              <Text style={styles.centerTitle}>Plan paused</Text>
              <Text style={styles.centerText}>
                Step-by-step approval is on. Next up:{" "}
                <Text style={{ fontWeight: "700", color: colors.text }}>{state.plan[state.currentIndex]?.description}</Text>
              </Text>
              <Button title="Run next step" icon="play" onPress={resume} style={{ marginTop: spacing.lg, alignSelf: "stretch" }} />
              <Button
                title="Abort run"
                variant="ghost"
                onPress={() => {
                  abort();
                  router.back();
                }}
                style={{ marginTop: spacing.sm, alignSelf: "stretch" }}
              />
            </Animated.View>
          )}

          {showSteps && (
            <View>
              <Text style={styles.overline}>{state.status === "AWAITING_APPROVAL" ? "Your care plan" : "Live progress"}</Text>
              <Text style={styles.title}>{state.status === "AWAITING_APPROVAL" ? "Review your plan" : "Working on it"}</Text>
              {state.status !== "AWAITING_APPROVAL" && <Text style={styles.sub}>{progressText}</Text>}

              {state.status === "AWAITING_APPROVAL" && (
                <>
                  {/* Urgency */}
                  <Animated.View entering={FadeInDown.delay(40)} style={[styles.urgency, { backgroundColor: toneColors.bg }]}>
                    <View style={[styles.urgencyIcon, { backgroundColor: colors.surface }]}>
                      <Ionicons name={urgency.icon} size={22} color={toneColors.fg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.urgencyTitle, { color: toneColors.fg }]}>{urgency.title}</Text>
                      <Text style={[styles.urgencyText, { color: toneColors.fg }]}>{urgency.text}</Text>
                    </View>
                  </Animated.View>

                  {/* Cost forecast */}
                  <Animated.View entering={FadeInDown.delay(100)}>
                    <Card style={{ marginTop: spacing.md }}>
                      <Text style={styles.cardLabel}>Estimated cost</Text>
                      <Text style={styles.costAmount}>
                        {formatMoney(cost.min, costCurrency)} – {formatMoney(cost.max, costCurrency)}
                      </Text>
                      <Text style={styles.costSub}>{cost.label}</Text>
                      {budget && cost.currencyCode === currency.code ? (
                        <View
                          style={[
                            styles.costPill,
                            { backgroundColor: cost.max <= budget ? colors.successMuted : colors.warningMuted },
                          ]}
                        >
                          <Ionicons
                            name={cost.max <= budget ? "checkmark-circle" : "alert-circle"}
                            size={14}
                            color={cost.max <= budget ? colors.success : colors.warning}
                          />
                          <Text style={[styles.costPillText, { color: cost.max <= budget ? colors.success : colors.warning }]}>
                            {cost.max <= budget
                              ? `Within your ${formatMoney(budget, currency)} budget`
                              : `May go above your ${formatMoney(budget, currency)} budget`}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={styles.disclaimer}>Typical prices, not a quote. Your dentist decides the treatment.</Text>
                    </Card>
                  </Animated.View>

                  {/* Options */}
                  {hasBooking && (
                    <Animated.View entering={FadeInDown.delay(160)}>
                      <Text style={styles.sectionTitle}>Prefer something specific?</Text>
                      <View style={styles.optionsRow}>
                        {PRIORITIES.map((o) => {
                          const on = priority === o.key;
                          return (
                            <Pressable
                              key={o.key}
                              onPress={() => applyPriority(o.key)}
                              style={[styles.option, on && { backgroundColor: colors.accentMuted, borderColor: colors.accent }]}
                              accessibilityRole="button"
                              accessibilityState={{ selected: on }}
                            >
                              <Ionicons name={o.icon} size={20} color={on ? colors.accentStrong : colors.textMuted} />
                              <Text style={[styles.optionLabel, on && { color: colors.accentStrong }]}>{o.label}</Text>
                              <Text style={styles.optionSub}>{o.sub}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </Animated.View>
                  )}

                  {/* Privacy + mode */}
                  <View style={styles.dataPanel}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.accentStrong} />
                    <Text style={styles.dataPanelText}>
                      Only the text you typed and your answers go to an AI service to build this plan. Your location is not sent.
                    </Text>
                  </View>
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.toggleText}>Step-by-step mode</Text>
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

              <Text style={styles.sectionTitle}>{state.status === "AWAITING_APPROVAL" ? "What the AI will do" : "Agent trace"}</Text>
              <View style={styles.stepsList}>{state.plan.map((step, i) => renderStep(step, i))}</View>

              {/* Change by typing */}
              {state.status === "AWAITING_APPROVAL" && (
                <Animated.View entering={FadeInDown.delay(220)} style={{ marginTop: spacing.lg }}>
                  <Text style={styles.sectionTitle}>Not quite right?</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.suggestions}>
                    {SUGGESTIONS.map((s) => (
                      <Pressable key={s} onPress={() => handleModify(s)} style={styles.suggestion}>
                        <Ionicons name="sparkles" size={13} color={colors.accentStrong} />
                        <Text style={styles.suggestionText}>{s}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <View style={styles.modifyContainer}>
                    <TextInput
                      style={styles.modifyInput}
                      placeholder="Tell me what to change"
                      placeholderTextColor={colors.textMuted}
                      selectionColor={colors.accent}
                      value={modification}
                      onChangeText={setModification}
                      onSubmitEditing={() => handleModify()}
                      returnKeyType="send"
                    />
                    <Pressable
                      style={[styles.modifyBtn, !modification.trim() && { opacity: 0.4 }]}
                      onPress={() => handleModify()}
                      disabled={!modification.trim()}
                      accessibilityLabel="Send change"
                    >
                      <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </Animated.View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {!keyboardUp && (
        <Animated.View entering={FadeInUp.delay(250)} style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {state.status === "AWAITING_APPROVAL" && (
            <View style={styles.row}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => {
                  reject();
                  router.back();
                }}
                style={{ flex: 1 }}
              />
              <Button title="Approve" icon="checkmark" onPress={() => approve(stepByStep)} style={{ flex: 1.5 }} />
            </View>
          )}
          {state.status === "EXECUTING" && <Button title="Running…" loading onPress={() => {}} />}
          {state.status === "STEP_FAILED" && (
            <View style={{ gap: spacing.sm + 2 }}>
              <Text style={styles.failHint}>This step didn't finish. Retrying usually fixes it.</Text>
              <Button title="Retry step" icon="refresh" onPress={retry} />
              <View style={styles.row}>
                <Button title="Skip step" variant="ghost" onPress={skip} style={{ flex: 1 }} />
                <Button
                  title="Abort plan"
                  variant="dangerGhost"
                  onPress={() => {
                    abort();
                    router.back();
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </Animated.View>
      )}

      {/* Works on Android and iOS (Alert.prompt is iOS-only) */}
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
              <Button title="Cancel" variant="ghost" onPress={() => setBudgetEdit(null)} style={{ flex: 1 }} />
              <Button title="Save" onPress={saveBudget} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { flexGrow: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md },

    overline: { ...type.overline, color: colors.accentStrong, marginBottom: 4 },
    title: { ...type.display, fontSize: 28, lineHeight: 34, color: colors.text },
    sub: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
    sectionTitle: { ...type.heading, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm + 2 },

    planningHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, marginBottom: spacing.md },
    planningText: { ...type.heading, color: colors.text },

    urgency: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, marginTop: spacing.md },
    urgencyIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    urgencyTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
    urgencyText: { fontSize: 13, lineHeight: 18, marginTop: 2, opacity: 0.9 },

    cardLabel: { ...type.overline, color: colors.textMuted },
    costAmount: { fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: -0.6, marginTop: 6 },
    costSub: { fontSize: 13.5, color: colors.textMuted, marginTop: 2 },
    costPill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: spacing.sm + 4, paddingVertical: 6, borderRadius: radius.full, marginTop: spacing.md },
    costPillText: { fontSize: 12.5, fontWeight: "700" },
    disclaimer: { ...type.caption, color: colors.textMuted, marginTop: spacing.md },

    optionsRow: { flexDirection: "row", gap: spacing.sm + 2 },
    option: {
      flex: 1,
      alignItems: "center",
      gap: 3,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    optionLabel: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 2 },
    optionSub: { fontSize: 11.5, color: colors.textMuted },

    dataPanel: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, backgroundColor: colors.accentMuted, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.lg },
    dataPanelText: { flex: 1, fontSize: 12.5, color: colors.accentStrong, lineHeight: 18, fontWeight: "500" },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: spacing.sm + 2,
      ...shadows.sm,
    },
    toggleText: { fontSize: 15, fontWeight: "600", color: colors.text },
    toggleSub: { ...type.caption, color: colors.textMuted, marginTop: 2 },

    stepsList: { gap: spacing.sm + 2 },
    stepCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadows.sm },
    stepHeader: { flexDirection: "row", alignItems: "flex-start" },
    iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
    stepTextContainer: { flex: 1 },
    stepTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    stepNumber: { ...type.overline, fontSize: 10, color: colors.textMuted },
    statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
    statusText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
    stepDescription: { fontSize: 15, fontWeight: "700", color: colors.text, lineHeight: 21, letterSpacing: -0.1 },
    stepImpact: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginTop: 3 },

    errorBox: { backgroundColor: colors.dangerMuted, borderRadius: radius.sm, padding: spacing.sm + 2, marginTop: spacing.sm },
    errorText: { fontSize: 12, lineHeight: 17, color: colors.danger, fontWeight: "600" },

    budgetBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.successMuted, alignSelf: "flex-start", paddingHorizontal: spacing.sm + 2, paddingVertical: 5, borderRadius: radius.full, marginTop: spacing.sm },
    budgetText: { fontSize: 12, fontWeight: "700", color: colors.success },

    editActions: { flexDirection: "row", gap: spacing.sm, marginLeft: spacing.sm },
    actionBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },

    suggestions: { gap: spacing.sm, paddingBottom: spacing.sm + 2 },
    suggestion: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.accentMuted },
    suggestionText: { fontSize: 13, fontWeight: "600", color: colors.accentStrong },
    modifyContainer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, padding: 6, paddingLeft: spacing.md, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
    modifyInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 8 },
    modifyBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },

    centerCard: { alignItems: "center", marginTop: 60, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, ...shadows.md },
    bigIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
    centerTitle: { ...type.title, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm, textAlign: "center" },
    centerText: { fontSize: 15, color: colors.textMuted, textAlign: "center", lineHeight: 22 },

    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderTopWidth: 1,
      borderTopColor: "rgba(34,211,238,0.25)",
      ...shadows.lg,
    },
    row: { flexDirection: "row", gap: spacing.md },
    failHint: { fontSize: 13, color: colors.textMuted, textAlign: "center" },

    modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: spacing.lg },
    modalCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, ...shadows.lg },
    modalTitle: { ...type.title, color: colors.text },
    modalSub: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: spacing.lg },
    modalField: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 60, marginBottom: spacing.lg, borderWidth: 1.5, borderColor: colors.accent },
    modalCurrency: { fontSize: 24, fontWeight: "700", color: colors.textMuted, marginRight: spacing.xs },
    modalInput: { flex: 1, fontSize: 24, fontWeight: "800", color: colors.text, paddingVertical: 0 },
  });