import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography, BorderRadius, POIColors } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

interface SectionCardProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  iconColor: string;
  title: string;
  children: React.ReactNode;
  isDark: boolean;
  theme: any;
  accessibilityLabel?: string;
}

function SectionCard({ icon, iconColor, title, children, isDark, theme, accessibilityLabel }: SectionCardProps) {
  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
      accessibilityLabel={accessibilityLabel || `Section: ${title}`}
      accessibilityRole="header"
    >
      <View style={styles.sectionHeader}>
        <View
          style={[
            styles.sectionIconContainer,
            { backgroundColor: iconColor + "1F" },
          ]}
        >
          <Feather name={icon} size={18} color={iconColor} />
        </View>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      </View>
      {children}
    </View>
  );
}

const SAM_CRITERIA = [
  "Elevation Advantage",
  "Sightline Coverage",
  "Cover Quality",
  "Escape Routes",
  "Rotation Access",
  "Engagement Range",
  "Flank Exposure",
  "Objective Proximity",
  "Team Utility",
  "Risk/Reward Balance",
];

const POSITION_TYPES = [
  {
    label: "Cover Position",
    color: POIColors.cover,
    description:
      "Hold and defend. These are fortified positions with strong sightlines and reliable cover \u2014 ideal for anchoring objectives or locking down lanes.",
  },
  {
    label: "Flank Route",
    color: POIColors.flank,
    description:
      "Surprise and disrupt. Off-angle pathways that let you collapse on enemies from unexpected directions. High risk, high reward.",
  },
  {
    label: "Power Position",
    color: POIColors.power_position,
    description:
      "Dominate and control. Elevated or central positions that command multiple sightlines. Hold one of these and you dictate the pace of the match.",
  },
];

const GAME_MODES = [
  {
    label: "Domination",
    icon: "flag" as const,
    color: "#3B82F6",
    description:
      "A, B, and C flag positions marked on the map. See which tactical positions give you the best angle for capturing and defending each zone.",
  },
  {
    label: "Hardpoint",
    icon: "clock" as const,
    color: "#F59E0B",
    description:
      "Numbered rotation points so you can pre-position before the hill shifts. Anticipate the next rotation and be set up before the enemy arrives.",
  },
  {
    label: "Search & Destroy",
    icon: "crosshair" as const,
    color: "#EF4444",
    description:
      "Bomb site locations with approach angles. Know where to plant, where to watch, and where to set up for the post-plant hold.",
  },
];

const MAP_CONTROLS = [
  {
    icon: "zoom-in" as const,
    label: "Pinch to zoom",
    description:
      "Get pixel-level precision on marker placement and sightline angles.",
  },
  {
    icon: "eye" as const,
    label: "Operational Overview",
    description:
      "Tap the overview button for a top-down strategic view of the entire map.",
  },
  {
    icon: "info" as const,
    label: "Tap any marker",
    description:
      "Full tactical intel, strategy images, SAM radar chart, and pro tips for every position.",
  },
];

