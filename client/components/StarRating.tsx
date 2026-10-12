import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface StarRatingProps {
  poiId: string;
  averageRating: number;
  totalRatings: number;
  userRating: number;
  onRate: (poiId: string, rating: number) => void;
}

const STAR_COLOR_GOLD = "#FFD700";
const STAR_COLOR_ORANGE = "#FFA500";
const STAR_COLOR_EMPTY = "#666666";

export default function StarRating({
  poiId,
  averageRating = 0,
  totalRatings = 0,
  userRating = 0,
  onRate,
}: StarRatingProps) {
  const { isDark } = useTheme();
  const [localRating, setLocalRating] = useState(userRating);
  const [localAverage, setLocalAverage] = useState(averageRating);
  const [localCount, setLocalCount] = useState(totalRatings);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalRating(userRating);
    setLocalAverage(averageRating);
    setLocalCount(totalRatings);
  }, [userRating, averageRating, totalRatings]);

  const handleRate = useCallback((rating: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const wasFirstRating = localRating === 0;
    const previousRating = localRating;
    
    setLocalRating(rating);
    
    if (wasFirstRating) {
      const newCount = localCount + 1;
      const newTotal = localAverage * localCount + rating;
      setLocalCount(newCount);
      setLocalAverage(newTotal / newCount);
    } else {
      const currentTotal = localAverage * localCount;
      const newTotal = currentTotal - previousRating + rating;
      setLocalAverage(newTotal / localCount);
    }
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onRate(poiId, rating);
    }, 300);
  }, [poiId, localRating, localAverage, localCount, onRate]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const isFilled = (star: number): boolean => {
    if (localRating > 0) {
      return star <= localRating;
    }
    return star <= Math.round(localAverage);
  };

  const getStarColor = (star: number): string => {
    if (localRating > 0 && star <= localRating) {
      return STAR_COLOR_GOLD;
    }
    if (star <= localAverage) {
      return STAR_COLOR_ORANGE;
    }
    return STAR_COLOR_EMPTY;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? "rgba(255, 215, 0, 0.1)"
            : "rgba(255, 215, 0, 0.08)",
        },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="star" size={16} color={STAR_COLOR_GOLD} accessibilityElementsHidden={true} />
        <ThemedText style={styles.title}>Rate This Tip</ThemedText>
      </View>

      <View style={styles.starsRow} accessibilityRole="radiogroup" accessible={false}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={() => handleRate(star)}
            style={({ pressed }) => [
              styles.starButton,
              { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 1.15 : 1 }] },
            ]}
            accessibilityLabel={`${star} star${star !== 1 ? "s" : ""}${localRating === star ? ", selected" : ""}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: localRating === star }}
            accessibilityHint={localRating === star ? "Already selected" : "Double tap to rate"}
          >
            <Ionicons
              name={isFilled(star) ? "star" : "star-outline"}
              size={32}
              color={getStarColor(star)}
              accessibilityElementsHidden={true}
            />
          </Pressable>
        ))}
      </View>

      <ThemedText style={[styles.ratingText, { color: isDark ? '#CBD5E1' : '#64748B' }]}>
        {localAverage > 0
          ? `${localAverage.toFixed(1)} (${localCount} rating${localCount !== 1 ? "s" : ""})`
          : "Be the first to rate!"}
      </ThemedText>

      {localRating > 0 ? (
        <ThemedText style={styles.userRatingText}>
          Your rating: {localRating} star{localRating !== 1 ? "s" : ""}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: STAR_COLOR_GOLD,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.caption,
    fontWeight: "600",
    color: STAR_COLOR_GOLD,
    marginLeft: Spacing.xs,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  starButton: {
    padding: Spacing.xs,
  },
  ratingText: {
    ...Typography.caption,
    textAlign: "center",
  },
  userRatingText: {
    ...Typography.small,
    textAlign: "center",
    marginTop: Spacing.xs,
    color: STAR_COLOR_GOLD,
    fontWeight: "600",
  },
});
