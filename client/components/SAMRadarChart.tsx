import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Polygon, Line, Circle, Text as SvgText } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

export interface SAMData {
  overall_score: number;
  criteria: {
    superior_elevation: boolean;
    protected_los: boolean;
    hard_cover: boolean;
    enfilade_angle: boolean;
    limited_entry: boolean;
    primary_egress: boolean;
    interdiction: boolean;
    verticality: boolean;
    overlap_potential: boolean;
    dead_zone_coverage: boolean;
  };
  rationale: string;
}

interface SAMRadarChartProps {
  sam: SAMData;
}

const GOLD = "#D4A017";
const GOLD_LIGHT_FILL = "rgba(212, 160, 23, 0.22)";
const GOLD_DARK_FILL = "rgba(212, 160, 23, 0.28)";

const AXES = [
  { label: "Elevation", shortLabel: "Elevation", keys: ["superior_elevation", "verticality"] },
  { label: "Sightlines", shortLabel: "Sightlines", keys: ["protected_los", "enfilade_angle", "overlap_potential"] },
  { label: "Cover", shortLabel: "Cover", keys: ["hard_cover", "limited_entry", "dead_zone_coverage"] },
  { label: "Escape Routes", shortLabel: "Escape", keys: ["primary_egress", "interdiction"] },
] as const;

