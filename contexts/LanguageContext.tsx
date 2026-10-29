// contexts/LanguageContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations, Language } from "../constants/translations";

interface LanguageContextType {
  lang: Language;
  t: typeof translations.en;
  /** Switches English <-> Urdu. `restartRequired` is true when the text direction changed:
   *  Android only applies right-to-left layout after the app is fully closed and reopened,
   *  so show the user a "Restart the app to finish switching" message when this is true. */
  toggleLanguage: () => Promise<{ restartRequired: boolean }>;
}

const LanguageContext = createContext<LanguageContextType>({} as LanguageContextType);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    I18nManager.allowRTL(true);
    AsyncStorage.getItem("app_language")
      .then((saved) => {
        if (saved === "ur" || saved === "en") setLang(saved);
      })
      .catch(() => {});
  }, []);

  const toggleLanguage = useCallback(async () => {
    const newLang: Language = lang === "en" ? "ur" : "en";
    setLang(newLang);
    await AsyncStorage.setItem("app_language", newLang).catch(() => {});

    const wantRTL = newLang === "ur";
    let restartRequired = false;
    if (I18nManager.isRTL !== wantRTL) {
      I18nManager.forceRTL(wantRTL);
      restartRequired = true;
    }
    return { restartRequired };
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);