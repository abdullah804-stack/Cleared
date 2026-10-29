// constants/config.ts
// ONE place for backend settings. Everything else imports from here.
//
// The Supabase anon key is public by design (row-level security protects the data),
// so a fallback literal is fine. To override per environment, set EXPO_PUBLIC_SUPABASE_URL /
// EXPO_PUBLIC_SUPABASE_ANON_KEY (in a local .env file or GitHub Actions `env:`).
// NEVER put a service_role key or any OpenRouter/AI key in the app.
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://gevnakyvjxvnzasruzwh.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdldm5ha3l2anh2bnphc3J1endoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MjE5MzAsImV4cCI6MjEwODM5NzkzMH0.6bYEiX5yEupRDZWJfhI2_VVPYbxJSVErCzTvv1hytfU";

export const PLAN_ENDPOINT = `${SUPABASE_URL}/functions/v1/plan`;

// While availability + booking are simulated (see shared/tools.ts), the app says so on the
// appointment screen. Set to false ONLY once bookings really reach a clinic.
export const BOOKINGS_ARE_SIMULATED = true;