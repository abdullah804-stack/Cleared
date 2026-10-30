// app/chat.tsx
import { useState, useRef } from "react";
import { StyleSheet, Text, View, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hi there! I'm Cleared, your AI dental assistant. Do you have any questions about your symptoms, a procedure, or your care plan? (Please note: I am an AI, not a doctor).",
};

export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: textToSend };
    const updatedMessages = [...messages, userMsg];
    
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    
    // Auto-scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Send to Supabase Edge Function
      const res = await fetch("https://gevnakyvjxvnzasruzwh.supabase.co/functions/v1/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdldm5ha3l2anh2bnphc3J1endoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MjE5MzAsImV4cCI6MjEwODM5NzkzMH0.6bYEiX5yEupRDZWJfhI2_VVPYbxJSVErCzTvv1hytfU`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      
      if (data?.choices?.[0]?.message?.content) {
        const aiMsg: Message = {
          id: Date.now().toString() + "-ai",
          role: "assistant",
          content: data.choices[0].message.content.trim(),
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error("Invalid response from AI");
      }
    } catch (error) {
      const errorMsg: Message = {
        id: Date.now().toString() + "-err",
        role: "assistant",
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scroll}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.messageRow, msg.role === "user" ? styles.userRow : styles.aiRow]}>
              {msg.role === "assistant" && (
                <View style={styles.aiAvatar}>
                  <Ionicons name="medical" size={16} color="#FFF" />
                </View>
              )}
              <View style={[styles.bubble, msg.role === "user" ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.messageText, msg.role === "user" ? styles.userText : styles.aiText]}>
                  {msg.content}
                </Text>
              </View>
            </View>
          ))}

          {isLoading && (
            <View style={[styles.messageRow, styles.aiRow]}>
              <View style={styles.aiAvatar}>
                <Ionicons name="medical" size={16} color="#FFF" />
              </View>
              <View style={[styles.bubble, styles.aiBubble, { width: 60, alignItems: "center" }]}>
                <Text style={{ fontSize: 18, color: colors.textMuted }}>•••</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your teeth..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable 
            style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]} 
            onPress={() => handleSend()}
            disabled={!input.trim() || isLoading}
          >
            <Ionicons name="arrow-up" size={20} color="#FFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  messageRow: { flexDirection: "row", marginBottom: spacing.md, alignItems: "flex-end" },
  userRow: { justifyContent: "flex-end" },
  aiRow: { justifyContent: "flex-start" },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", marginRight: spacing.sm, marginBottom: 4 },
  
  bubble: { maxWidth: "80%", padding: spacing.md, borderRadius: radius.xl },
  userBubble: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: "#FFF" },
  aiText: { color: colors.text },

  inputContainer: { flexDirection: "row", alignItems: "center", padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: radius.xl, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm, fontSize: 15, color: colors.text, maxHeight: 100, minHeight: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", marginLeft: spacing.sm },
});