export default function StrategicBriefingScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();

  const handleClose = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.goBack();
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + Spacing.md, borderBottomColor: theme.border },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.intelBadge}>
            <ThemedText style={styles.intelBadgeText}>INTEL BRIEF</ThemedText>
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
            accessibilityLabel="Close Intel Brief"
            accessibilityRole="button"
            accessibilityHint="Returns to the previous screen"
          >
            <Feather name="x" size={20} color={isDark ? "#FFFFFF" : "#0F172A"} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={true}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.heroSection}>
          <ThemedText style={styles.heroTitle}>
            {"BO7 Tactical Map Guide"}
          </ThemedText>
          <ThemedText style={styles.heroTagline}>
            Know the map before you hit the ground.
          </ThemedText>
        </View>

        <SectionCard
          icon="target"
          iconColor="#3B82F6"
          title="Your Unfair Advantage"
          isDark={isDark}
          theme={theme}
        >
          <ThemedText
            style={[styles.bodyText, { color: theme.textSecondary }]}
          >
            Think of this as having a teammate who already memorized every
            angle, rotation, and power position before the match starts. Every
            map in this app has been broken down into battle-tested tactical
            positions {"\u2014"} the spots that win gunfights, lock down objectives,
            and turn the tide of a round.
          </ThemedText>
          <ThemedText
            style={[
              styles.bodyText,
              { color: theme.textSecondary, marginTop: Spacing.sm },
            ]}
          >
            This isn{"'"}t a collection of random callouts. It{"'"}s curated
            intelligence, scored and verified so you can play with confidence
            from the first second of every match.
          </ThemedText>
        </SectionCard>

        <SectionCard
          icon="bar-chart-2"
          iconColor="#F59E0B"
          title="The SAM Scoring System"
          isDark={isDark}
          theme={theme}
        >
          <ThemedText
            style={[styles.bodyText, { color: theme.textSecondary }]}
          >
            Every position in this app earns its place through the Strategic
            Advantage Matrix {"\u2014"} a rigorous 10-point evaluation that separates
            elite positions from average ones. If a spot can{"'"}t prove its
            worth across these criteria, it doesn{"'"}t make the cut.
          </ThemedText>

          <View style={styles.criteriaGrid}>
            {SAM_CRITERIA.map((criterion, index) => (
              <View
                key={criterion}
                style={[
                  styles.criteriaChip,
                  { backgroundColor: "rgba(245, 158, 11, 0.1)" },
                ]}
              >
                <ThemedText style={styles.criteriaNumber}>
                  {String(index + 1).padStart(2, "0")}
                </ThemedText>
                <ThemedText
                  style={[styles.criteriaName, { color: theme.textSecondary }]}
                >
                  {criterion}
                </ThemedText>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.minScoreBanner,
              { backgroundColor: "rgba(245, 158, 11, 0.15)" },
            ]}
          >
            <Feather name="award" size={18} color="#F59E0B" />
            <ThemedText style={[styles.bodyText, { color: theme.textSecondary, flex: 1 }]}>
              Minimum score to qualify:{" "}
              <ThemedText style={styles.scoreHighlight}>7 / 10</ThemedText>
            </ThemedText>
          </View>

          <ThemedText
            style={[
              styles.bodyText,
              { color: theme.textSecondary, marginTop: Spacing.sm },
            ]}
          >
            Each position{"'"}s SAM breakdown is visualized as a radar chart in
            the detail view {"\u2014"} tap any marker on the map to see exactly why it
            earned its spot.
          </ThemedText>
        </SectionCard>

        <SectionCard
          icon="map-pin"
          iconColor="#10B981"
          title="Position Types"
          isDark={isDark}
          theme={theme}
        >
          <ThemedText
            style={[styles.bodyText, { color: theme.textSecondary }]}
          >
            Every tactical position falls into one of three categories, each
            color-coded on the map for instant recognition:
          </ThemedText>

          {POSITION_TYPES.map((pt) => (
            <View key={pt.label} style={styles.positionRow}>
              <View
                style={[styles.positionDot, { backgroundColor: pt.color }]}
              />
              <View style={styles.positionTextContainer}>
                <ThemedText style={styles.positionLabel}>
                  {pt.label}
                </ThemedText>
                <ThemedText
                  style={[styles.bodyText, { color: theme.textSecondary }]}
                >
                  {pt.description}
                </ThemedText>
              </View>
            </View>
          ))}
        </SectionCard>

        <SectionCard
          icon="layers"
          iconColor="#8B5CF6"
          title="Game Mode Overlays"
          isDark={isDark}
          theme={theme}
        >
          <ThemedText
            style={[styles.bodyText, { color: theme.textSecondary }]}
          >
            Toggle objective overlays directly on the tactical map to see how
            each position relates to the mode you{"'"}re playing:
          </ThemedText>

          {GAME_MODES.map((mode) => (
            <View key={mode.label} style={styles.gameModeRow}>
              <View
                style={[
                  styles.gameModeIcon,
                  { backgroundColor: mode.color + "1F" },
                ]}
              >
                <Feather name={mode.icon} size={16} color={mode.color} />
              </View>
              <View style={styles.gameModeTextContainer}>
                <ThemedText style={styles.gameModeLabel}>
                  {mode.label}
                </ThemedText>
                <ThemedText
                  style={[styles.bodyText, { color: theme.textSecondary }]}
                >
                  {mode.description}
                </ThemedText>
              </View>
            </View>
          ))}
        </SectionCard>

        <SectionCard
          icon="maximize"
          iconColor="#EC4899"
          title="Map Controls"
          isDark={isDark}
          theme={theme}
        >
          {MAP_CONTROLS.map((ctrl) => (
            <View key={ctrl.label} style={styles.controlRow}>
              <Feather name={ctrl.icon} size={18} color={theme.textSecondary} />
              <View style={styles.controlTextContainer}>
                <ThemedText style={styles.controlLabel}>
                  {ctrl.label}
                </ThemedText>
                <ThemedText
                  style={[styles.bodyText, { color: theme.textSecondary }]}
                >
                  {ctrl.description}
                </ThemedText>
              </View>
            </View>
          ))}
        </SectionCard>

        <View
          style={[
            styles.closingCard,
            {
              backgroundColor: isDark
                ? "rgba(59, 130, 246, 0.12)"
                : "rgba(59, 130, 246, 0.08)",
              borderColor: isDark
                ? "rgba(59, 130, 246, 0.3)"
                : "rgba(59, 130, 246, 0.2)",
            },
          ]}
        >
          <Feather name="shield" size={24} color="#3B82F6" />
          <ThemedText style={styles.closingTitle}>
            This isn{"'"}t guesswork {"\u2014"} it{"'"}s intelligence.
          </ThemedText>
          <ThemedText
            style={[styles.closingSubtitle, { color: theme.textSecondary }]}
          >
            Every position tested, scored, and mapped. Now go make it count.
          </ThemedText>
        </View>
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
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  intelBadge: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  intelBadgeText: {
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  heroSection: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
  },
  heroTagline: {
    ...Typography.title,
    color: "#3B82F6",
    fontStyle: "italic",
    marginTop: Spacing.xs,
  },
  sectionCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    ...Typography.title,
    fontWeight: "700",
  },
  bodyText: {
    ...Typography.caption,
    lineHeight: 22,
  },
  criteriaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  criteriaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  criteriaNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F59E0B",
  },
  criteriaName: {
    fontSize: 12,
    fontWeight: "500",
  },
  minScoreBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  scoreHighlight: {
    fontWeight: "700",
    color: "#F59E0B",
  },
  positionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  positionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 5,
  },
  positionTextContainer: {
    flex: 1,
  },
  positionLabel: {
    ...Typography.caption,
    fontWeight: "700",
    marginBottom: 2,
  },
  gameModeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  gameModeIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  gameModeTextContainer: {
    flex: 1,
  },
  gameModeLabel: {
    ...Typography.caption,
    fontWeight: "700",
    marginBottom: 2,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  controlTextContainer: {
    flex: 1,
  },
  controlLabel: {
    ...Typography.caption,
    fontWeight: "700",
    marginBottom: 2,
  },
  closingCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  closingTitle: {
    ...Typography.body,
    fontWeight: "700",
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  closingSubtitle: {
    ...Typography.caption,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
});
