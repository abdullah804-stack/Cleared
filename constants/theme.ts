// constants/theme.ts
// "Deep ocean" clinical palette: calm navy surfaces, cyan→teal brand gradient, soft cool shadows.
import { Platform, ViewStyle } from "react-native";

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string; // icons, borders, highlights
  accentStrong: string; // accent used as TEXT (readable on surface)
  accentMuted: string; // soft accent backgrounds
  success: string;
  successMuted: string;
  danger: string;
  dangerMuted: string;
  warning: string;
  warningMuted: string;
  onAccent: string; // text on brand gradient / accent
  onDanger: string;
  overlay: string; // modal backdrops
};

export const lightColors: ThemeColors = {
  background: "#F3F7FB",
  surface: "#FFFFFF",
  surfaceAlt: "#EAF1F7",
  border: "#DFE8F0",
  text: "#0B1B2B",
  textMuted: "#5B6B7B",
  accent: "#0EA5E9",
  accentStrong: "#0369A1",
  accentMuted: "#E0F2FE",
  success: "#0D9488",
  successMuted: "#D9F5F0",
  danger: "#E11D48",
  dangerMuted: "#FFE4EA",
  warning: "#B45309",
  warningMuted: "#FEF3C7",
  onAccent: "#FFFFFF",
  onDanger: "#FFFFFF",
  overlay: "rgba(6, 21, 35, 0.55)",
};

// True-black "midnight neon" palette: pure black canvas, near-black cards, cyan/teal glow.
export const darkColors: ThemeColors = {
  background: "#000000",
  surface: "#0B0F14",
  surfaceAlt: "#121922",
  border: "#1B2733",
  text: "#F4F8FB",
  textMuted: "#8A97A6",
  accent: "#22D3EE",
  accentStrong: "#67E8F9",
  accentMuted: "rgba(34, 211, 238, 0.12)",
  success: "#34D399",
  successMuted: "rgba(52, 211, 153, 0.13)",
  danger: "#FB7185",
  dangerMuted: "rgba(251, 113, 133, 0.13)",
  warning: "#FBBF24",
  warningMuted: "rgba(251, 191, 36, 0.13)",
  onAccent: "#00161C", // dark text on the bright neon buttons
  onDanger: "#2A0A12",
  overlay: "rgba(0, 0, 0, 0.75)",
};

/** The app is dark-only by design: a black canvas makes the glow effects pop. */
export function useThemeColors(): ThemeColors {
  return darkColors;
}

/** Back-compat for files that import a static `colors`. Prefer useThemeColors(). */
export const colors = darkColors;

/** Fixed brand gradients (same in light and dark). */
export const gradients = {
  // Buttons, highlights. White text is readable on every stop.
  brand: ["#0369A1", "#0891B2", "#0D9488"] as string[],
  // Hero / splash backgrounds
  hero: ["#000000", "#04141C", "#073040"] as string[],
  // Bright neon fill for primary buttons (use DARK text on it)
  glow: ["#06B6D4", "#22D3EE", "#2DD4BF"] as string[],
  // Lighter surface wash for cards that deserve attention
  soft: ["#E0F2FE", "#D9F5F0"] as string[],
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radius = { sm: 10, md: 16, lg: 20, xl: 28, full: 999 };

const shadowColor = "#0B2540";

export const shadows: Record<"sm" | "md" | "lg", ViewStyle> = {
  sm: { shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  md: { shadowColor, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 5 },
  lg: { shadowColor, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 28, elevation: 10 },
};

/** Coloured glow, e.g. under the primary button or an active card. */
export function glow(color: string, strength = 0.25): ViewStyle {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: strength,
    shadowRadius: 18,
    elevation: Platform.OS === "android" ? 6 : 0,
  };
}

export const type = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: "800" as const, letterSpacing: -0.8 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const, letterSpacing: -0.4 },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: "700" as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: "600" as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: "500" as const },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: "700" as const, letterSpacing: 1.2, textTransform: "uppercase" as const },
};

/** Shared motion values so every screen animates with the same feel. */
export const motion = {
  spring: { damping: 16, stiffness: 180, mass: 0.9 },
  springSoft: { damping: 20, stiffness: 120, mass: 1 },
  press: { damping: 18, stiffness: 400, mass: 0.6 },
  fast: 160,
  normal: 280,
  slow: 480,
};