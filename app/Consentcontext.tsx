// contexts/ConsentContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "has_consented";

type ConsentContextValue = {
  hasConsent: boolean;
  checking: boolean;
  grantConsent: () => Promise<void>;
};

const ConsentContext = createContext<ConsentContextValue>({
  hasConsent: false,
  checking: true,
  grantConsent: async () => {},
});

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [hasConsent, setHasConsent] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [secure, plain] = await Promise.all([
          SecureStore.getItemAsync(KEY).catch(() => null),
          AsyncStorage.getItem(KEY).catch(() => null),
        ]);
        setHasConsent(secure === "true" || plain === "true");
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const grantConsent = useCallback(async () => {
    // Update state first so the navigation guard sees it immediately,
    // then persist (failures shouldn't block the user).
    setHasConsent(true);
    await Promise.all([
      SecureStore.setItemAsync(KEY, "true").catch(() => {}),
      AsyncStorage.setItem(KEY, "true").catch(() => {}),
    ]);
  }, []);

  const value = useMemo(() => ({ hasConsent, checking, grantConsent }), [hasConsent, checking, grantConsent]);

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export const useConsent = () => useContext(ConsentContext);