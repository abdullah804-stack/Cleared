// app/(auth)/login.tsx
import { useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Gradient, RadialGlow } from "../../components/Gradient";
import { LogoMark } from "../../components/LogoMark";
import { useThemeColors, ThemeColors, gradients, radius, spacing, type } from "../../constants/theme";
import { useAuth } from "../../contexts/AuthContext";

const HERO_CHIPS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: "sparkles", label: "AI-planned" },
  { icon: "checkmark-done", label: "You approve" },
  { icon: "lock-closed", label: "Private" },
];

export default function LoginScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set when Supabase needs the user to confirm their email
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);
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
        await signUp(e, password);
        setPendingEmail(e);
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

  const backToSignIn = () => {
    setPendingEmail(null);
    setError(null);
    setIsLogin(true);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {/* ── Hero ─────────────────────────────── */}
          <Gradient colors={gradients.hero} style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
            <RadialGlow color="#0EA5E9" size={360} opacity={0.4} style={styles.glowTopRight} />
            <RadialGlow color="#14B8A6" size={300} opacity={0.28} style={styles.glowBottomLeft} />

            <Animated.View entering={ZoomIn.duration(600).springify().damping(14)} style={styles.logoRing}>
              <LogoMark size={54} />
            </Animated.View>
            <Animated.Text entering={FadeInDown.delay(150).duration(500)} style={styles.brand}>
              Cleared
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(250).duration(500)} style={styles.tagline}>
              Approve the plan before the AI acts.
            </Animated.Text>

            <Animated.View entering={FadeInUp.delay(450).duration(500)} style={styles.chips}>
              {HERO_CHIPS.map((c) => (
                <View key={c.label} style={styles.chip}>
                  <Ionicons name={c.icon} size={12} color="#7DD3FC" />
                  <Text style={styles.chipText}>{c.label}</Text>
                </View>
              ))}
            </Animated.View>
          </Gradient>

          {/* ── Sheet ────────────────────────────── */}
          <Animated.View
            entering={FadeInUp.delay(200).springify().damping(18)}
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
          >
            {pendingEmail ? (
              <Animated.View key="confirm" entering={FadeIn.duration(250)}>
                <View style={styles.mailIcon}>
                  <Ionicons name="mail-open-outline" size={32} color={colors.accentStrong} />
                </View>
                <Text style={styles.centerTitle}>Confirm your email</Text>
                <Text style={styles.confirmText}>
                  We sent a link to <Text style={{ fontWeight: "700", color: colors.text }}>{pendingEmail}</Text>. Open it on this phone, then
                  come back and sign in.
                </Text>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <Button title="I've confirmed. Sign in" onPress={backToSignIn} style={{ marginTop: spacing.lg }} />
              </Animated.View>
            ) : (
              <Animated.View key={isLogin ? "login" : "signup"} entering={FadeIn.duration(250)}>
                <Text style={styles.title}>{isLogin ? "Welcome back" : "Create your account"}</Text>
                <Text style={styles.sub}>{isLogin ? "Sign in to continue your care plan." : "It takes less than a minute."}</Text>

                <Button
                  title={googleLoading ? "Opening Google…" : "Continue with Google"}
                  variant="ghost"
                  icon="logo-google"
                  onPress={handleGoogle}
                  disabled={busy}
                  style={{ marginTop: spacing.lg }}
                />

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or use email</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.fields}>
                  <Input
                    icon="mail-outline"
                    placeholder="Email address"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => (passwordRef.current as unknown as { focus: () => void } | null)?.focus()}
                    error={!!error && !email}
                  />
                  <Input
                    ref={(instance) => { passwordRef.current = instance as unknown as TextInput | null; }}
                    icon="lock-closed-outline"
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    returnKeyType="go"
                    onSubmitEditing={handleAuth}
                    error={!!error && !password}
                  />
                </View>

                {error && (
                  <Animated.View entering={FadeInDown.duration(220)} style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color={colors.danger} />
                    <Text style={styles.errorBoxText}>{error}</Text>
                  </Animated.View>
                )}

                <Button
                  title={isLogin ? "Sign In" : "Create Account"}
                  onPress={handleAuth}
                  loading={loading}
                  disabled={googleLoading}
                  style={{ marginTop: spacing.md }}
                />

                <Pressable
                  onPress={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                  }}
                  style={styles.toggle}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text style={styles.toggleText}>
                    {isLogin ? "New here? " : "Already have an account? "}
                    <Text style={styles.toggleLink}>{isLogin ? "Create an account" : "Sign in"}</Text>
                  </Text>
                </Pressable>
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: "#061523" },
    scroll: { flexGrow: 1 },

    hero: { alignItems: "center", paddingBottom: spacing.xl + 28 },
    glowTopRight: { position: "absolute", top: -140, right: -120 },
    glowBottomLeft: { position: "absolute", bottom: -150, left: -130 },
    logoRing: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
    },
    brand: { marginTop: spacing.md, fontSize: 36, fontWeight: "800", color: "#FFFFFF", letterSpacing: -1 },
    tagline: { marginTop: 6, fontSize: 15, color: "rgba(255,255,255,0.72)" },
    chips: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.16)",
    },
    chipText: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.88)" },

    sheet: {
      flexGrow: 1,
      marginTop: -28,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg + 4,
    },
    title: { ...type.title, color: colors.text },
    sub: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
    centerTitle: { ...type.title, color: colors.text, textAlign: "center", marginTop: spacing.md },

    dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, marginVertical: spacing.lg },
    dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    dividerText: { ...type.caption, color: colors.textMuted },

    fields: { gap: spacing.md },

    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.dangerMuted,
      padding: spacing.sm + 4,
      borderRadius: radius.sm,
      marginTop: spacing.md,
    },
    errorBoxText: { flex: 1, fontSize: 13, color: colors.danger, fontWeight: "600", lineHeight: 18 },
    errorText: { fontSize: 13, color: colors.danger, fontWeight: "600", textAlign: "center", marginTop: spacing.md },

    toggle: { marginTop: spacing.lg, alignItems: "center", paddingVertical: spacing.xs },
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