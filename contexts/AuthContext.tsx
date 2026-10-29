// contexts/AuthContext.tsx
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { AppState } from "react-native";
import { createClient, User } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../constants/config";

WebBrowser.maybeCompleteAuthSession();

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Where Supabase sends the user back to the app (Google login, email-confirmation links). */
const authRedirect = () => Linking.createURL("login");

/** Turns a deep link coming back from Supabase into a real session. */
async function createSessionFromUrl(url: string): Promise<boolean> {
  const { queryParams } = Linking.parse(url);
  const hash = url.includes("#") ? url.split("#")[1] : "";
  const hashParams = new URLSearchParams(hash);

  const errorDesc = (queryParams?.error_description as string | undefined) || hashParams.get("error_description");
  if (errorDesc) throw new Error(errorDesc);

  const code = queryParams?.code;
  if (typeof code === "string") {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }

  const access_token = hashParams.get("access_token");
  const refresh_token = hashParams.get("refresh_token");
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return true;
  }
  return false;
}

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** needsConfirmation = true when Supabase requires the user to confirm their email first. */
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const handledUrl = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (data) setProfile(data);
    } catch (e) {
      console.warn("Profile fetch failed", e);
    } finally {
      // Always release the loading screen, even if the network call fails.
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile(session.user.id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Deferred: calling Supabase inside this callback can deadlock the client.
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [fetchProfile]);

  // Only refresh tokens while the app is in the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => sub.remove();
  }, []);

  // Handle email-confirmation links / OAuth returns that open the app.
  const handleUrl = useCallback(async (url: string | null) => {
    if (!url || handledUrl.current === url) return;
    if (!url.includes("login") || !(url.includes("access_token") || url.includes("code=") || url.includes("error"))) return;
    handledUrl.current = url;
    try {
      await createSessionFromUrl(url);
    } catch (e) {
      console.warn("Auth link error", e);
    }
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [handleUrl]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authRedirect() },
    });
    if (error) throw error;

    // With email confirmation on, Supabase returns a fake "success" for emails that already exist.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error("An account with this email already exists. Try signing in instead.");
    }

    // The profile row is created by a database trigger (see supabase/profiles_trigger.sql),
    // because there is no session yet to satisfy row-level security when confirmation is required.
    return { needsConfirmation: !data.session };
  };

  const signInWithGoogle = async () => {
    const redirectTo = authRedirect();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new Error("Could not start Google sign-in.");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success") return; // user closed the browser

    if (handledUrl.current !== result.url) {
      handledUrl.current = result.url;
      const ok = await createSessionFromUrl(result.url);
      if (!ok) throw new Error("Google sign-in did not complete. Please try again.");
    }
  };

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: authRedirect() },
    });
    if (error) throw error;
  };

  const updateProfile = async (name: string) => {
    if (!user) return;
    await supabase.from("profiles").upsert({ id: user.id, full_name: name, updated_at: new Date().toISOString() });
    setProfile((prev) => ({ ...prev, full_name: name } as Profile));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signUp, signInWithGoogle, resendConfirmation, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);