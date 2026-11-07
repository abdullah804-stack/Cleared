// components/VideoRail.tsx
// Horizontal list of YouTube videos. Tapping opens the YouTube app (or browser); no extra native package needed.
import { useMemo, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tick } from "../utils/haptics";
import { Gradient } from "./Gradient";
import { useThemeColors, ThemeColors, glow, radius, spacing } from "../constants/theme";
import { VIDEOS } from "../constants/tools";

function VideoCard({ v, styles, colors }: { v: (typeof VIDEOS)[number]; styles: ReturnType<typeof createStyles>; colors: ThemeColors }) {
  const [failed, setFailed] = useState(false);
  return (
    <Pressable
      onPress={() => {
        tick();
        Linking.openURL(`https://www.youtube.com/watch?v=${v.id}`).catch(() => {});
      }}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
      accessibilityRole="link"
      accessibilityLabel={`Watch ${v.title} on YouTube`}
    >
      <View style={styles.thumbWrap}>
        {failed ? (
          <Gradient colors={["#0A141C", "#073040"]} style={StyleSheet.absoluteFill} />
        ) : (
          <Image source={{ uri: `https://img.youtube.com/vi/${v.id}/hqdefault.jpg` }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} />
        )}
        <View style={styles.shade} />
        <View style={[styles.play, glow(colors.accent, 0.7)]}>
          <Ionicons name="play" size={22} color={colors.onAccent} style={{ marginLeft: 2 }} />
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{v.tag}</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>{v.title}</Text>
      <Text style={styles.channel} numberOfLines={1}>{v.channel}</Text>
    </Pressable>
  );
}

export function VideoRail() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.md }}>
      {VIDEOS.map((v) => (
        <VideoCard key={v.id} v={v} styles={styles} colors={colors} />
      ))}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: { width: 250 },
    thumbWrap: { height: 140, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
    shade: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.28)" },
    play: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    tag: { position: "absolute", left: 10, top: 10, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full, backgroundColor: "rgba(0,0,0,0.65)" },
    tagText: { fontSize: 11, fontWeight: "800", color: colors.accentStrong },
    title: { fontSize: 14.5, lineHeight: 20, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
    channel: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  });