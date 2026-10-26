// contexts/LanguageContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations, Language } from "../constants/translations";

interface LanguageContextType {
  lang: Language;
  t: typeof translations.en;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType>({} as LanguageContextType);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    AsyncStorage.getItem("app_language").then((saved) => {
      if (saved === "ur" || saved === "en") setLang(saved);
    });
  }, []);

  const toggleLanguage = async () => {
    const newLang = lang === "en" ? "ur" : "en";
    setLang(newLang);
    await AsyncStorage.setItem("app_language", newLang);
    
    // Flip the layout for Urdu (RTL)
    const isRTL = newLang === "ur";
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      // Note: In a real production app, you would use expo-updates to reload the app here.
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);