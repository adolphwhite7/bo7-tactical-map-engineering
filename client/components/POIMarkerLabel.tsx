
import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  PanResponder,
  Animated,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { POIColors } from "@/constants/theme";
import CalibratableDot from "./CalibratableDot";
import CalibratableLabel from "./CalibratableLabel";

const EDGE_MARGIN = 12;
const LABEL_HEIGHT = 24;
const SAFE_ZONE_TOP = 14;
const SAFE_ZONE_BOTTOM = 10;
const SCREEN_EDGE_SAFE_PERCENT = 0;
const TOOLTIP_WIDTH = 110;
const TOOLTIP_HEIGHT = 28;
const CARET_SIZE = 6;

const TYPE_LABELS: Record<string, string> = {
  power_position: "Power Position",
  cover: "Cover",
  flank: "Flank",
  hazard: "Hazard",
  objective: "Objective",
  escape: "Escape",
};

const normalizeType = (type: string): string => {
  return type.toLowerCase().replace(/\s+/g, "_");
};

const getColorForType = (type: string): string => {
  const normalized = normalizeType(type);
  return POIColors[normalized as keyof typeof POIColors] || "#94A3B8";
};

interface POIData {
  id: string;
  hud_name?: string;
  type:
    | "hazard"
    | "objective"
    | "flank"
    | "cover"
    | "escape"
    | "power_position";
  coordinates: { x: number; y: number };
  content: {
    title: string;
    description?: string;
    proTip?: string;
    relatedImageFile?: string;
  };
}

interface LayoutInfo {
  labelOnLeft: boolean;
  labelY: number;
  position: { x: number; y: number };
}

interface BorderOffset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface POILabelsContainerProps {
  pois: POIData[];
  getMarkerPosition: (poi: POIData) => { x: number; y: number };
  getLayoutPosition?: (poi: POIData) => { x: number; y: number };
  getRawPosition?: (poi: POIData) => { x: number; y: number };
  mapDimensions: { width: number; height: number };
  onMarkerPress: (poi: POIData) => void;
  showCoordinates?: boolean;
  calibrationMode?: boolean;
  onPositionChange?: (id: string, x: number, y: number) => void;
  labelPositions?: Record<string, { x: number; y: number }>;
  onLabelPositionChange?: (id: string, x: number, y: number) => void;
  borderOffset?: BorderOffset;
  coachMarkPoiId?: string | null;
  onCoachMarkDismiss?: () => void;
}

function computeOptimalLayout(
  pois: Array<POIData & { position: { x: number; y: number } }>,
): Array<POIData & LayoutInfo> {
  const withSide = pois.map((poi) => ({
    ...poi,
    labelOnLeft: poi.position.x <= 50,
    labelY: poi.position.y,
  }));

  const leftPois = withSide
    .filter((p) => p.labelOnLeft)
    .sort((a, b) => a.position.y - b.position.y);
  const rightPois = withSide
    .filter((p) => !p.labelOnLeft)
    .sort((a, b) => a.position.y - b.position.y);

  const availableRange = 100 - SAFE_ZONE_TOP - SAFE_ZONE_BOTTOM;

  const distributeLabels = (group: typeof leftPois): typeof leftPois => {
    if (group.length === 0) return group;
    const spacing = availableRange / (group.length + 1);
    return group.map((poi, index) => ({
      ...poi,
      labelY: SAFE_ZONE_TOP + spacing * (index + 1),
    }));
  };

  return [...distributeLabels(leftPois), ...distributeLabels(rightPois)];
}

function calculateLabelAnchorPoint(
  dotX: number,
  dotY: number,
  labelLeft: number,
  labelTop: number,
  labelWidth: number,
  labelHeight: number,
): { x: number; y: number } {
  const labelCenterX = labelLeft + labelWidth / 2;
  const labelCenterY = labelTop + labelHeight / 2;
  const labelRight = labelLeft + labelWidth;
  const labelBottom = labelTop + labelHeight;

  const edges = {
    top: { x: labelCenterX, y: labelTop },
    bottom: { x: labelCenterX, y: labelBottom },
    left: { x: labelLeft, y: labelCenterY },
    right: { x: labelRight, y: labelCenterY },
  };

  const distances = {
    top: Math.hypot(dotX - edges.top.x, dotY - edges.top.y),
    bottom: Math.hypot(dotX - edges.bottom.x, dotY - edges.bottom.y),
    left: Math.hypot(dotX - edges.left.x, dotY - edges.left.y),
    right: Math.hypot(dotX - edges.right.x, dotY - edges.right.y),
  };

  let closestEdge: keyof typeof edges = "bottom";
  let minDist = Infinity;

  for (const [edge, dist] of Object.entries(distances)) {
    if (dist < minDist) {
      minDist = dist;
      closestEdge = edge as keyof typeof edges;
    }
  }

  return edges[closestEdge];
}

