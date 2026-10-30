// app/appointment.tsx
import { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Linking } from "react-native";
import { useRouter } from "expo-router";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from "react-native-reanimated";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function AppointmentScreen() {
  const router = useRouter();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const scale = useSharedValue(0);
  const animatedIconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const [appointmentTime, setAppointmentTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  });
  
  const [showPicker, setShowPicker] = useState(false);
  const [timeLeft, setTimeLeft] = useState(appointmentTime.getTime() - Date.now());
  
  const [carePlan, setCarePlan] = useState<string[]>([]);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // New state for clinic contact
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicName, setClinicName] = useState("Dental Clinic");

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 100 }),
      withSpring(1, { damping: 10, stiffness: 100 })
    );

    const loadData = async () => {
      const savedPlan = await AsyncStorage.getItem("current_care_plan");
      const savedChecks = await AsyncStorage.getItem("care_plan_checks");
      const savedPhone = await AsyncStorage.getItem("clinic_phone");
      const savedName = await AsyncStorage.getItem("clinic_name");
      
      if (savedPlan) setCarePlan(JSON.parse(savedPlan));
      else setCarePlan(["Avoid very cold or hot foods until evaluated.", "Use desensitizing toothpaste and avoid hard chewing."]);

      if (savedChecks) setCheckedItems(JSON.parse(savedChecks));
      if (savedPhone) setClinicPhone(savedPhone);
      if (savedName) setClinicName(savedName);
    };
    loadData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = appointmentTime.getTime() - Date.now();
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [appointmentTime]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleCheck = async (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newChecked = { ...checkedItems, [index]: !checkedItems[index] };
    setCheckedItems(newChecked);
    await AsyncStorage.setItem("care_plan_checks", JSON.stringify(newChecked));
  };

  const handleWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Remove '+' and spaces for WhatsApp URL
    const cleanPhone = clinicPhone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`Hello ${clinicName}, I just booked an appointment through the Cleared app for tomorrow at 10:00 AM. I would like to confirm my slot.`);
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${message}`);
  };

  const handleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${clinicPhone}`);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.successHeader}>
          <Animated.View style={[styles.checkCircle, animatedIconStyle]}>
            <Ionicons name="checkmark" size={40} color="#FFF" />
          </Animated.View>
          <Text style={styles.title}>Booked Successfully</Text>
          <Text style={styles.subtitle}>{clinicName}</Text>
        </View>

        <View style={styles.ticket}>
          <View style={styles.ticketTop}>
            <Text style={styles.timerLabel}>TIME UNTIL APPOINTMENT</Text>
            <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
          </View>
        </View>

        {/* WHATSAPP & CALL BUTTONS */}
        <Text style={styles.sectionTitle}>Confirm with Clinic</Text>
        <View style={styles.contactRow}>
          <Pressable style={styles.whatsappBtn} onPress={handleWhatsApp}>
            <Ionicons name="logo-whatsapp" size={24} color="#FFF" />
            <Text style={styles.contactText}>WhatsApp</Text>
          </Pressable>
          <Pressable style={styles.callBtn} onPress={handleCall}>
            <Ionicons name="call" size={24} color="#FFF" />
            <Text style={styles.contactText}>Call Clinic</Text>
          </Pressable>
        </View>

        <View style={styles.carePlanCard}>
          <View style={styles.carePlanHeader}>
            <Text style={styles.sectionTitle}>AI Pre-Visit Care Plan</Text>
            <Pressable onPress={() => {
              if (isSpeaking) { Speech.stop(); setIsSpeaking(false); }
              else { Speech.speak(carePlan.join(". "), { onDone: () => setIsSpeaking(false) }); setIsSpeaking(true); }
            }} style={styles.speakerBtn}>
              <Ionicons name={isSpeaking ? "stop-circle" : "volume-high"} size={24} color={colors.accent} />
            </Pressable>
          </View>
          
          {carePlan.map((item, index) => (
            <Pressable key={index} style={styles.careItem} onPress={() => toggleCheck(index)}>
              <Ionicons 
                name={checkedItems[index] ? "checkbox" : "square-outline"} 
                size={24} 
                color={checkedItems[index] ? colors.accent : colors.border} 
              />
              <Text style={[styles.careItemDesc, checkedItems[index] && styles.careItemDone]}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Button title="View Audit Log" onPress={() => router.push("/audit")} />
        <Button title="Book another" variant="ghost" onPress={() => router.replace("/")} style={{ marginTop: spacing.sm }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 120 },
  successHeader: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
  checkCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center", marginBottom: spacing.md, shadowColor: "#10B981", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  title: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 16, color: colors.textMuted },
  ticket: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl, overflow: "hidden" },
  ticketTop: { padding: spacing.xl, alignItems: "center" },
  timerLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  timerValue: { fontSize: 48, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"], letterSpacing: 2 },
  
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  
  contactRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  whatsappBtn: { flex: 1, flexDirection: "row", backgroundColor: "#25D366", padding: spacing.md, borderRadius: radius.md, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  callBtn: { flex: 1, flexDirection: "row", backgroundColor: colors.accent, padding: spacing.md, borderRadius: radius.md, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  contactText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  carePlanCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.xl },
  carePlanHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  speakerBtn: { padding: spacing.xs, backgroundColor: "#E0E7FF", borderRadius: radius.full },
  careItem: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, alignItems: "center" },
  careItemDesc: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 20 },
  careItemDone: { textDecorationLine: "line-through", color: colors.textMuted },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});