// components/Avatar.tsx
// Five friendly, original illustrated avatars drawn with SVG (no image files needed).
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { useThemeColors, glow } from "../constants/theme";

export const AVATAR_COUNT = 5;
export const AVATAR_NAMES = ["Ali", "Sara", "Ayesha", "Hassan", "Zain"];

/** A stable number from any text, so the same person always gets the same avatar. */
export function avatarFromText(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h % AVATAR_COUNT;
}

/** Reads "avatar:3" (saved in the profile). Falls back to a stable pick from the user id. */
export function resolveAvatar(saved: string | null | undefined, seed: string): number {
  const m = /^avatar:(\d)$/.exec(saved ?? "");
  if (m && Number(m[1]) < AVATAR_COUNT) return Number(m[1]);
  return avatarFromText(seed || "cleared");
}

const eyes = (y = 47, color = "#14181C") => (
  <G>
    <Circle cx="42.5" cy={y} r="2.3" fill={color} />
    <Circle cx="57.5" cy={y} r="2.3" fill={color} />
  </G>
);
const smile = (y = 55, w = 7) => <Path d={`M${50 - w} ${y} Q50 ${y + 6} ${50 + w} ${y}`} stroke="#14181C" strokeWidth="2.2" strokeLinecap="round" fill="none" />;

function Art({ id }: { id: number }) {
  switch (id) {
    case 0: // Ali: short dark hair, teal shirt
      return (
        <G>
          <Rect width="100" height="100" fill="#0E7490" />
          <Path d="M14 100 C14 74 32 66 50 66 C68 66 86 74 86 100Z" fill="#22D3EE" />
          <Rect x="44" y="56" width="12" height="14" rx="5" fill="#D9A06F" />
          <Circle cx="50" cy="44" r="20" fill="#E4AE80" />
          <Path d="M29 44 C26 20 74 20 71 44 C68 33 60 30 50 30 C40 30 32 33 29 44Z" fill="#1B1512" />
          {eyes()}
          {smile()}
        </G>
      );
    case 1: // Sara: long brown hair, pink top
      return (
        <G>
          <Rect width="100" height="100" fill="#6D28D9" />
          <Path d="M26 50 C22 14 78 14 74 50 L78 86 L22 86Z" fill="#3B2314" />
          <Path d="M14 100 C14 74 32 66 50 66 C68 66 86 74 86 100Z" fill="#F472B6" />
          <Rect x="44" y="56" width="12" height="14" rx="5" fill="#EDBE97" />
          <Circle cx="50" cy="45" r="19" fill="#F3CBA6" />
          <Path d="M30 44 C32 26 68 26 70 44 C64 36 56 33 50 33 C42 33 36 36 30 44Z" fill="#3B2314" />
          {eyes(47)}
          {smile()}
          <Circle cx="38" cy="53" r="3" fill="#F9A8A8" opacity="0.55" />
          <Circle cx="62" cy="53" r="3" fill="#F9A8A8" opacity="0.55" />
        </G>
      );
    case 2: // Ayesha: hijab
      return (
        <G>
          <Rect width="100" height="100" fill="#B45309" />
          <Path d="M10 100 C10 70 30 60 50 60 C70 60 90 70 90 100Z" fill="#0F766E" />
          <Ellipse cx="50" cy="46" rx="27" ry="29" fill="#14B8A6" />
          <Ellipse cx="50" cy="48" rx="15.5" ry="18" fill="#E9B98F" />
          {eyes(47)}
          {smile(56, 6)}
          <Circle cx="40" cy="54" r="2.6" fill="#F4A6A0" opacity="0.5" />
          <Circle cx="60" cy="54" r="2.6" fill="#F4A6A0" opacity="0.5" />
        </G>
      );
    case 3: // Hassan: cap and beard
      return (
        <G>
          <Rect width="100" height="100" fill="#1D4ED8" />
          <Path d="M14 100 C14 74 32 66 50 66 C68 66 86 74 86 100Z" fill="#F1F5F9" />
          <Rect x="44" y="56" width="12" height="14" rx="5" fill="#A9754D" />
          <Circle cx="50" cy="45" r="20" fill="#BC8559" />
          <Path d="M30 50 C30 70 70 70 70 50 C66 60 58 61 50 61 C42 61 34 60 30 50Z" fill="#241811" />
          <Path d="M29 38 C29 20 71 20 71 38 L71 36 C60 32 40 32 29 36Z" fill="#F8FAFC" />
          <Rect x="28" y="35" width="44" height="5" rx="2.5" fill="#CBD5E1" />
          {eyes(46)}
          <Path d="M44 55 Q50 59 56 55" stroke="#F8FAFC" strokeWidth="2" strokeLinecap="round" fill="none" />
        </G>
      );
    default: // Zain: kid with curly hair, yellow tee
      return (
        <G>
          <Rect width="100" height="100" fill="#BE123C" />
          <Path d="M16 100 C16 78 32 70 50 70 C68 70 84 78 84 100Z" fill="#FACC15" />
          <Rect x="45" y="60" width="10" height="12" rx="5" fill="#EDBE97" />
          <Circle cx="50" cy="46" r="21" fill="#F3CBA6" />
          <G fill="#2B1B12">
            <Circle cx="34" cy="30" r="8" />
            <Circle cx="44" cy="24" r="8" />
            <Circle cx="56" cy="24" r="8" />
            <Circle cx="66" cy="30" r="8" />
            <Circle cx="50" cy="29" r="9" />
          </G>
          <Circle cx="42" cy="48" r="3" fill="#14181C" />
          <Circle cx="58" cy="48" r="3" fill="#14181C" />
          <Circle cx="43" cy="47" r="1" fill="#FFFFFF" />
          <Circle cx="59" cy="47" r="1" fill="#FFFFFF" />
          <Path d="M42 56 Q50 65 58 56Z" fill="#7F1D1D" />
          <Circle cx="35" cy="54" r="3.2" fill="#F9A8A8" opacity="0.55" />
          <Circle cx="65" cy="54" r="3.2" fill="#F9A8A8" opacity="0.55" />
        </G>
      );
  }
}

export const Avatar = memo(function Avatar({ id, size = 48, ring = false, selected = false }: { id: number; size?: number; ring?: boolean; selected?: boolean }) {
  const colors = useThemeColors();
  const on = ring || selected;
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
        on && { borderWidth: Math.max(2, size / 24), borderColor: colors.accent, ...glow(colors.accent, 0.6) },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Art id={id % AVATAR_COUNT} />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: "#111" },
});