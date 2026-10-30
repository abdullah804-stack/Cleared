// utils/wipe.ts
// "Delete My Data": erases everything Cleared stores about the user.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAuditLog } from "../shared/audit";
import * as journal from "../shared/journal";
import { supabase } from "../contexts/AuthContext";

const LOCAL_KEYS = ["current_care_plan", "care_plan_checks", "current_booking"];

export async function deleteAllLocalData(userId?: string): Promise<void> {
  // Older builds logged under placeholder ids; clear those too.
  const ids = Array.from(new Set([userId, "demo-user-123", "anonymous"].filter(Boolean) as string[]));

  await Promise.all(ids.map((id) => clearAuditLog(id)));
  const clearJournal = (journal as any).clearJournal ?? (journal as any).clearPainJournal;
  if (typeof clearJournal === "function") await clearJournal();
  await AsyncStorage.multiRemove(LOCAL_KEYS);

  // Remove the cloud profile row (name / avatar). Needs the "delete own profile" policy
  // from supabase/profiles_trigger.sql. Failure here shouldn't block the local wipe.
  if (userId) {
    try {
      await supabase.from("profiles").delete().eq("id", userId);
    } catch {}
    // Saved bookings too (needs the delete policy in supabase/appointments.sql)
    try {
      await supabase.from("appointments").delete().eq("user_id", userId);
    } catch {}
  }
}