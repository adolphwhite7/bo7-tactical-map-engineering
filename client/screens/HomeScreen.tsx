import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { getAllMaps } from "@/constants/assetRegistry";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { getApiUrl } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Home">;

interface MapInfo {
  id: string;
  displayName: string;
  thumbnail: any;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const maps: MapInfo[] = getAllMaps();

  const [showDownloads, setShowDownloads] = useState(false);
  const [downloadFiles, setDownloadFiles] = useState<string[]>([]);
  const [loadingDownloads, setLoadingDownloads] = useState(false);

  const handleMapPress = (mapId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.navigate("Map", { mapId });
  };

  const handleDownloadFolder = async () => {
    if (Platform.OS !== "web") return;
    setLoadingDownloads(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL("/api/downloads/SAM_RADAR_IMPL_002", baseUrl).href);
      const data = await res.json();
      if (data.files) {
        setDownloadFiles(data.files);
        setShowDownloads(true);
      }
    } catch {
      Alert.alert("Error", "Could not load file list");
    } finally {
      setLoadingDownloads(false);
    }
  };

  const handleDownloadFile = (fileName: string) => {
    if (Platform.OS !== "web") return;
    const baseUrl = getApiUrl();
    const url = new URL(`/api/downloads/SAM_RADAR_IMPL_002/${fileName}`, baseUrl).href;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.headerTitle}>BO7 Tactical Map Guide</ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Select a map to view strategic points
            </ThemedText>
          </View>
          {__DEV__ && Platform.OS === "web" ? (
            <Pressable
              onPress={handleDownloadFolder}
              accessibilityLabel="Download files"
              accessibilityHint="Opens the downloadable files panel"
              style={[styles.downloadBtn, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, marginRight: Spacing.sm }]}
            >
              <Feather name="download" size={18} color={theme.text} />
            </Pressable>
          ) : null}
          <HamburgerMenu />
        </View>
      </View>

      {__DEV__ && showDownloads && Platform.OS === "web" ? (
        <View style={[styles.downloadPanel, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <View style={styles.downloadHeader}>
            <ThemedText style={styles.downloadTitle}>SAM_RADAR_IMPL_002</ThemedText>
            <Pressable onPress={() => setShowDownloads(false)}>
              <Feather name="x" size={20} color={theme.text} />
            </Pressable>
          </View>
          {downloadFiles.map((f) => (
            <Pressable key={f} onPress={() => handleDownloadFile(f)} style={styles.downloadItem}>
              <Feather name="file" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.downloadFileName, { color: "#4A9EFF" }]}>{f}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {maps.map((map) => (
          <Pressable
            key={map.id}
            onPress={() => handleMapPress(map.id)}
            style={({ pressed }) => [
              styles.mapCard,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            accessibilityLabel={`${map.displayName} map`}
            accessibilityRole="button"
            accessibilityHint="Opens the tactical map view"
          >
            <Image
              source={map.thumbnail}
              style={styles.mapImage}
              contentFit="cover"
              accessibilityElementsHidden={true}
            />
            <View style={styles.mapOverlay} importantForAccessibility="no" />
            <View style={styles.mapInfo} importantForAccessibility="no-hide-descendants">
              <View style={styles.mapTextContainer}>
                <ThemedText style={styles.mapName}>{map.displayName}</ThemedText>
              </View>
              <View style={[styles.arrowContainer, { backgroundColor: theme.backgroundDefault }]} accessibilityElementsHidden={true}>
                <Feather name="chevron-right" size={24} color={theme.text} />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...Typography.body,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  mapCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    height: 200,
    position: "relative",
  },
  mapImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  mapInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  mapTextContainer: {
    flex: 1,
  },
  mapName: {
    ...Typography.title,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  arrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  downloadBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  downloadPanel: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
  },
  downloadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  downloadTitle: {
    ...Typography.caption,
    fontWeight: "700",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  downloadItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  downloadFileName: {
    ...Typography.small,
    textDecorationLine: "underline" as const,
  },
});
