// constants/theme.ts
import { Platform, TextStyle, ViewStyle, useColorScheme } from "react-native";

/* ------------------------------------------------------------------ */
/*  Color palette — calm clinical cyan/teal on cool, airy neutrals     */
/* ------------------------------------------------------------------ */

export const lightColors = {
  background: "#F5F8FB", // airy cool white
  surface: "#FFFFFF",
  surfaceAlt: "#F0F5F9", // inset fields, subtle fills
  text: "#0B1B2B", // deep navy-ink
  textMuted: "#5F7285", // cool slate
  border: "#E4EBF1", // hairline
  accent: "#0891B2", // clinical cyan
  accentStrong: "#0E7490", // text/icons on light tints
  accentMuted: "#E4F5F9",
  danger: "#E5484D",
  dangerMuted: "#FDECEC",
  success: "#12A594", // calming teal
  successMuted: "#DDF5F1",
  onAccent: "#FFFFFF",
  onDanger: "#FFFFFF",
};

export const darkColors = {
  background: "#0A1420",
  surface: "#111E2D",
  surfaceAlt: "#17283A",
  text: "#F1F6FA",
  textMuted: "#8FA3B6",
  border: "#1F3246",
  accent: "#22B8D9",
  accentStrong: "#7DD3FC",
  accentMuted: "#0C3140",
  danger: "#FF6B72",
  dangerMuted: "#3A1820",
  success: "#2DD4BF",
  successMuted: "#0F3A36",
  onAccent: "#04222B",
  onDanger: "#2A0A12",
};

export type ThemeColors = { [K in keyof typeof lightColors]: string };

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkColors : lightColors;
}

/* ------------------------------------------------------------------ */
/*  Spacing & radius                                                   */
/* ------------------------------------------------------------------ */

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 10, md: 16, lg: 20, xl: 28, full: 9999 };

/* ------------------------------------------------------------------ */
/*  Soft, layered shadows (cool-tinted so they never look muddy)       */
/* ------------------------------------------------------------------ */

const SHADOW_TINT = "#0B2540";

export const shadows: Record<"sm" | "md" | "lg", ViewStyle> = {
  sm: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  lg: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 7,
  },
};

/** Colored glow for primary actions / active states. */
export const glow = (color: string, strength = 0.28): ViewStyle => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: strength,
  shadowRadius: 16,
  elevation: 6,
});

/* ------------------------------------------------------------------ */
/*  Typography (system font; swap in Inter/Geist via expo-font later)  */
/* ------------------------------------------------------------------ */

export const fontFamily = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "System",
});

export const type: Record<
  "display" | "title" | "heading" | "body" | "bodyStrong" | "caption" | "overline",
  TextStyle
> = {
  display: { fontSize: 32, fontWeight: "800", letterSpacing: -0.9, lineHeight: 38 },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.6, lineHeight: 30 },
  heading: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: "400", letterSpacing: -0.1, lineHeight: 24 },
  bodyStrong: { fontSize: 16, fontWeight: "600", letterSpacing: -0.1, lineHeight: 24 },
  caption: { fontSize: 13, fontWeight: "500", letterSpacing: 0, lineHeight: 18 },
  overline: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, lineHeight: 14, textTransform: "uppercase" },
};

/** Static light palette — kept for backwards compatibility. Prefer useThemeColors(). */
export const colors = lightColors;