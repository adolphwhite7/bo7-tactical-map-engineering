import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Modal,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ReactNativeZoomableView } from "@openspacelabs/react-native-zoomable-view";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, POIColors, Typography, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { getPoiImage, FALLBACK } from "@/constants/assetRegistry";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import StarRating from "@/components/StarRating";
import SAMRadarChart, { SAMScoreCard, SAMData } from "@/components/SAMRadarChart";
import { subscribeToRating, submitRating, RatingResult } from "@/services/ratingsService";

type POIDetailRouteProp = RouteProp<RootStackParamList, "POIDetail">;

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    hazard: "Hazard",
    objective: "Objective",
    flank: "Flank Route",
    cover: "Cover Position",
    escape: "Escape Route",
    power_position: "Power Position",
  };
  const normalized = type.toLowerCase().replace(/\s+/g, "_");
  return labels[normalized] || labels[type] || type;
};

const getColorForType = (type: string): string => {
  const normalized = type.toLowerCase().replace(/\s+/g, "_");
  return POIColors[normalized as keyof typeof POIColors] || "#94A3B8";
};

export default function POIDetailModal() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<POIDetailRouteProp>();
  const { poi, mapId } = route.params;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [ratingData, setRatingData] = useState<RatingResult>({
    average: 0,
    count: 0,
    userRating: 0,
  });
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToRating(poi.id, (data) => {
      setRatingData(data);
    });

    return () => unsubscribe();
  }, [poi.id]);

  const handleRate = async (poiId: string, rating: number) => {
    try {
      const result = await submitRating(poiId, rating);
      setRatingData(result);
    } catch (error) {
      console.error("Failed to submit rating:", error);
    }
  };

  const relatedImage = mapId ? getPoiImage(mapId, poi.id) : FALLBACK;
  const typeColor = getColorForType(poi.type);

  const handleClose = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.goBack();
  };

  const handleOpenLightbox = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLightboxVisible(true);
  };

  const handleCloseLightbox = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLightboxVisible(false);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerContent}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
            <ThemedText style={styles.typeBadgeText}>
              {getTypeLabel(poi.type)}
            </ThemedText>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              {
                backgroundColor: isDark
                  ? `rgba(255, 255, 255, ${pressed ? 0.25 : 0.15})`
                  : `rgba(0, 0, 0, ${pressed ? 0.2 : 0.1})`,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
            onPress={handleClose}
            hitSlop={8}
            accessibilityLabel="Close Details"
            accessibilityHint="Closes the point of interest details and returns to the map"
            accessibilityRole="button"
          >
            <Feather name="x" size={20} color={isDark ? "#FFFFFF" : "#0F172A"} />
          </Pressable>
        </View>
        <ThemedText style={styles.title}>{poi.content.title}</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={true}
      >
        {imageError ? (
          <View style={[styles.imageErrorContainer, { borderColor: theme.border }]}>
            <Feather name="image" size={32} color={theme.textSecondary} style={{ marginBottom: Spacing.sm }} />
            <ThemedText style={[styles.imageErrorText, { color: theme.textSecondary }]}>
              Tactical Image Not Available
            </ThemedText>
          </View>
        ) : relatedImage ? (
          <View style={styles.imageSection}>
            <Pressable
              onPress={handleOpenLightbox}
              style={({ pressed }) => [
                styles.imageContainer,
                { borderColor: theme.border, opacity: pressed ? 0.9 : 1 },
              ]}
              accessibilityLabel={`${poi.content.title} tactical image`}
              accessibilityRole="button"
              accessibilityHint="Double tap to view full screen"
            >
              {imageLoading && (
                <View style={styles.imageLoadingOverlay} accessibilityElementsHidden={true}>
                  <ActivityIndicator size="large" color="#FFD700" />
                </View>
              )}
              <Image
                source={relatedImage}
                style={[styles.image, imageLoading && { opacity: 0 }]}
                contentFit="cover"
                cachePolicy="memory-disk"
                onLoad={() => setImageLoading(false)}
                onError={(e) => {
                  console.warn('[POIDetailModal] Image load failed:', poi.id, e);
                  setImageError(true);
                  setImageLoading(false);
                }}
                accessibilityElementsHidden={true}
              />
              {!imageLoading && (
                <View style={styles.expandIcon} accessibilityElementsHidden={true}>
                  <Feather name="maximize" size={18} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
            {!imageLoading && (
              <View style={styles.tapHintContainer} accessibilityElementsHidden={true}>
                <Feather name="maximize-2" size={12} color={theme.textSecondary} />
                <ThemedText style={[styles.tapHint, { color: theme.textSecondary }]}>
                  Tap to view full screen
                </ThemedText>
              </View>
            )}
          </View>
        ) : null}

        <ThemedText style={styles.description}>
          {poi.content.description}
        </ThemedText>

        <View
          style={[
            styles.proTipContainer,
            {
              backgroundColor: isDark
                ? "rgba(30, 64, 175, 0.2)"
                : "rgba(59, 130, 246, 0.1)",
              borderLeftColor: "#3B82F6",
            },
          ]}
        >
          <View style={styles.proTipHeader}>
            <Feather name="zap" size={16} color="#3B82F6" accessibilityElementsHidden={true} />
            <ThemedText style={styles.proTipLabel}>Pro Tip</ThemedText>
          </View>
          <ThemedText style={styles.proTipText}>{poi.content.proTip}</ThemedText>
        </View>

        {poi.sam ? (
          <>
            <SAMRadarChart sam={poi.sam as SAMData} />
            <SAMScoreCard sam={poi.sam as SAMData} />
          </>
        ) : null}

        <StarRating
          poiId={poi.id}
          averageRating={ratingData.average}
          totalRatings={ratingData.count}
          userRating={ratingData.userRating}
          onRate={handleRate}
        />
      </ScrollView>

      <Modal
        visible={lightboxVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseLightbox}
        statusBarTranslucent={true}
        supportedOrientations={["portrait", "portrait-upside-down", "landscape", "landscape-left", "landscape-right"]}
      >
        <View style={styles.lightboxContainer} accessibilityViewIsModal={true}>
          <Pressable
            style={[styles.lightboxCloseButton, { top: insets.top + Spacing.md, right: insets.right + Spacing.lg }]}
            onPress={handleCloseLightbox}
            accessibilityLabel="Close fullscreen view"
            accessibilityRole="button"
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>

          <ReactNativeZoomableView
            key={`${screenWidth}x${screenHeight}`}
            maxZoom={5}
            minZoom={1}
            initialZoom={1}
            bindToBorders={true}
            style={styles.lightboxZoomable}
            contentWidth={screenWidth}
            contentHeight={screenHeight}
          >
            <View style={[styles.lightboxImageWrapper, { width: screenWidth, height: screenHeight }]}>
              <Image
                source={relatedImage}
                style={styles.lightboxImage}
                contentFit="contain"
              />
            </View>
          </ReactNativeZoomableView>

          <View style={[styles.lightboxHint, { bottom: insets.bottom + Spacing.lg }]} accessibilityElementsHidden={true}>
            <ThemedText style={styles.lightboxHintText}>Pinch to zoom</ThemedText>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(51, 65, 85, 0.3)",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  typeBadgeText: {
    ...Typography.small,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  closeButton: {
    width: 48,
    height: 44,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  title: {
    ...Typography.heading,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  imageSection: {
    marginBottom: Spacing.lg,
  },
  imageContainer: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
    height: 220,
    position: "relative",
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  expandIcon: {
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: BorderRadius.xs,
    padding: Spacing.xs,
  },
  tapHintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  tapHint: {
    ...Typography.small,
    fontStyle: "italic",
  },
  description: {
    ...Typography.body,
    marginBottom: Spacing.lg,
  },
  proTipContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderLeftWidth: 4,
  },
  proTipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  proTipLabel: {
    ...Typography.caption,
    fontWeight: "600",
    color: "#3B82F6",
    marginLeft: Spacing.xs,
  },
  proTipText: {
    ...Typography.caption,
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxCloseButton: {
    position: "absolute",
    right: Spacing.lg,
    zIndex: 100,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxZoomable: {
    flex: 1,
    width: "100%",
  },
  lightboxImageWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxImage: {
    width: "100%",
    height: "100%",
  },
  lightboxHint: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  lightboxHintText: {
    ...Typography.small,
    color: "#FFFFFF",
  },
  imageErrorContainer: {
    height: 180,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed" as const,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  imageErrorText: {
    ...Typography.body,
    fontWeight: "600",
  },
});
