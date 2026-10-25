// app/(auth)/login.tsx
import { useState } from "react";
import { StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../components/Screen";
import { Button } from "../../components/Button";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) return Alert.alert("Error", "Please fill in all fields.");
    setLoading(true);
    try {
      if (isLogin) await signIn(email, password);
      else await signUp(email, password);
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Authentication Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="medical" size={40} color={colors.accent} />
          </View>
          <Text style={styles.title}>Cleared</Text>
          <Text style={styles.subtitle}>Approve the plan before the AI acts.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isLogin ? "Welcome Back" : "Create Account"}</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button 
            title={isLogin ? "Sign In" : "Sign Up"} 
            onPress={handleAuth} 
            loading={loading} 
            style={{ marginTop: spacing.md }}
          />

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  logoContainer: { alignItems: "center", marginBottom: spacing.xl },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#E0E7FF", alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  title: { fontSize: 32, fontWeight: "800", color: colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: spacing.lg },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.md, fontSize: 16, color: colors.text },
  toggleContainer: { marginTop: spacing.lg, alignItems: "center" },
  toggleText: { color: colors.accent, fontSize: 14, fontWeight: "500" },
});