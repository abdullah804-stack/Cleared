// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient, User } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";

// Needed so the auth browser session closes properly after redirect.
WebBrowser.maybeCompleteAuthSession();

// Uses EXPO_PUBLIC_* env vars when present (set in eas.json / EAS environment variables),
// otherwise falls back to the values below. The anon key is designed to be public,
// but keep Row Level Security enabled on all your tables.
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://gevnakyvjxvnzasruzwh.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdldm5ha3l2anh2bnphc3J1endoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MjE5MzAsImV4cCI6MjEwODM5NzkzMH0.6bYEiX5yEupRDZWJfhI2_VVPYbxJSVErCzTvv1hytfU";

// This must match "scheme" in app.json and be listed in Supabase -> Redirect URLs.
const REDIRECT_URL = "cleared://";

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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new Error("No Google sign-in URL returned");

    const res = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);
    if (res.type !== "success") return; // user closed or cancelled the browser

    const { url } = res;

    // Case 1: PKCE-style response -> cleared://?code=...
    const queryString = url.split("?")[1]?.split("#")[0] ?? "";
    const code = new URLSearchParams(queryString).get("code");
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
      return;
    }

    // Case 2: Implicit response -> cleared://#access_token=...&refresh_token=...
    const hash = new URLSearchParams(url.split("#")[1] ?? "");
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (!accessToken || !refreshToken) {
      throw new Error(hash.get("error_description") ?? "Google sign-in did not return a session");
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw sessionError;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);