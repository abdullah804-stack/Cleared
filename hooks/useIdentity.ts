// hooks/useIdentity.ts
// Who the user is, as shown in the app: a friendly username (never the raw email) and one of five avatars.
import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { resolveAvatar } from "../components/Avatar";

function nameFromEmail(email?: string | null) {
  const local = (email ?? "").split("@")[0].replace(/[^a-zA-Z]+/g, " ").trim().split(" ")[0];
  if (!local) return "Friend";
  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
}

export function useIdentity() {
  const { user, profile, updateProfile } = useAuth() as any;
  const username: string = (profile?.full_name?.trim() || nameFromEmail(user?.email)).slice(0, 16);
  const avatarId = resolveAvatar(profile?.avatar_url, user?.id ?? user?.email ?? "");

  const setAvatar = useCallback(
    async (id: number) => {
      await updateProfile({ avatar_url: `avatar:${id}` });
    },
    [updateProfile]
  );

  return { username, avatarId, setAvatar };
}