function CoachMarkTooltip({
  labelPos,
  labelWidth,
  color,
  mapHeight,
}: {
  labelPos: { x: number; y: number };
  labelWidth: number;
  color: string;
  mapHeight: number;
}) {
  const centerX = labelPos.x + labelWidth / 2;
  const tooltipLeft = Math.max(4, centerX - TOOLTIP_WIDTH / 2);

  const spaceAbove = labelPos.y;
  const placeAbove = spaceAbove >= TOOLTIP_HEIGHT + CARET_SIZE + 6;

  const tooltipTop = placeAbove
    ? labelPos.y - TOOLTIP_HEIGHT - CARET_SIZE - 4
    : labelPos.y + LABEL_HEIGHT + CARET_SIZE + 4;

  const caretLeft = centerX - tooltipLeft - CARET_SIZE;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.tooltipContainer,
        {
          left: tooltipLeft,
          top: tooltipTop,
          width: TOOLTIP_WIDTH,
          borderColor: color,
        },
      ]}
    >
      <Text style={styles.tooltipText} allowFontScaling={false}>
        TAP FOR INTEL
      </Text>
      {/* Caret */}
      {placeAbove ? (
        <View
          style={[
            styles.caretDown,
            {
              left: Math.max(4, Math.min(TOOLTIP_WIDTH - CARET_SIZE * 2 - 4, caretLeft)),
              borderTopColor: color,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.caretUp,
            {
              left: Math.max(4, Math.min(TOOLTIP_WIDTH - CARET_SIZE * 2 - 4, caretLeft)),
              borderBottomColor: color,
            },
          ]}
        />
      )}
    </View>
  );
}