function computeAxisScores(criteria: SAMData["criteria"]): number[] {
  return AXES.map((axis) => {
    const yesCount = axis.keys.filter(
      (key) => criteria[key as keyof SAMData["criteria"]]
    ).length;
    return yesCount / axis.keys.length;
  });
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleIndex: number,
  totalAxes: number
): { x: number; y: number } {
  const angle = (Math.PI * 2 * angleIndex) / totalAxes - Math.PI / 2;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

export default function SAMRadarChart({ sam }: SAMRadarChartProps) {
  const { theme, isDark } = useTheme();
  const scores = computeAxisScores(sam.criteria);

  const size = 240;
  const center = size / 2;
  const maxRadius = size / 2 - 56;
  const rings = [0.25, 0.5, 0.75, 1.0];
  const axisCount = AXES.length;

  const gridColor = isDark ? "rgba(148, 163, 184, 0.2)" : "rgba(51, 65, 85, 0.15)";
  const axisColor = isDark ? "rgba(148, 163, 184, 0.3)" : "rgba(51, 65, 85, 0.2)";
  const fillColor = isDark ? GOLD_DARK_FILL : GOLD_LIGHT_FILL;
  const labelColor = isDark ? "#CBD5E1" : "#475569";

  const dataPoints = scores.map((score, i) => {
    const r = score * maxRadius;
    return polarToCartesian(center, center, r, i, axisCount);
  });

  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const labelOffsets = [
    { dx: 0, dy: -10, anchor: "middle" },
    { dx: 6, dy: 0, anchor: "start" },
    { dx: 0, dy: 12, anchor: "middle" },
    { dx: -6, dy: 0, anchor: "end" },
  ];

  const elevationPct = Math.round((scores[0] || 0) * 100);
  const sightlinesPct = Math.round((scores[1] || 0) * 100);
  const coverPct = Math.round((scores[2] || 0) * 100);
  const escapePct = Math.round((scores[3] || 0) * 100);
  const accessibilityDesc = `Defensive profile radar chart. Elevation score: ${elevationPct} percent. Sightlines score: ${sightlinesPct} percent. Cover score: ${coverPct} percent. Escape routes score: ${escapePct} percent. Overall SAM score: ${sam.overall_score} out of 10.`;

  return (
    <View
      accessibilityLabel={accessibilityDesc}
      accessibilityRole="image"
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? "rgba(30, 41, 59, 0.6)"
            : "rgba(241, 245, 249, 0.8)",
          borderColor: isDark
            ? "rgba(51, 65, 85, 0.4)"
            : "rgba(203, 213, 225, 0.6)",
        },
      ]}
    >
      <ThemedText style={styles.sectionTitle}>Defensive Profile</ThemedText>

      <View style={styles.chartContainer}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {rings.map((ring) => {
            const points = Array.from({ length: axisCount }, (_, i) => {
              const p = polarToCartesian(center, center, maxRadius * ring, i, axisCount);
              return `${p.x},${p.y}`;
            }).join(" ");
            return (
              <Polygon
                key={`ring-${ring}`}
                points={points}
                fill="none"
                stroke={gridColor}
                strokeWidth={1}
              />
            );
          })}

          {Array.from({ length: axisCount }, (_, i) => {
            const end = polarToCartesian(center, center, maxRadius, i, axisCount);
            return (
              <Line
                key={`axis-${i}`}
                x1={center}
                y1={center}
                x2={end.x}
                y2={end.y}
                stroke={axisColor}
                strokeWidth={1}
              />
            );
          })}

          <Polygon
            points={dataPolygon}
            fill={fillColor}
            stroke={GOLD}
            strokeWidth={2}
          />

          {dataPoints.map((point, i) => (
            <Circle
              key={`dot-${i}`}
              cx={point.x}
              cy={point.y}
              r={3.5}
              fill={GOLD}
            />
          ))}

          {AXES.map((axis, i) => {
            const labelPos = polarToCartesian(center, center, maxRadius + 4, i, axisCount);
            const offset = labelOffsets[i];
            return (
              <SvgText
                key={`label-${i}`}
                x={labelPos.x + offset.dx}
                y={labelPos.y + offset.dy}
                fontSize={10}
                fontWeight="600"
                fill={labelColor}
                textAnchor={offset.anchor as "middle" | "start" | "end"}
                alignmentBaseline="central"
              >
                {axis.shortLabel}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      <View style={styles.axisScores}>
        {AXES.map((axis, i) => (
          <View key={axis.label} style={styles.axisRow}>
            <View
              style={[
                styles.axisDot,
                { backgroundColor: GOLD },
              ]}
            />
            <ThemedText style={styles.axisLabel}>{axis.label}</ThemedText>
            <ThemedText style={[styles.axisValue, { color: GOLD }]}>
              {Math.round(scores[i] * 100)}%
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

export function SAMScoreCard({ sam }: SAMRadarChartProps) {
  const { isDark } = useTheme();

  const scoreColor =
    sam.overall_score >= 7
      ? "#10B981"
      : sam.overall_score >= 5
        ? "#F59E0B"
        : "#EF4444";

  return (
    <View
      style={[
        styles.caseStudyContainer,
        {
          backgroundColor: isDark
            ? "rgba(30, 41, 59, 0.6)"
            : "rgba(241, 245, 249, 0.8)",
          borderColor: GOLD,
        },
      ]}
    >
      <View style={styles.caseStudyHeader}>
        <ThemedText style={styles.sectionTitle}>SAM Score</ThemedText>
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
          <ThemedText style={styles.scoreText}>
            {sam.overall_score}/10
          </ThemedText>
        </View>
      </View>

      <ThemedText style={styles.samSubtitle}>Strategic Advantage Matrix</ThemedText>

      <ThemedText style={styles.rationale}>{sam.rationale}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.caption,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  axisScores: {
    gap: Spacing.xs,
  },
  axisRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  axisDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  axisLabel: {
    ...Typography.small,
    flex: 1,
  },
  axisValue: {
    ...Typography.small,
    fontWeight: "700",
  },
  caseStudyContainer: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  caseStudyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  scoreBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  scoreText: {
    ...Typography.caption,
    color: "#FFFFFF",
    fontWeight: "800",
  },
  samSubtitle: {
    ...Typography.small,
    fontStyle: "italic",
    opacity: 0.55,
    marginBottom: Spacing.sm,
    marginTop: -Spacing.xs,
  },
  rationale: {
    ...Typography.small,
    lineHeight: 18,
  },
});
