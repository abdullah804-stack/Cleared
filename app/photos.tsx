// app/photos.tsx
import { useCallback, useMemo, useState } from "react";
import { Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
// NOTE: the old `FileSystem.documentDirectory / getInfoAsync / copyAsync` functions THROW in this Expo SDK,
// so this screen uses the new File / Directory / Paths API.
import { Directory, File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { Gradient } from "../components/Gradient";
import { useThemeColors, ThemeColors, gradients, radius, spacing, type } from "../constants/theme";

interface Photo {
  uri: string;
  ts: number; // the file name is the time it was added
}

const photosDir = () => new Directory(Paths.document, "teeth_photos");

function ensureDir() {
  const d = photosDir();
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

function readPhotos(): Photo[] {
  return ensureDir()
    .list()
    .filter((x): x is File => x instanceof File)
    .map((f) => ({ uri: f.uri, ts: parseInt(f.name.split(".")[0], 10) }))
    .filter((p) => Number.isFinite(p.ts))
    .sort((a, b) => b.ts - a.ts);
}

const fmt = (ts: number) => new Date(ts).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

export default function PhotosScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [viewing, setViewing] = useState<Photo | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [picked, setPicked] = useState<Photo[]>([]);
  const [comparing, setComparing] = useState(false);
  const [busy, setBusy] = useState(false);

  const gap = spacing.sm + 2;
  const tile = (width - spacing.md * 2 - gap) / 2;

  const load = useCallback(() => {
    try {
      setPhotos(readPhotos());
    } catch {
      setPhotos([]);
    }
  }, []);

  useFocusEffect(load);

  const savePicked = async (sourceUri: string) => {
    const dest = new File(ensureDir(), `${Date.now()}.jpg`);
    await new File(sourceUri).copy(dest);
    load();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const handleTakePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert("Camera access needed", "Allow camera access to take photos of your teeth.", [
        { text: "Not now", style: "cancel" },
        ...(perm.canAskAgain ? [] : [{ text: "Open settings", onPress: () => Linking.openSettings() }]),
      ]);
    }
    setBusy(true);
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true });
      if (!result.canceled && result.assets[0]?.uri) await savePicked(result.assets[0].uri);
    } catch {
      Alert.alert("Couldn't save the photo", "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
      if (!result.canceled && result.assets[0]?.uri) await savePicked(result.assets[0].uri);
    } catch {
      Alert.alert("Couldn't add the photo", "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (photo: Photo) => {
    Alert.alert("Delete this photo?", "It will be removed from your phone.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          try {
            new File(photo.uri).delete();
          } catch {}
          setViewing(null);
          setPicked((p) => p.filter((x) => x.uri !== photo.uri));
          load();
        },
      },
    ]);
  };

  const onTilePress = (photo: Photo) => {
    Haptics.selectionAsync().catch(() => {});
    if (!compareMode) return setViewing(photo);
    setPicked((p) => {
      if (p.some((x) => x.uri === photo.uri)) return p.filter((x) => x.uri !== photo.uri);
      return [...p, photo].slice(-2); // a third pick replaces the oldest pick
    });
  };

  const exitCompare = () => {
    setCompareMode(false);
    setPicked([]);
  };

  const [older, newer] = [...picked].sort((a, b) => a.ts - b.ts);
  const daysApart = older && newer ? Math.max(1, Math.round((newer.ts - older.ts) / 86400000)) : 0;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(450)}>
          <Text style={styles.title}>See your smile change</Text>
          <View style={styles.privacy}>
            <Ionicons name="lock-closed" size={13} color={colors.success} />
            <Text style={styles.privacyText}>Private. Photos never leave this phone.</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(450)} style={styles.actions}>
          <Button title="Take photo" icon="camera" onPress={handleTakePhoto} loading={busy} style={{ flex: 1 }} />
          <Button title="Gallery" icon="images" variant="soft" onPress={handleGallery} disabled={busy} style={{ flex: 0.8 }} />
        </Animated.View>

        {photos.length > 0 && (
          <Animated.View entering={FadeIn.delay(160)} style={styles.listHeader}>
            <Text style={styles.count}>
              {photos.length} photo{photos.length === 1 ? "" : "s"}
            </Text>
            {photos.length >= 2 && (
              <Pressable
                onPress={() => (compareMode ? exitCompare() : setCompareMode(true))}
                style={[styles.chip, compareMode && styles.chipOn]}
                accessibilityRole="button"
              >
                <Ionicons name="git-compare" size={14} color={compareMode ? "#FFFFFF" : colors.accentStrong} />
                <Text style={[styles.chipText, compareMode && { color: "#FFFFFF" }]}>{compareMode ? "Cancel" : "Compare"}</Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {compareMode && (
          <Animated.Text entering={FadeIn} style={styles.hint}>
            Tap two photos to compare them side by side.
          </Animated.Text>
        )}

        {photos.length === 0 ? (
          <Animated.View entering={FadeIn.delay(200)} style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="camera-outline" size={32} color={colors.accentStrong} />
            </View>
            <Text style={styles.emptyTitle}>No photos yet</Text>
            <Text style={styles.emptyText}>Take your first photo to start a timeline. It helps you and your dentist spot changes early.</Text>
            <View style={styles.tips}>
              {["Use the same light each time", "Same angle, same distance", "Take one every week or two"].map((t) => (
                <View key={t} style={styles.tipRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.tipText}>{t}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        ) : (
          <View style={[styles.grid, { gap }]}>
            {photos.map((p, i) => {
              const pickIndex = picked.findIndex((x) => x.uri === p.uri);
              const isPicked = pickIndex !== -1;
              return (
                <Animated.View key={p.uri} entering={FadeInDown.delay(Math.min(i, 8) * 50).duration(350)}>
                  <Pressable
                    onPress={() => onTilePress(p)}
                    style={[{ width: tile, height: tile }, styles.tile, isPicked && { borderColor: colors.accent, borderWidth: 3 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Photo from ${fmt(p.ts)}`}
                  >
                    <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    <Gradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.65)"]} style={styles.tileShade}>
                      <Text style={styles.tileDate}>{fmt(p.ts)}</Text>
                    </Gradient>
                    {isPicked && (
                      <View style={styles.pickBadge}>
                        <Text style={styles.pickBadgeText}>{pickIndex + 1}</Text>
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {compareMode && picked.length === 2 && (
        <Animated.View entering={FadeInUp.duration(250)} exiting={FadeOut.duration(150)} style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button title="Compare these 2 photos" icon="git-compare" onPress={() => setComparing(true)} />
        </Animated.View>
      )}

      {/* Full-screen viewer */}
      <Modal visible={!!viewing} animationType="fade" onRequestClose={() => setViewing(null)} statusBarTranslucent>
        <View style={styles.viewer}>
          {viewing && <Image source={{ uri: viewing.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />}
          <View style={[styles.viewerTop, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable onPress={() => setViewing(null)} style={styles.roundBtn} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.viewerDate}>{viewing ? fmt(viewing.ts) : ""}</Text>
            <Pressable onPress={() => viewing && handleDelete(viewing)} style={styles.roundBtn} accessibilityRole="button" accessibilityLabel="Delete photo">
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Side-by-side compare */}
      <Modal visible={comparing} animationType="slide" onRequestClose={() => setComparing(false)} statusBarTranslucent>
        <View style={styles.viewer}>
          <View style={[styles.viewerTop, { paddingTop: insets.top + spacing.sm, position: "relative" }]}>
            <Pressable onPress={() => setComparing(false)} style={styles.roundBtn} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.viewerDate}>{daysApart ? `${daysApart} day${daysApart === 1 ? "" : "s"} apart` : ""}</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.compareRow}>
            {[
              { p: older, label: "Before" },
              { p: newer, label: "After" },
            ].map(({ p, label }) => (
              <View key={label} style={styles.compareCol}>
                {p && <Image source={{ uri: p.uri }} style={styles.compareImg} resizeMode="cover" />}
                <Text style={styles.compareLabel}>{label}</Text>
                <Text style={styles.compareDate}>{p ? fmt(p.ts) : ""}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.compareNote}>Photos are for your own tracking. Show your dentist if anything looks different.</Text>
        </View>
      </Modal>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    title: { ...type.title, fontSize: 24, color: colors.text },
    privacy: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
    privacyText: { fontSize: 13, color: colors.textMuted },

    actions: { flexDirection: "row", gap: spacing.sm + 2, marginTop: spacing.lg },

    listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xl, marginBottom: spacing.md },
    count: { ...type.heading, color: colors.text },
    chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.accentMuted },
    chipOn: { backgroundColor: colors.accent },
    chipText: { fontSize: 13, fontWeight: "700", color: colors.accentStrong },
    hint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },

    grid: { flexDirection: "row", flexWrap: "wrap" },
    tile: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
    tileShade: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingBottom: 8, paddingTop: 28, justifyContent: "flex-end" },
    tileDate: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
    pickBadge: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    pickBadgeText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },

    empty: { alignItems: "center", marginTop: spacing.xl, paddingHorizontal: spacing.md },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentMuted, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
    emptyTitle: { ...type.heading, color: colors.text },
    emptyText: { fontSize: 14, lineHeight: 21, color: colors.textMuted, textAlign: "center", marginTop: 4 },
    tips: { alignSelf: "stretch", marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
    tipRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    tipText: { fontSize: 14, color: colors.text },

    bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.md, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderTopWidth: 1, borderTopColor: colors.border },

    viewer: { flex: 1, backgroundColor: "#000000" },
    viewerTop: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
    roundBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" },
    viewerDate: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

    compareRow: { flex: 1, flexDirection: "row", gap: 2, marginTop: 100 },
    compareCol: { flex: 1, alignItems: "center" },
    compareImg: { width: "100%", flex: 1 },
    compareLabel: { ...type.overline, color: "rgba(255,255,255,0.7)", marginTop: spacing.md },
    compareDate: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", marginTop: 2 },
    compareNote: { fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center", padding: spacing.lg },
  });