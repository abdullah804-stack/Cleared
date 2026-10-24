// app/plan.tsx
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Platform } from "react-native";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { useAgent } from "../hooks/useAgent";
import { writeAudit } from "../shared/audit";

export default function PlanScreen() {
  const { request } = useLocalSearchParams<{ request: string }>();
  const router = useRouter();
  const [userId] = useState("demo-user-123"); // Replaced by real auth later

  // 1. Initialize the agent hook
  const { state, plan, approve, reject, skip, executeCurrent } = useAgent({
    planEndpoint: "https://gevnakyvjxvnzasruzwh.supabase.co/functions/v1/plan",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdldm5ha3l2anh2bnphc3J1endoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MjE5MzAsImV4cCI6MjEwODM5NzkzMH0.6bYEiX5yEupRDZWJfhI2_VVPYbxJSVErCzTvv1hytfU",
    userId,
    onAudit: async (entry) => {
      await writeAudit(userId, entry.type, entry.description, entry.detail);
    },
  });

  // 2. Trigger planning on mount
  useEffect(() => {
    if (request && state.status === "IDLE") {
      plan(request);
    }
  }, [request, state.status, plan]);

  // 3. Auto-advance execution
  useEffect(() => {
    if (state.status === "EXECUTING" && "currentIndex" in state) {
      executeCurrent();
    }
  }, [state, executeCurrent]);

  // 4. Handle navigation on completion
  useEffect(() => {
    if (state.status === "COMPLETED") {
      router.replace("/audit");
    }
  }, [state.status, router]);

  // --- Render Helpers ---

  const renderStep = (step: any, index: number) => {
    let statusColor = colors.border;
    let statusText = "Pending";

    if (
      state.status === "EXECUTING" ||
      state.status === "STEP_FAILED" ||
      state.status === "COMPLETED"
    ) {
      const currentIdx = "currentIndex" in state ? state.currentIndex : state.plan.length;

      if (index < currentIdx) {
        const result = state.results[index];
        if (result?.status === "success") {
          statusColor = "#10B981";
          statusText = "Done";
        } else if (result?.status === "failure") {
          statusColor = colors.danger;
          statusText = "Failed";
        } else if (result?.status === "skipped") {
          statusColor = "#F59E0B";
          statusText = "Skipped";
        }
      } else if (index === currentIdx) {
        if (state.status === "EXECUTING") {
          statusColor = colors.accent;
          statusText = "Running...";
        } else if (state.status === "STEP_FAILED") {
          statusColor = colors.danger;
          statusText = "Failed";
        }
      }
    }

    return (
      <View key={step.id} style={styles.stepCard}>
        <View style={[styles.stepIndicator, { backgroundColor: statusColor }]} />
        <View style={styles.stepContent}>
          <Text style={styles.stepDescription}>{step.description}</Text>
          <Text style={styles.stepMeta}>
            {step.tool} · {statusText}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        {state.status === "PLANNING" && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Building plan...</Text>
          </View>
        )}

        {state.status === "FAILED_PLANNING" && (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Plan failed</Text>
            <Text style={styles.errorDetail}>{state.reason}</Text>
            <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
          </View>
        )}

        {(state.status === "AWAITING_APPROVAL" ||
          state.status === "EXECUTING" ||
          state.status === "STEP_FAILED" ||
          state.status === "COMPLETED") && (
          <View style={styles.planContainer}>
            <Text style={styles.sectionTitle}>Proposed Plan</Text>
            <Text style={styles.requestText}>"{request}"</Text>

            <View style={styles.stepsList}>
              {state.plan.map((step, i) => renderStep(step, i))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Footer for Actions */}
      <View style={styles.footer}>
        {state.status === "AWAITING_APPROVAL" && (
          <View style={styles.row}>
            <Button title="Modify" variant="ghost" onPress={reject} style={styles.flexButton} />
            <Button title="Approve & Run" onPress={approve} style={styles.flexButton} />
          </View>
        )}

        {state.status === "EXECUTING" && (
          <Button title="Running..." disabled onPress={() => {}} />
        )}

        {state.status === "STEP_FAILED" && (
          <View style={styles.row}>
            <Button title="Abort" variant="danger" onPress={() => router.back()} style={styles.flexButton} />
            <Button title="Skip & Continue" onPress={skip} style={styles.flexButton} />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: spacing.xl },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 },
  loadingText: { marginTop: spacing.md, fontSize: 16, color: colors.textMuted },
  errorText: { fontSize: 20, fontWeight: "600", color: colors.danger, marginBottom: spacing.sm },
  errorDetail: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  planContainer: { marginTop: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: spacing.xs },
  requestText: { fontSize: 14, color: colors.textMuted, fontStyle: "italic", marginBottom: spacing.lg },
  stepsList: { gap: spacing.sm },
  stepCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
  },
  stepIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.md },
  stepContent: { flex: 1 },
  stepDescription: { fontSize: 15, fontWeight: "500", color: colors.text, marginBottom: 4 },
  stepMeta: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  row: { flexDirection: "row", gap: spacing.md },
  flexButton: { flex: 1 },
});