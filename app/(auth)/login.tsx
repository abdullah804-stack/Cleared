// app/(auth)/login.tsx
import { useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Image,
  type TextInputInstance,
} from "react-native";
import { Screen } from "../../components/Screen";
import { Button } from "../../components/Button";
import { useThemeColors, ThemeColors, radius, spacing, shadows, type } from "../../constants/theme";
import { useAuth } from "../../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signIn, signUp, signInWithGoogle, resendConfirmation } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set when Supabase needs the user to confirm their email
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  const passwordRef = useRef<TextInputInstance>(null);
  const busy = loading || googleLoading;

  // No manual navigation: the root layout redirects as soon as a session exists.
  const handleAuth = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !password) return setError("Please enter your email and password.");
    if (!/^\S+@\S+\.\S+$/.test(e)) return setError("Enter a valid email address.");
    if (!isLogin && password.length < 6) return setError("Password must be at least 6 characters.");

    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(e, password);
      } else {
        const { needsConfirmation } = await signUp(e, password);
        if (needsConfirmation) setPendingEmail(e);
      }
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      if (/not confirmed/i.test(msg)) setPendingEmail(e);
      else if (/invalid login/i.test(msg)) setError("Incorrect email or password.");
      else setError(msg || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setResendState("sending");
    try {
      await resendConfirmation(pendingEmail);
      setResendState("sent");
    } catch (err: any) {
      setResendState("idle");
      setError(err?.message || "Could not resend the email. Try again in a minute.");
    }
  };

  const backToSignIn = () => {
    setPendingEmail(null);
    setResendState("idle");
    setError(null);
    setIsLogin(true);
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "padding"}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image source={require("../../assets/images/icon.png")} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.title}>Cleared</Text>
            <Text style={styles.subtitle}>Approve the plan before the AI acts.</Text>
          </View>

          {pendingEmail ? (
            <View style={styles.card}>
              <View style={styles.mailIcon}>
                <Ionicons name="mail-open-outline" size={32} color={colors.accentStrong} />
              </View>
              <Text style={styles.cardTitleCenter}>Confirm your email</Text>
              <Text style={styles.confirmText}>
                We sent a link to <Text style={{ fontWeight: "700", color: colors.text }}>{pendingEmail}</Text>. Open it on this phone,
                then come back and sign in.
              </Text>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Button
                title={resendState === "sent" ? "Email sent — check your inbox" : "Resend confirmation email"}
                variant="soft"
                onPress={handleResend}
                loading={resendState === "sending"}
                disabled={resendState === "sent"}
                style={{ marginTop: spacing.lg }}
              />
              <Button title="I've confirmed — Sign in" onPress={backToSignIn} style={{ marginTop: spacing.sm }} />
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{isLogin ? "Welcome back" : "Create your account"}</Text>
              <Text style={styles.cardSub}>
                {isLogin ? "Sign in to continue your care plan." : "It takes less than a minute."}
              </Text>

              <Pressable
                style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.85 }, busy && { opacity: 0.6 }]}
                onPress={handleGoogle}
                disabled={busy}
              >
                <Ionicons name="logo-google" size={18} color={colors.text} />
                <Text style={styles.googleText}>{googleLoading ? "Opening Google…" : "Continue with Google"}</Text>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or use email</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={[styles.field, focused === "email" && styles.fieldFocused]}>
                <Ionicons name="mail-outline" size={18} color={focused === "email" ? colors.accent : colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>

              <View style={[styles.field, focused === "password" && styles.fieldFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={focused === "password" ? colors.accent : colors.textMuted} />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  returnKeyType="go"
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  onSubmitEditing={handleAuth}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10} accessibilityLabel="Show or hide password">
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorBoxText}>{error}</Text>
                </View>
              )}

              <Button
                title={isLogin ? "Sign In" : "Create Account"}
                onPress={handleAuth}
                loading={loading}
                disabled={googleLoading}
                style={{ marginTop: spacing.sm }}
              />

              <Pressable
                onPress={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                style={styles.toggleContainer}
                hitSlop={8}
              >
                <Text style={styles.toggleText}>
                  {isLogin ? "New here? " : "Already have an account? "}
                  <Text style={styles.toggleLink}>{isLogin ? "Create an account" : "Sign in"}</Text>
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { flexGrow: 1, justifyContent: "center", paddingVertical: spacing.lg },
    logoContainer: { alignItems: "center", marginBottom: spacing.xl },
    logoImage: { width: 84, height: 84, marginBottom: spacing.md, borderRadius: 22 },
    title: { ...type.display, color: colors.text },
    subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },

    card: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.md,
    },
    cardTitle: { ...type.title, color: colors.text },
    cardTitleCenter: { ...type.title, color: colors.text, textAlign: "center", marginTop: spacing.md },
    cardSub: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: spacing.lg },

    googleBtn: {
      height: 52,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm + 2,
      ...shadows.sm,
    },
    googleText: { fontSize: 15, fontWeight: "600", color: colors.text },

    dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, marginVertical: spacing.lg },
    dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    dividerText: { ...type.caption, color: colors.textMuted },

    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      height: 54,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1.5,
      borderColor: "transparent",
      borderRadius: radius.md,
      marginBottom: spacing.md,
    },
    fieldFocused: { borderColor: colors.accent, backgroundColor: colors.surface },
    input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 0 },

    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.dangerMuted,
      padding: spacing.sm + 4,
      borderRadius: radius.sm,
      marginBottom: spacing.xs,
    },
    errorBoxText: { flex: 1, fontSize: 13, color: colors.danger, fontWeight: "600", lineHeight: 18 },
    errorText: { fontSize: 13, color: colors.danger, fontWeight: "600", textAlign: "center", marginTop: spacing.md },

    toggleContainer: { marginTop: spacing.lg, alignItems: "center", paddingVertical: spacing.xs },
    toggleText: { color: colors.textMuted, fontSize: 14 },
    toggleLink: { color: colors.accentStrong, fontWeight: "700" },

    mailIcon: {
      alignSelf: "center",
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accentMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmText: { fontSize: 14, lineHeight: 21, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
  });