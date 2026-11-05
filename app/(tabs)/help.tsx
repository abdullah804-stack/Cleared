import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { TabPage, ToolRow } from "../../components/TabPage";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { HELP_TOOLS } from "../../constants/tools";
import { useThemeColors, ThemeColors, spacing } from "../../constants/theme";

export default function HelpTab() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  return (
    <TabPage title="Get help" subtitle="Urgent steps, questions and your case file." icon="medkit" tint="#22D3EE">
      <Animated.View entering={FadeInDown.delay(60).duration(400)} style={{ marginBottom: spacing.md }}>
        <Card style={styles.urgent}>
          <View style={styles.urgentHead}>
            <View style={styles.urgentIcon}>
              <Ionicons name="alert-circle" size={26} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.urgentTitle}>Dental emergency?</Text>
              <Text style={styles.urgentSub}>Knocked-out tooth, bleeding, swelling. Works offline.</Text>
            </View>
          </View>
          <Button title="Open first-aid steps" icon="medkit" variant="danger" onPress={() => router.push("/emergency-aid" as never)} style={{ marginTop: spacing.md }} />
        </Card>
      </Animated.View>
      {HELP_TOOLS.map((t, i) => (
        <ToolRow key={t.path} tool={t} index={i + 1} />
      ))}
    </TabPage>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    // Opaque on purpose: a see-through card with a shadow shows a dark box behind it on Android.
    urgent: { backgroundColor: "#170A0F", borderColor: `${colors.danger}66`, shadowOpacity: 0, elevation: 0, padding: spacing.lg },
    urgentHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    urgentIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.dangerMuted, borderWidth: 1, borderColor: `${colors.danger}55` },
    urgentTitle: { fontSize: 17, fontWeight: "800", color: colors.danger },
    urgentSub: { fontSize: 13, lineHeight: 18, color: colors.text, opacity: 0.8, marginTop: 2 },
  });