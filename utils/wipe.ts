// utils/wipe.ts
// "Delete My Data": erases everything Cleared stores about the user, on this phone and in the cloud.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, Paths } from "expo-file-system";
import { clearAuditLog } from "../shared/audit";
import { clearRoutine } from "../shared/routine";
import { clearRecovery } from "../shared/recovery";
import { supabase } from "../contexts/AuthContext";

// Every AsyncStorage key the app writes. If you add a feature that stores something, add its key here.
const LOCAL_KEYS = [
  "current_care_plan",
  "care_plan_checks",
  "current_booking",
  "prep_checks",
  "visit_notes",
  "calendar_added",
  "family_profiles",
  "chat_history",
  "last_request",
  "case_card_status",
  "case_card_phone",
  "ramadan_settings",
  "kids_progress",
];

export async function deleteAllLocalData(userId?: string): Promise<void> {
  // Older builds logged under placeholder ids; clear those too.
  const ids = Array.from(new Set([userId, "demo-user-123", "anonymous"].filter(Boolean) as string[]));

  await Promise.all(ids.map((id) => clearAuditLog(id)));
  await clearRoutine();
  await clearRecovery();
  await AsyncStorage.multiRemove(LOCAL_KEYS);

  // Teeth photos live in a folder in the app's private storage.
  try {
    const photos = new Directory(Paths.document, "teeth_photos");
    if (photos.exists) photos.delete();
  } catch {}

  // Remove the cloud profile row (name / avatar). Needs the "delete own profile" policy
  // from supabase/profiles_trigger.sql. Failure here shouldn't block the local wipe.
  if (userId) {
    try {
      await supabase.from("profiles").delete().eq("id", userId);
    } catch {}
    // Community price reports they submitted (needs the delete policy in supabase/price_reports.sql)
    try {
      await supabase.from("price_reports").delete().eq("user_id", userId);
    } catch {}
    // Saved bookings too (needs the delete policy in supabase/appointments.sql)
    try {
      await supabase.from("appointments").delete().eq("user_id", userId);
    } catch {}
  }
}