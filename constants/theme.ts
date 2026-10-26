// constants/theme.ts
import { useColorScheme } from "react-native";

export const lightColors = {
  background: "#F9FAFB",
  surface: "#FFFFFF",
  text: "#111827",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  accent: "#2563EB",
  danger: "#EF4444",
};

export const darkColors = {
  background: "#111827",
  surface: "#1F2937",
  text: "#F9FAFB",
  textMuted: "#9CA3AF",
  border: "#374151",
  accent: "#3B82F6",
  danger: "#F87171",
};

// Hook to use in components
export function useThemeColors() {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkColors : lightColors;
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 12, full: 9999 };

// Keep `colors` for backward compatibility with any files we haven't updated yet
export const colors = lightColors;