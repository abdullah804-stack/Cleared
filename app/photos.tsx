// app/photos.tsx
import { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Image, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";

const PHOTOS_DIR = FileSystem.documentDirectory + "teeth_photos/";

interface PhotoEntry {
  uri: string;
  date: string;
}

export default function PhotosScreen() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);

  const loadPhotos = async () => {
    try {
      // Ensure the directory exists
      const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
        setPhotos([]);
        return;
      }

      // Read the files in the directory
      const files = await FileSystem.readDirectoryAsync(PHOTOS_DIR);
      
      // Map files to photo entries (the filename is the timestamp)
      const loadedPhotos = files.map(file => ({
        uri: PHOTOS_DIR + file,
        date: new Date(parseInt(file.split(".")[0])).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      })).sort((a, b) => b.uri.localeCompare(a.uri)); // Sort newest first

      setPhotos(loadedPhotos);
    } catch (e) {
      console.error("Failed to load photos", e);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const handleTakePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need camera access to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7, // Compress to save space
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0].uri) {
      const newUri = PHOTOS_DIR + `${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: result.assets[0].uri, to: newUri });
      await loadPhotos();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDeletePhoto = (uri: string) => {
    Alert.alert("Delete Photo", "Remove this photo from your timeline?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          await FileSystem.deleteAsync(uri);
          await loadPhotos();
        }
      }
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Photo Timeline</Text>
          <Text style={styles.subtitle}>Track changes in your teeth over time. (Saved only on your phone).</Text>
        </View>

        <Button title="Take Today's Photo" onPress={handleTakePhoto} style={{ marginBottom: spacing.xl }} />

        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No photos yet. Take your first one to start tracking.</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {photos.map((photo, index) => (
              <View key={photo.uri} style={styles.photoRow}>
                <View style={styles.photoLeft}>
                  <View style={styles.dot} />
                  {index !== photos.length - 1 && <View style={styles.line} />}
                </View>
                <View style={styles.photoRight}>
                  <Text style={styles.photoDate}>{photo.date}</Text>
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: photo.uri }} style={styles.image} />
                    <Pressable style={styles.deleteBtn} onPress={() => handleDeletePhoto(photo.uri)}>
                      <Ionicons name="trash" size={16} color="#FFF" />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 15, color: colors.textMuted, marginTop: spacing.md, textAlign: "center" },

  timeline: { paddingLeft: spacing.md },
  photoRow: { flexDirection: "row", marginBottom: spacing.lg },
  photoLeft: { alignItems: "center", marginRight: spacing.md, width: 20 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent, marginTop: 24 },
  line: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 4 },
  
  photoRight: { flex: 1 },
  photoDate: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: spacing.xs },
  imageContainer: { position: "relative", borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  image: { width: "100%", height: 200, resizeMode: "cover" },
  deleteBtn: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", padding: 6, borderRadius: radius.full },
});