export function POILabelsContainer({
  pois,
  getMarkerPosition,
  getLayoutPosition,
  getRawPosition,
  mapDimensions,
  onMarkerPress,
  showCoordinates = false,
  calibrationMode = false,
  onPositionChange,
  labelPositions = {},
  onLabelPositionChange,
  borderOffset,
  coachMarkPoiId = null,
  onCoachMarkDismiss,
}: POILabelsContainerProps) {
  const [labelWidths, setLabelWidths] = React.useState<Record<string, number>>(
    {},
  );

  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const pulseAnimation = React.useRef<Animated.CompositeAnimation | null>(null);

  React.useEffect(() => {
    if (coachMarkPoiId) {
      pulseAnimation.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnimation.current.start();
    } else {
      if (pulseAnimation.current) {
        pulseAnimation.current.stop();
        pulseAnimation.current = null;
      }
      pulseAnim.setValue(1);
    }
    return () => {
      if (pulseAnimation.current) {
        pulseAnimation.current.stop();
        pulseAnimation.current = null;
      }
    };
  }, [coachMarkPoiId]);

  const layoutPositionFn = getLayoutPosition || getMarkerPosition;
  const rawPositionFn = getRawPosition || ((poi: POIData) => poi.coordinates);

  const poisWithPositions = pois.map((poi) => ({
    ...poi,
    position: layoutPositionFn(poi),
  }));

  const layout = computeOptimalLayout(poisWithPositions);

  const positioned = layout.map((lp) => {
    const originalPoi = pois.find((p) => p.id === lp.id)!;
    return {
      ...lp,
      position: getMarkerPosition(originalPoi),
      rawPosition: rawPositionFn(originalPoi),
    };
  });

  const handleLabelLayout = (id: string, width: number) => {
    if (width > 0 && labelWidths[id] !== width) {
      setLabelWidths((prev) => ({ ...prev, [id]: width }));
    }
  };

  const handlePress = (poi: POIData) => {
    if (calibrationMode) return;
    if (coachMarkPoiId && onCoachMarkDismiss) onCoachMarkDismiss();
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMarkerPress(poi);
  };

  const handleCalibratableDotPositionChange = React.useCallback(
    (poiId: string, position: { x: number; y: number }) => {
      if (onPositionChange) {
        onPositionChange(poiId, position.x, position.y);
      }
    },
    [onPositionChange],
  );

  const handleCalibratableLabelPositionChange = React.useCallback(
    (poiId: string, position: { x: number; y: number }) => {
      if (onLabelPositionChange) {
        onLabelPositionChange(poiId, position.x, position.y);
      }
    },
    [onLabelPositionChange],
  );

  if (mapDimensions.width <= 0 || mapDimensions.height <= 0) {
    return null;
  }

  const svgWidth = mapDimensions.width;
  const svgHeight = mapDimensions.height;
  const viewBox = `0 0 ${svgWidth} ${svgHeight}`;

  const clampToSafeZone = (
    xPx: number,
    yPx: number,
    _labelWidth: number,
  ): { x: number; y: number } => {
    return { x: xPx, y: yPx };
  };

  const getLabelPosition = (poi: POIData & LayoutInfo) => {
    const actualLabelWidth = labelWidths[poi.id] || 120;

    if (labelPositions[poi.id]) {
      const lp = labelPositions[poi.id];
      const rawX = (lp.x / 100) * mapDimensions.width;
      const rawY = (lp.y / 100) * mapDimensions.height - LABEL_HEIGHT / 2;
      const clamped = clampToSafeZone(rawX, rawY, actualLabelWidth);
      return {
        x: clamped.x,
        y: clamped.y,
        percentX: (clamped.x / mapDimensions.width) * 100,
        percentY: ((clamped.y + LABEL_HEIGHT / 2) / mapDimensions.height) * 100,
      };
    }

    const labelYPixels = (poi.labelY / 100) * mapDimensions.height;
    const labelX = poi.labelOnLeft
      ? EDGE_MARGIN
      : mapDimensions.width - EDGE_MARGIN - actualLabelWidth;
    const rawY = labelYPixels - LABEL_HEIGHT / 2;
    const clamped = clampToSafeZone(labelX, rawY, actualLabelWidth);

    return {
      x: clamped.x,
      y: clamped.y,
      percentX: (clamped.x / mapDimensions.width) * 100,
      percentY: ((clamped.y + LABEL_HEIGHT / 2) / mapDimensions.height) * 100,
    };
  };

  // ─── Cross-side label collision resolution (display mode only) ───────────
  // Detects labels whose bounding boxes overlap on screen (can happen on
  // narrow devices even when labels are on opposite sides) and pushes them
  // apart vertically. Also enforces a minimum visible connector line length.
  const MIN_CONNECTOR_PX = 22;
  const COLLISION_GAP_PX = 4; // minimum vertical gap to maintain between labels

  const collisionYOverrides: Record<string, number> = {};

  if (!calibrationMode && mapDimensions.width > 0 && mapDimensions.height > 0) {
    const safeTopPx = (SAFE_ZONE_TOP / 100) * mapDimensions.height;
    const safeBotPx =
      mapDimensions.height -
      (SAFE_ZONE_BOTTOM / 100) * mapDimensions.height -
      LABEL_HEIGHT;

    // Snapshot each label's bounding rect (top-left x, top y, width)
    const rects: Record<string, { x: number; y: number; w: number }> = {};
    for (const poi of positioned) {
      const pos = getLabelPosition(poi);
      rects[poi.id] = { x: pos.x, y: pos.y, w: labelWidths[poi.id] || 120 };
    }

    // Iterative collision resolution — up to 8 passes until stable
    const adjusted: Record<string, number> = {};
    for (let iter = 0; iter < 8; iter++) {
      let anyChange = false;
      const ids = Object.keys(rects);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const aId = ids[i];
          const bId = ids[j];
          const aY = adjusted[aId] !== undefined ? adjusted[aId] : rects[aId].y;
          const bY = adjusted[bId] !== undefined ? adjusted[bId] : rects[bId].y;

          // Skip if no horizontal overlap
          if (rects[aId].x >= rects[bId].x + rects[bId].w) continue;
          if (rects[bId].x >= rects[aId].x + rects[aId].w) continue;

          // Measure vertical overlap (including required gap)
          const aBottom = aY + LABEL_HEIGHT;
          const bBottom = bY + LABEL_HEIGHT;
          const overlapAmt =
            Math.min(aBottom, bBottom) - Math.max(aY, bY) + COLLISION_GAP_PX;
          if (overlapAmt <= 0) continue;

          // Push the lower label down first; if it can't go far enough, push upper up
          const topId = aY <= bY ? aId : bId;
          const botId = aY <= bY ? bId : aId;
          const topY = aY <= bY ? aY : bY;
          const botY = aY <= bY ? bY : aY;

          const newBotY = Math.min(safeBotPx, botY + overlapAmt);
          const actualBotMove = newBotY - botY;
          const remaining = overlapAmt - actualBotMove;
          const newTopY = Math.max(safeTopPx, topY - remaining);

          if (
            Math.abs(newBotY - botY) > 0.5 ||
            Math.abs(newTopY - topY) > 0.5
          ) {
            anyChange = true;
            adjusted[botId] = newBotY;
            adjusted[topId] = newTopY;
          }
        }
      }
      if (!anyChange) break;
    }

    // Condition 2: enforce minimum visible connector line length.
    // If collision resolution pushed a label too close to its POI dot,
    // push the label further outward so the line stays visible.
    for (const [id, newY] of Object.entries(adjusted)) {
      const poi = positioned.find((p) => p.id === id);
      if (!poi) {
        collisionYOverrides[id] = newY;
        continue;
      }
      const labelX = rects[id].x;
      const labelW = rects[id].w;
      const dotX = (poi.position.x / 100) * mapDimensions.width;
      const dotY = (poi.position.y / 100) * mapDimensions.height;

      const anchor = calculateLabelAnchorPoint(
        dotX, dotY, labelX, newY, labelW, LABEL_HEIGHT,
      );
      const lineDist = Math.hypot(anchor.x - dotX, anchor.y - dotY);

      let finalY = newY;
      if (lineDist < MIN_CONNECTOR_PX) {
        const deficit = MIN_CONNECTOR_PX - lineDist;
        const dotBelowLabel = dotY > newY + LABEL_HEIGHT / 2;
        if (dotBelowLabel) {
          // Dot is below → move label up to create space
          finalY = Math.max(safeTopPx, newY - deficit);
        } else {
          // Dot is above → move label down to create space
          finalY = Math.min(safeBotPx, newY + deficit);
        }
      }

      collisionYOverrides[id] = finalY;
    }
  }

  // Returns label position with collision Y-override applied when present
  const getFinalLabelPosition = (poi: POIData & LayoutInfo) => {
    const base = getLabelPosition(poi);
    const overrideY = collisionYOverrides[poi.id];
    if (overrideY !== undefined) {
      return {
        x: base.x,
        y: overrideY,
        percentX: base.percentX,
        percentY:
          ((overrideY + LABEL_HEIGHT / 2) / mapDimensions.height) * 100,
      };
    }
    return base;
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={[StyleSheet.absoluteFill, calibrationMode ? { overflow: 'visible' } : undefined]} pointerEvents="box-none">
      {/* Layer 1: Labels (rendered first, below everything) */}
      <View
        style={[StyleSheet.absoluteFill, { zIndex: 1 }, calibrationMode ? { overflow: 'visible' } : undefined]}
        pointerEvents="box-none"
      >
        {positioned.map((poi) => {
          const displayName = poi.hud_name || poi.content.title;
          const typeLabel = TYPE_LABELS[normalizeType(poi.type)] || TYPE_LABELS[poi.type] || poi.type;
          const color = getColorForType(poi.type);
          const labelPos = getFinalLabelPosition(poi);
          const hasCustomPosition = !!labelPositions[poi.id];
          const isHighlighted = poi.id === coachMarkPoiId;
          const labelWidth = labelWidths[poi.id] || 120;

          if (calibrationMode && onLabelPositionChange) {
            return (
              <CalibratableLabel
                key={`label-${poi.id}`}
                poiId={poi.id}
                initialPosition={{ x: labelPos.x, y: labelPos.y }}
                displayName={displayName}
                typeLabel={typeLabel}
                color={color}
                isCalibrationMode={calibrationMode}
                hasCustomPosition={hasCustomPosition}
                onPositionChange={handleCalibratableLabelPositionChange}
                onLayout={handleLabelLayout}
                mapDimensions={mapDimensions}
              />
            );
          }

          return (
            <React.Fragment key={`label-group-${poi.id}`}>
              {isHighlighted ? (
                <CoachMarkTooltip
                  labelPos={labelPos}
                  labelWidth={labelWidth}
                  color={color}
                  mapHeight={mapDimensions.height}
                />
              ) : null}
              <Animated.View
                style={[
                  styles.labelWrapper,
                  { left: labelPos.x, top: labelPos.y },
                  isHighlighted ? { transform: [{ scale: pulseAnim }] } : null,
                ]}
              >
                <Pressable
                  onLayout={(e) =>
                    handleLabelLayout(poi.id, e.nativeEvent.layout.width)
                  }
                  style={({ pressed }) => [
                    styles.label,
                    {
                      opacity: pressed ? 0.7 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                  onPress={() => handlePress(poi)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={calibrationMode}
                  accessibilityLabel={`${displayName}, ${typeLabel}`}
                  accessibilityRole="button"
                  accessibilityHint="Double tap for tactical details"
                >
                  <View style={styles.labelContent}>
                    <Text
                      style={styles.labelText}
                      numberOfLines={1}
                      allowFontScaling={false}
                    >
                      {displayName.toUpperCase()}{" "}
                      <Text
                        style={[styles.typeText, { color }]}
                        allowFontScaling={false}
                      >
                        ({typeLabel})
                      </Text>
                    </Text>
                    <Feather
                      name="chevron-right"
                      size={10}
                      color="rgba(255,255,255,0.6)"
                      style={styles.chevron}
                    />
                  </View>
                </Pressable>
              </Animated.View>
            </React.Fragment>
          );
        })}
      </View>

      {/* Layer 2: Connector lines (rendered above labels) */}
      <View
        style={[StyleSheet.absoluteFill, { zIndex: 2 }]}
        pointerEvents="none"
      >
        <Svg
          width={svgWidth}
          height={svgHeight}
          viewBox={viewBox}
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          {positioned.map((poi) => {
            const color = getColorForType(poi.type);
            const targetX = (poi.position.x / 100) * mapDimensions.width;
            const targetY = (poi.position.y / 100) * mapDimensions.height;
            const actualLabelWidth = labelWidths[poi.id] || 120;
            const labelPos = getFinalLabelPosition(poi);

            const labelLeft = labelPos.x;
            const labelTop = labelPos.y;

            const anchor = calculateLabelAnchorPoint(
              targetX,
              targetY,
              labelLeft,
              labelTop,
              actualLabelWidth,
              LABEL_HEIGHT,
            );

            const pathD = `M ${anchor.x} ${anchor.y} L ${targetX} ${targetY}`;

            return (
              <Path
                key={`line-${poi.id}`}
                d={pathD}
                stroke={color}
                strokeWidth={2}
                fill="none"
                opacity={0.9}
              />
            );
          })}
        </Svg>
      </View>

      {/* Layer 3: POI dots (rendered on top of everything) */}
      <View
        style={[StyleSheet.absoluteFill, { zIndex: 3 }]}
        pointerEvents="none"
      >
        <Svg
          width={svgWidth}
          height={svgHeight}
          viewBox={viewBox}
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          {positioned.map((poi) => {
            if (calibrationMode) return null;
            const color = getColorForType(poi.type);
            const targetX = (poi.position.x / 100) * mapDimensions.width;
            const targetY = (poi.position.y / 100) * mapDimensions.height;

            return (
              <Circle
                key={`dot-${poi.id}`}
                cx={targetX}
                cy={targetY}
                r={3}
                fill={color}
                stroke="#FFFFFF"
                strokeWidth={0.5}
              />
            );
          })}
        </Svg>
      </View>

      {/* Layer 4: Touch targets for POI dots (invisible, on top for interaction) */}
      <View
        style={[StyleSheet.absoluteFill, { zIndex: 4 }]}
        pointerEvents="box-none"
      >
        {positioned.map((poi) => {
          const targetX = (poi.position.x / 100) * mapDimensions.width;
          const targetY = (poi.position.y / 100) * mapDimensions.height;
          const displayName = poi.hud_name || poi.content.title;
          const color = getColorForType(poi.type);
          const typeLabel = TYPE_LABELS[normalizeType(poi.type)] || TYPE_LABELS[poi.type] || poi.type;

          if (calibrationMode && onPositionChange) {
            return (
              <CalibratableDot
                key={`calibrate-${poi.id}`}
                poiId={poi.id}
                initialPosition={{ x: targetX, y: targetY }}
                color={color}
                isCalibrationMode={calibrationMode}
                onPositionChange={handleCalibratableDotPositionChange}
                mapDimensions={mapDimensions}
                dotSize={6}
              />
            );
          }

          return (
            <Pressable
              key={`touch-${poi.id}`}
              style={[
                styles.dotTouchArea,
                { left: targetX - 22, top: targetY - 22 },
              ]}
              onPress={() => handlePress(poi)}
              hitSlop={0}
              accessibilityLabel={`${displayName}, ${typeLabel}`}
              accessibilityRole="button"
              accessibilityHint="Double tap for tactical details"
            />
          );
        })}
      </View>

      {/* Layer 5: Coordinate display for calibration */}
      {showCoordinates ? (
        <View
          style={[StyleSheet.absoluteFill, { zIndex: 5 }]}
          pointerEvents="none"
        >
          {positioned.map((poi) => {
            const targetX = (poi.position.x / 100) * mapDimensions.width;
            const targetY = (poi.position.y / 100) * mapDimensions.height;
            const labelPos = getFinalLabelPosition(poi);

            return (
              <React.Fragment key={`coords-${poi.id}`}>
                {/* CALIBRATION COORDINATE RULE: DOT and LBL overlays MUST
                    show RAW coordinates (matching JSON data), NOT display/rendered
                    coordinates.
                    DOT: uses poi.rawPosition directly (stored as % of playable area).
                    LBL: uses labelPos.percentX/Y directly — labels are stored as % of
                    the FULL map image, so NO borderOffset transform is applied. */}
                <View
                  style={[
                    styles.coordBox,
                    { left: targetX + 12, top: targetY - 10 },
                  ]}
                >
                  <Text style={styles.coordText}>
                    DOT: {Math.round(poi.rawPosition.x)},{" "}
                    {Math.round(poi.rawPosition.y)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.coordBox,
                    styles.labelCoordBox,
                    { left: labelPos.x, top: labelPos.y - 18 },
                  ]}
                >
                  <Text style={styles.labelCoordText}>
                    LBL: {Math.round(labelPos.percentX)},{" "}
                    {Math.round(labelPos.percentY)}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      ) : null}

      {/* Calibration hint */}
      {calibrationMode ? (
        <View style={styles.calibrationHint} pointerEvents="none">
          <Text style={styles.calibrationHintText}>
            Drag dots or labels to adjust positions
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function POIMarkerLabel({
  poi,
  position,
  labelY,
  labelOnLeft,
  mapDimensions,
  onPress,
}: {
  poi: POIData;
  position: { x: number; y: number };
  labelY: number;
  labelOnLeft: boolean;
  mapDimensions: { width: number; height: number };
  onPress: () => void;
  showCoordinates?: boolean;
  calibrationMode?: boolean;
  onPositionChange?: (id: string, x: number, y: number) => void;
}) {
  return (
    <POILabelsContainer
      pois={[poi]}
      getMarkerPosition={() => position}
      mapDimensions={mapDimensions}
      onMarkerPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  labelWrapper: {
    position: "absolute",
  },
  label: {
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    height: LABEL_HEIGHT,
    justifyContent: "center",
  },
  labelContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  chevron: {
    marginLeft: 4,
  },
  labelCalibrationMode: {
    borderWidth: 2,
    borderColor: "#00FF00",
    borderStyle: "dashed",
  },
  labelCustomPosition: {
    borderColor: "#FFFF00",
  },
  labelText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "500",
  },
  tooltipContainer: {
    position: "absolute",
    height: TOOLTIP_HEIGHT,
    backgroundColor: "rgba(5, 10, 18, 0.95)",
    borderWidth: 1,
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  tooltipText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  caretDown: {
    position: "absolute",
    bottom: -CARET_SIZE - 1,
    width: 0,
    height: 0,
    borderLeftWidth: CARET_SIZE,
    borderRightWidth: CARET_SIZE,
    borderTopWidth: CARET_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  caretUp: {
    position: "absolute",
    top: -CARET_SIZE - 1,
    width: 0,
    height: 0,
    borderLeftWidth: CARET_SIZE,
    borderRightWidth: CARET_SIZE,
    borderBottomWidth: CARET_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  coordBox: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
  },
  labelCoordBox: {
    backgroundColor: "rgba(50, 50, 0, 0.85)",
  },
  coordText: {
    color: "#00FF00",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "600",
  },
  labelCoordText: {
    color: "#FFFF00",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "600",
  },
  dragHandle: {
    position: "absolute",
    width: 40,
    height: 40,
  },
  dotTouchArea: {
    position: "absolute",
    width: 44,
    height: 44,
  },
  calibrationHint: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  calibrationHintText: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    color: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "500",
  },
});
