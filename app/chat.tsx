// app/chat.tsx
// AI dental assistant. Chat history is kept on the phone only. Calls the Supabase `chat` function with the user's own session token.
import { ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import Animated, { FadeInDown, FadeIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Gradient } from "../components/Gradient";
import { useThemeColors, ThemeColors, gradients, radius, spacing, shadows } from "../constants/theme";
import { CHAT_ENDPOINT, SUPABASE_ANON_KEY } from "../constants/config";
import { isEmergency } from "../constants/emergency";
import { supabase } from "../contexts/AuthContext";

type Message = { id: string; role: "user" | "assistant"; content: string };

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hi, I'm Cleared. Ask me about a symptom, a procedure or your care plan. I'm an AI, not a doctor, so for anything serious please see a dentist.",
};

const SUGGESTIONS = ["Is a toothache normal after a filling?", "How do I ease swelling at home?", "What happens in a root canal?", "Can I eat after an extraction?"];
const MAX_KEPT = 40;

function Dot({ delay }: { delay: number }) {
  const colors = useThemeColors();
  const v = useSharedValue(0.3);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 420 }), withTiming(0.3, { duration: 420 })), -1));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.8 + v.value * 0.3 }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textMuted }, style]} />;
}

export default function ChatScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const sentQ = useRef(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const loaded = useRef(false);

  // Load saved chat once.
  useEffect(() => {
    AsyncStorage.getItem("chat_history")
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw) as Message[];
          if (Array.isArray(saved) && saved.length) setMessages(saved);
        }
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem("chat_history", JSON.stringify(messages.slice(-MAX_KEPT))).catch(() => {});
  }, [messages]);

  const clearChat = useCallback(() => {
    Alert.alert("Clear this chat?", "The conversation is deleted from this phone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setMessages([WELCOME]);
          setUrgent(false);
          AsyncStorage.removeItem("chat_history").catch(() => {});
        },
      },
    ]);
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={clearChat} hitSlop={12} accessibilityRole="button" accessibilityLabel="Clear chat">
          <Ionicons name="trash-outline" size={21} color={colors.textMuted} />
        </Pressable>
      ),
    });
  }, [navigation, clearChat, colors]);

  const toEnd = () => setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 80);

  const send = async (custom?: string) => {
    const text = (custom ?? input).trim();
    if (!text || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (isEmergency(text)) setUrgent(true);
    const userMsg: Message = { id: `${Date.now()}`, role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    toEnd();

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? SUPABASE_ANON_KEY;
      // The server tries several AI models; we allow it time, and retry once if the connection drops.
      let res: Response | null = null;
      let json: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 55000);
        try {
          res = await fetch(CHAT_ENDPOINT, {
            method: "POST",
            signal: ctrl.signal,
            headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
            // Only the last few turns go to the AI: cheaper, faster, and less personal data leaves the phone.
            body: JSON.stringify({ messages: next.slice(-12).map((m) => ({ role: m.role, content: m.content })) }),
          });
          json = await res.json().catch(() => ({}));
          if (res.status === 429 || res.status === 401 || res.ok) break;
        } catch (err) {
          if (attempt === 1) throw err;
        } finally {
          clearTimeout(timer);
        }
      }
      if (!res) throw new Error("empty");
      if (res.status === 429) throw new Error(json?.error || "You're asking quickly. Please wait a minute and try again.");
      const reply = json?.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new Error(res.status === 401 ? "Please sign in again to use the chat." : json?.error || "empty");
      setMessages((p) => [...p, { id: `${Date.now()}-ai`, role: "assistant", content: reply }]);
    } catch (e: any) {
      const msg = e?.message && e.message !== "empty" && !/network|fetch|JSON/i.test(e.message) ? e.message : "I couldn't connect just now. Check your internet and try again.";
      setMessages((p) => [...p, { id: `${Date.now()}-err`, role: "assistant", content: msg }]);
    } finally {
      setLoading(false);
      toEnd();
    }
  };

  // A question typed on the home screen is sent as soon as the saved chat has loaded.
  useEffect(() => {
    if (!q || sentQ.current) return;
    const t = setTimeout(() => {
      if (sentQ.current) return;
      sentQ.current = true;
      send(String(q));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const onlyWelcome = messages.length === 1;

  return (
    <Screen padded={false} edges={["left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        {urgent && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.urgent}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={styles.urgentText}>This may be urgent. Don't wait for a chat reply.</Text>
            <Pressable onPress={() => router.push("/emergency")} style={styles.urgentBtn} accessibilityRole="button">
              <Text style={styles.urgentBtnText}>Get help</Text>
            </Pressable>
          </Animated.View>
        )}

        <ScrollView
          ref={scroller}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m, i) => {
            const mine = m.role === "user";
            return (
              <Animated.View key={m.id} entering={FadeInDown.duration(320)} style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
                {!mine && (
                  <Gradient colors={gradients.brand} style={styles.avatar}>
                    <Ionicons name="medical" size={15} color="#FFFFFF" />
                  </Gradient>
                )}
                {mine ? (
                  <Gradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.bubbleMine]}>
                    <Text style={[styles.text, { color: "#FFFFFF" }]} selectable>{m.content}</Text>
                  </Gradient>
                ) : (
                  <View style={[styles.bubble, styles.bubbleTheirs]}>
                    <Text style={styles.text} selectable>{m.content}</Text>
                  </View>
                )}
              </Animated.View>
            );
          })}

          {!loading && messages.length > 2 && messages[messages.length - 1].role === "assistant" && !messages[messages.length - 1].id.endsWith("-err") && (
            <Animated.View entering={FadeIn.duration(300)} style={{ paddingLeft: 36 }}>
              <Pressable onPress={() => send("Please explain that in more detail.")} style={styles.more} accessibilityRole="button">
                <Ionicons name="add-circle-outline" size={15} color={colors.accentStrong} />
                <Text style={styles.chipText}>Tell me more</Text>
              </Pressable>
            </Animated.View>
          )}

          {loading && (
            <Animated.View entering={FadeIn} style={[styles.row, styles.rowTheirs]}>
              <Gradient colors={gradients.brand} style={styles.avatar}>
                <Ionicons name="medical" size={15} color="#FFFFFF" />
              </Gradient>
              <View style={[styles.bubble, styles.bubbleTheirs, styles.typing]}>
                <Dot delay={0} />
                <Dot delay={150} />
                <Dot delay={300} />
              </View>
            </Animated.View>
          )}

          {onlyWelcome && !loading && (
            <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.chips}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} onPress={() => send(s)} style={styles.chip} accessibilityRole="button">
                  <Text style={styles.chipText}>{s}</Text>
                </Pressable>
              ))}
            </Animated.View>
          )}
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your teeth..."
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accent}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={600}
            onSubmitEditing={() => send()}
          />
          <Pressable
            onPress={() => send()}
            disabled={!input.trim() || loading}
            style={[styles.send, (!input.trim() || loading) && { opacity: 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel="Send"
          >
            <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    list: { padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm },
    row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
    rowMine: { justifyContent: "flex-end" },
    rowTheirs: { justifyContent: "flex-start" },
    avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 2 },
    bubble: { maxWidth: "80%", paddingHorizontal: 14, paddingVertical: 10 },
    bubbleMine: { borderRadius: 20, borderBottomRightRadius: 6 },
    bubbleTheirs: { borderRadius: 20, borderBottomLeftRadius: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
    text: { fontSize: 15.5, lineHeight: 22, color: colors.text },
    typing: { flexDirection: "row", gap: 5, paddingVertical: 16, paddingHorizontal: 16 },

    more: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.accentMuted, borderWidth: 1, borderColor: "rgba(34,211,238,0.35)" },
    chips: { gap: spacing.sm, marginTop: spacing.md, alignItems: "flex-start", paddingLeft: 36 },
    chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, backgroundColor: colors.accentMuted },
    chipText: { fontSize: 13.5, fontWeight: "600", color: colors.accentStrong },

    urgent: { flexDirection: "row", alignItems: "center", gap: spacing.sm, margin: spacing.md, marginBottom: 0, padding: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.dangerMuted },
    urgentText: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.text },
    urgentBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.danger },
    urgentBtnText: { fontSize: 12.5, fontWeight: "800", color: colors.onDanger },

    composer: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    input: { flex: 1, maxHeight: 120, minHeight: 44, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 22, backgroundColor: colors.surfaceAlt, fontSize: 15.5, color: colors.text },
    send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  });