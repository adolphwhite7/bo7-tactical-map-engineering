import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useLayoutEffect,
  useEffect,
} from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  LayoutChangeEvent,
  PanResponder,
  ScrollView,
  Alert,
  Modal,
  Animated,
  Text,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ReactNativeZoomableView } from "@openspacelabs/react-native-zoomable-view";
import * as Haptics from "expo-haptics";
import Svg, { Line, Rect, Circle, Path } from "react-native-svg";

import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  POIColors,
  Typography,
  BorderRadius,
} from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { getBaseMapImage, getMapAspectRatio } from "@/constants/assetRegistry";
import { getApiUrl } from "@/lib/query-client";
import { POILabelsContainer } from "@/components/POIMarkerLabel";
import { ObjectiveMarker, ObjectiveLegend } from "@/components/ObjectiveMarker";
import { LayerToggleButton } from "@/components/LayerToggleButton";
import blackheartData from "@/data/blackheart_data.json";
import utopiaData from "@/data/utopia_data.json";
import colossusData from "@/data/colossus_data.json";
import cortexData from "@/data/cortex_data.json";
import odysseusData from "@/data/odysseus_data.json";
import fateData from "@/data/fate_data.json";
import {
  RootStackParamList,
  PointOfInterest,
} from "@/navigation/RootStackNavigator";
import { getOverviewImage } from "@/constants/assetRegistry";

type MapScreenRouteProp = RouteProp<RootStackParamList, "Map">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Map">;

interface BorderOffset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface ObjectiveLocation {
  id: string;
  zone?: string;
  order?: number;
  name?: string;
  number?: number;
  site?: string;
  coordinates: { x: number; y: number };
  description?: string;
}

interface ObjectivesData {
  domination?: ObjectiveLocation[];
  hardpoint?: ObjectiveLocation[];
  searchAndDestroy?: ObjectiveLocation[];
}

interface OperationalOverview {
  imageFile: string;
  setting: string;
  factions: string;
  description: string;
  lanes?: Array<{ name: string; description: string }>;
}

interface MapData {
  mapId?: string;
  mapName: string;
  mapImageFile: string;
  hasSearchAndDestroy?: boolean;
  pointsOfInterest: PointOfInterest[];
  strategyOverlays?: any[];
  dimensions?: { width: number; height: number; aspectRatio?: number };
  borderOffset?: BorderOffset;
  hardpoints?: Array<{
    id: string;
    name: string;
    coordinates: { x: number; y: number };
  }>;
  objectives?: ObjectivesData;
  operationalOverview?: OperationalOverview;
}

const mapDataRegistry: Record<string, MapData> = {
  blackheart: blackheartData as unknown as MapData,
  utopia: utopiaData as unknown as MapData,
  colossus: colossusData as unknown as MapData,
  cortex: cortexData as unknown as MapData,
  odysseus: odysseusData as unknown as MapData,
  fate: fateData as unknown as MapData,
};

const getIconForType = (type: string): keyof typeof Feather.glyphMap => {
  const normalized = type.toLowerCase().replace(/\s+/g, "_");
  switch (normalized) {
    case "hazard":
      return "alert-triangle";
    case "objective":
      return "flag";
    case "flank":
      return "navigation";
    case "cover":
      return "shield";
    case "escape":
      return "log-out";
    case "power_position":
      return "crosshair";
    default:
      return "map-pin";
  }
};

const getColorForType = (type: string): string => {
  const normalized = type.toLowerCase().replace(/\s+/g, "_");
  return POIColors[normalized as keyof typeof POIColors] || "#94A3B8";
};

/**
 * Convert display coordinates (what user sees on screen) to raw JSON coordinates
 * This is the INVERSE of the borderOffset transformation applied during rendering
 */
const displayToRawCoordinates = (
  displayX: number,
  displayY: number,
  borderOffset: BorderOffset | undefined,
): { x: number; y: number } => {
  if (!borderOffset) return { x: displayX, y: displayY };

  const effectiveWidth = 100 - borderOffset.left - borderOffset.right;
  const effectiveHeight = 100 - borderOffset.top - borderOffset.bottom;

  const rawX = ((displayX - borderOffset.left) / effectiveWidth) * 100;
  const rawY = ((displayY - borderOffset.top) / effectiveHeight) * 100;

  return {
    x: Math.round(rawX * 100) / 100,
    y: Math.round(rawY * 100) / 100,
  };
};

/**
 * Convert raw JSON coordinates to display coordinates
 * This is the FORWARD borderOffset transformation
 */
const rawToDisplayCoordinates = (
  rawX: number,
  rawY: number,
  borderOffset: BorderOffset | undefined,
): { x: number; y: number } => {
  if (!borderOffset) return { x: rawX, y: rawY };

  const effectiveWidth = 100 - borderOffset.left - borderOffset.right;
  const effectiveHeight = 100 - borderOffset.top - borderOffset.bottom;

  const displayX = borderOffset.left + (rawX / 100) * effectiveWidth;
  const displayY = borderOffset.top + (rawY / 100) * effectiveHeight;

  return { x: displayX, y: displayY };
};

interface DraggableMarkerProps {
  poi: PointOfInterest;
  position: { x: number; y: number };
  onPositionChange: (id: string, x: number, y: number) => void;
  imageBounds: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
  calibrationMode: boolean;
  onPress: () => void;
}

function DraggableMarker({
  poi,
  position,
  onPositionChange,
  imageBounds,
  calibrationMode,
  onPress,
}: DraggableMarkerProps) {
  const iconColor = getColorForType(poi.type);
  const iconName = getIconForType(poi.type);
  const startPos = useRef({ x: position.x, y: position.y });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => calibrationMode,
        onMoveShouldSetPanResponder: () => calibrationMode,
        onStartShouldSetPanResponderCapture: () => calibrationMode,
        onMoveShouldSetPanResponderCapture: () => calibrationMode,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          startPos.current = { x: position.x, y: position.y };
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        },
        onPanResponderMove: (_, gestureState) => {
          if (!calibrationMode) return;

          const deltaXPercent = (gestureState.dx / imageBounds.width) * 100;
          const deltaYPercent = (gestureState.dy / imageBounds.height) * 100;

          let newX = startPos.current.x + deltaXPercent;
          let newY = startPos.current.y + deltaYPercent;

          newX = Math.max(0, Math.min(100, newX));
          newY = Math.max(0, Math.min(100, newY));

          onPositionChange(poi.id, newX, newY);
        },
        onPanResponderRelease: () => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        },
      }),
    [
      calibrationMode,
      imageBounds,
      position.x,
      position.y,
      poi.id,
      onPositionChange,
    ],
  );

  return (
    <View
      {...(calibrationMode ? panResponder.panHandlers : {})}
      style={[
        styles.marker,
        {
          left: `${position.x}%`,
          top: `${position.y}%`,
          borderColor: iconColor,
          transform: [{ translateX: -22 }, { translateY: -22 }],
        },
      ]}
    >
      <Pressable
        onPress={calibrationMode ? undefined : onPress}
        style={styles.markerInner}
        disabled={calibrationMode}
        accessibilityLabel={`Point of Interest: ${poi.content.title}`}
        accessibilityRole="button"
        accessibilityHint={`Opens details and strategy for ${poi.content.title}`}
      >
        <Feather name={iconName} size={18} color={iconColor} />
      </Pressable>

      {/* CALIBRATION COORDINATE RULE: This component is unused (legacy).
          If re-enabled, coordinate overlays MUST show RAW coordinates
          (matching JSON data), NOT display/rendered coordinates.
          See DraggableObjectiveMarker for the correct pattern using rawPosition. */}
      {calibrationMode ? (
        <View style={styles.coordLabel}>
          <ThemedText style={styles.coordText}>
            {position.x.toFixed(2)}, {position.y.toFixed(2)}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

interface DraggableObjectiveMarkerProps {
  id: string;
  type: "domination" | "hardpoint" | "searchAndDestroy";
  zone: string;
  order?: number;
  position: { x: number; y: number };
  rawPosition: { x: number; y: number };
  onPositionChange: (id: string, x: number, y: number) => void;
  imageBounds: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
}

function DraggableObjectiveMarker({
  id,
  type,
  zone,
  order,
  position,
  rawPosition,
  onPositionChange,
  imageBounds,
}: DraggableObjectiveMarkerProps) {
  const startPos = useRef({ x: position.x, y: position.y });
  const currentPos = useRef({ x: position.x, y: position.y });
  const imageBoundsRef = useRef(imageBounds);
  const onPositionChangeRef = useRef(onPositionChange);

  useEffect(() => {
    currentPos.current = { x: position.x, y: position.y };
  }, [position.x, position.y]);

  useEffect(() => {
    imageBoundsRef.current = imageBounds;
  }, [imageBounds]);

  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  const getMarkerColor = () => {
    if (type === "hardpoint") return "#FFD700";
    if (type === "searchAndDestroy") {
      switch (zone) {
        case "A":
          return "#FF6B35";
        case "B":
          return "#00D4FF";
        default:
          return "#FF6B35";
      }
    }
    switch (zone) {
      case "A":
        return "#FF4444";
      case "B":
        return "#FFFFFF";
      case "C":
        return "#4444FF";
      default:
        return "#888888";
    }
  };

  const getLabel = () => {
    if (type === "hardpoint") return `${order}`;
    if (type === "searchAndDestroy") return zone;
    return zone;
  };

  const markerColor = getMarkerColor();
  const label = getLabel();
  const isSquare = type === "searchAndDestroy";

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          startPos.current = { x: currentPos.current.x, y: currentPos.current.y };
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        },
        onPanResponderMove: (_, gestureState) => {
          const bounds = imageBoundsRef.current;
          const deltaXPercent = (gestureState.dx / bounds.width) * 100;
          const deltaYPercent = (gestureState.dy / bounds.height) * 100;

          let newX = startPos.current.x + deltaXPercent;
          let newY = startPos.current.y + deltaYPercent;

          newX = Math.max(0, Math.min(100, newX));
          newY = Math.max(0, Math.min(100, newY));

          currentPos.current = { x: newX, y: newY };
          onPositionChangeRef.current(id, newX, newY);
        },
        onPanResponderRelease: () => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        },
      }),
    [id],
  );

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.objectiveMarkerDraggableWrapper,
        {
          left: `${position.x}%`,
          top: `${position.y}%`,
          transform: [{ translateX: -22 }, { translateY: -22 }],
        },
      ]}
      accessibilityLabel={`Objective ${label} draggable`}
      accessibilityRole="button"
      accessibilityHint="Drag to reposition objective marker"
    >
      <View
        style={[
          styles.objectiveMarkerDraggable,
          {
            backgroundColor: markerColor,
            borderColor:
              type === "domination" && zone === "B" ? "#333" : markerColor,
            borderRadius: isSquare ? 2 : 5.5,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.objectiveMarkerText,
            {
              color:
                (type === "domination" && zone === "B") || type === "hardpoint"
                  ? "#000"
                  : "#FFF",
            },
          ]}
        >
          {label}
        </ThemedText>
      </View>
      {/* CALIBRATION COORDINATE RULE: Always display RAW coordinates here
          (rawPosition), NOT display/rendered coordinates (position).
          Raw coords match the JSON data files directly. */}
      <View style={styles.coordLabel}>
        <ThemedText style={styles.coordText}>
          {rawPosition.x.toFixed(2)}, {rawPosition.y.toFixed(2)}
        </ThemedText>
      </View>
    </View>
  );
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<MapScreenRouteProp>();
  const zoomableViewRef = useRef<ReactNativeZoomableView>(null);
  const mapContainerRef = useRef<View>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const [calibrationMode, setCalibrationMode] = useState(false);
  const [calibrationPanelCollapsed, setCalibrationPanelCollapsed] = useState(true);
  const [showStrategy, setShowStrategy] = useState(true);
  const [showDomination, setShowDomination] = useState(false);
  const [showHardpoint, setShowHardpoint] = useState(false);
  const [showSearchAndDestroy, setShowSearchAndDestroy] = useState(false);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [markerPositions, setMarkerPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [objectivePositions, setObjectivePositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [labelPositions, setLabelPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const [isLoadingPositions, setIsLoadingPositions] = useState(true);
  const [coachMarkPoiId, setCoachMarkPoiId] = useState<string | null>(null);
  const coachMarkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [overviewTooltipVisible, setOverviewTooltipVisible] = useState(false);
  const overviewTooltipOpacity = useRef(new Animated.Value(0)).current;
  const overviewTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldShowOverviewAfterCoachMark = useRef(false);

  const { mapId } = route.params;
  const CALIBRATION_VERSION = 3;
  const CALIBRATION_KEY = `calibration_v${CALIBRATION_VERSION}_${mapId}`;
  const OBJECTIVES_CALIBRATION_KEY = `objectives_calibration_v3_${mapId}`;
  const LABEL_CALIBRATION_VERSION: Record<string, number> = { fate: 3, odysseus: 2, cortex: 2 };
  const LABEL_CALIBRATION_KEY = `labels_calibration_v${LABEL_CALIBRATION_VERSION[mapId] ?? 1}_${mapId}`;

  const mapDataExists = !!mapDataRegistry[mapId];
  const mapData = mapDataRegistry[mapId] || mapDataRegistry.blackheart;
  const mapImage = getBaseMapImage(mapId);
  const pois = mapData.pointsOfInterest;
  const borderOffset = mapData.borderOffset;
  const aspectRatio = getMapAspectRatio(mapId);

  useEffect(() => {
    if (!mapDataExists) {
      if (Platform.OS === 'web') {
        alert("Map Not Found: The requested map data was not found. Returning to Home screen.");
        navigation.navigate("Home");
      } else {
        Alert.alert(
          "Map Not Found",
          "The requested map data was not found. Returning to Home screen.",
          [{ text: "OK", onPress: () => navigation.navigate("Home") }]
        );
      }
    }
  }, [mapDataExists, navigation]);

  useEffect(() => {
    console.log(
      "[MapScreen] mapId:",
      mapId,
      "mapImage:",
      mapImage,
      "aspectRatio:",
      aspectRatio,
    );
  }, [mapId, mapImage, aspectRatio]);

  const dismissOverviewTooltip = useCallback(() => {
    if (overviewTooltipTimerRef.current) {
      clearTimeout(overviewTooltipTimerRef.current);
      overviewTooltipTimerRef.current = null;
    }
    Animated.timing(overviewTooltipOpacity, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setOverviewTooltipVisible(false);
      AsyncStorage.setItem("overview_tooltip_shown", "true");
    });
  }, [overviewTooltipOpacity]);

  const showOverviewTooltip = useCallback(() => {
    overviewTooltipTimerRef.current = setTimeout(() => {
      setOverviewTooltipVisible(true);
      Animated.timing(overviewTooltipOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        overviewTooltipTimerRef.current = setTimeout(() => {
          dismissOverviewTooltip();
        }, 4000);
      });
    }, 400);
  }, [overviewTooltipOpacity, dismissOverviewTooltip]);

  const dismissCoachMark = useCallback(() => {
    if (coachMarkTimerRef.current) {
      clearTimeout(coachMarkTimerRef.current);
      coachMarkTimerRef.current = null;
    }
    setCoachMarkPoiId(null);
    AsyncStorage.setItem("hasSeenPOIHint", "true");
    if (shouldShowOverviewAfterCoachMark.current) {
      shouldShowOverviewAfterCoachMark.current = false;
      showOverviewTooltip();
    }
  }, [showOverviewTooltip]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      AsyncStorage.getItem("hasSeenPOIHint"),
      AsyncStorage.getItem("overview_tooltip_shown"),
    ]).then(([seenPOI, seenOverview]) => {
      if (cancelled) return;
      const hasOverview = !!mapData.operationalOverview;
      if (!seenPOI && pois.length > 0) {
        setCoachMarkPoiId(pois[0].id);
        if (!seenOverview && hasOverview) {
          shouldShowOverviewAfterCoachMark.current = true;
        }
        coachMarkTimerRef.current = setTimeout(() => {
          if (!cancelled) dismissCoachMark();
        }, 5000);
      } else if (!seenOverview && hasOverview) {
        showOverviewTooltip();
      }
    });
    return () => {
      cancelled = true;
      if (coachMarkTimerRef.current) {
        clearTimeout(coachMarkTimerRef.current);
        coachMarkTimerRef.current = null;
      }
      if (overviewTooltipTimerRef.current) {
        clearTimeout(overviewTooltipTimerRef.current);
        overviewTooltipTimerRef.current = null;
      }
    };
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: !calibrationMode,
    });
  }, [navigation, calibrationMode]);

  const getAdjustedPosition = useCallback(
    (x: number, y: number) => {
      if (borderOffset) {
        const adjustedX =
          borderOffset.left +
          (x / 100) * (100 - borderOffset.left - borderOffset.right);
        const adjustedY =
          borderOffset.top +
          (y / 100) * (100 - borderOffset.top - borderOffset.bottom);
        return { x: adjustedX, y: adjustedY };
      }
      return { x, y };
    },
    [borderOffset],
  );

  const initializeObjectivePositions = useCallback(() => {
    // Store RAW coordinates (no transform needed - transform applied during rendering)
    const initialObjPositions: Record<string, { x: number; y: number }> = {};
    if (mapData.objectives?.domination) {
      mapData.objectives.domination.forEach((obj) => {
        initialObjPositions[`dom_${obj.zone}`] = {
          x: obj.coordinates.x,
          y: obj.coordinates.y,
        };
      });
    }
    if (mapData.objectives?.hardpoint) {
      mapData.objectives.hardpoint.forEach((obj) => {
        // Use obj.number to match the key used in rendering
        initialObjPositions[`hp_${obj.number}`] = {
          x: obj.coordinates.x,
          y: obj.coordinates.y,
        };
      });
    }
    if (mapData.objectives?.searchAndDestroy) {
      mapData.objectives.searchAndDestroy.forEach((obj) => {
        const site = obj.site || obj.zone || "";
        initialObjPositions[`snd_${site}`] = {
          x: obj.coordinates.x,
          y: obj.coordinates.y,
        };
      });
    }
    return initialObjPositions;
  }, [mapData.objectives]);

  useEffect(() => {
    const loadSavedPositions = async () => {
      try {
        await AsyncStorage.removeItem(`calibration_${mapId}`);
        await AsyncStorage.removeItem(`calibration_v1_${mapId}`);

        const saved = await AsyncStorage.getItem(CALIBRATION_KEY);
        if (saved) {
          const parsedPositions = JSON.parse(saved);

          const values = Object.values(parsedPositions) as Array<{
            x: number;
            y: number;
          }>;
          const allAt50 =
            values.length > 0 &&
            values.every(
              (pos) => Math.round(pos.x) === 50 && Math.round(pos.y) === 50,
            );

          if (allAt50) {
            console.log(
              "CORRUPT DATA DETECTED - all positions at 50,50. Clearing for",
              mapId,
            );
            await AsyncStorage.removeItem(CALIBRATION_KEY);
            // Initialize with RAW coordinates from JSON (no transform needed)
            const initialPositions: Record<string, { x: number; y: number }> =
              {};
            pois.forEach((poi) => {
              initialPositions[poi.id] = {
                x: poi.coordinates.x,
                y: poi.coordinates.y,
              };
            });
            console.log(
              "Initialized from JSON (raw):",
              JSON.stringify(initialPositions),
            );
            setMarkerPositions(initialPositions);
          } else {
            // AsyncStorage now stores RAW coordinates
            console.log(
              "Loaded saved calibration (raw) for",
              mapId,
              ":",
              JSON.stringify(parsedPositions),
            );
            setMarkerPositions(parsedPositions);
          }
        } else {
          // Initialize with RAW coordinates from JSON (no transform needed)
          const initialPositions: Record<string, { x: number; y: number }> = {};
          pois.forEach((poi) => {
            initialPositions[poi.id] = {
              x: poi.coordinates.x,
              y: poi.coordinates.y,
            };
          });
          console.log(
            "Fresh init from JSON (raw) for",
            mapId,
            ":",
            JSON.stringify(initialPositions),
          );
          setMarkerPositions(initialPositions);
        }

        const savedObjectives = await AsyncStorage.getItem(
          OBJECTIVES_CALIBRATION_KEY,
        );
        if (savedObjectives) {
          setObjectivePositions(JSON.parse(savedObjectives));
        } else {
          setObjectivePositions(initializeObjectivePositions());
        }

        const savedLabels = await AsyncStorage.getItem(LABEL_CALIBRATION_KEY);
        const parsedLabels = savedLabels ? JSON.parse(savedLabels) : null;
        if (parsedLabels && Object.keys(parsedLabels).length > 0) {
          setLabelPositions(parsedLabels);
        } else {
          const initialLabelPositions: Record<
            string,
            { x: number; y: number }
          > = {};
          pois.forEach((poi) => {
            if ((poi as any).labelPosition) {
              initialLabelPositions[poi.id] = (poi as any).labelPosition;
            }
          });
          setLabelPositions(initialLabelPositions);
        }
      } catch (error) {
        console.error("Error loading positions:", error);
        // Initialize with RAW coordinates from JSON (no transform needed)
        const initialPositions: Record<string, { x: number; y: number }> = {};
        pois.forEach((poi) => {
          initialPositions[poi.id] = {
            x: poi.coordinates.x,
            y: poi.coordinates.y,
          };
        });
        setMarkerPositions(initialPositions);
        setObjectivePositions(initializeObjectivePositions());
        const initialLabelPositions: Record<string, { x: number; y: number }> =
          {};
        pois.forEach((poi) => {
          if ((poi as any).labelPosition) {
            initialLabelPositions[poi.id] = (poi as any).labelPosition;
          }
        });
        setLabelPositions(initialLabelPositions);
      }
      setIsLoadingPositions(false);
    };
    loadSavedPositions();
  }, [
    CALIBRATION_KEY,
    OBJECTIVES_CALIBRATION_KEY,
    LABEL_CALIBRATION_KEY,
    mapId,
    pois,
    initializeObjectivePositions,
  ]);

  const getPercentPosition = useCallback(
    (x: number, y: number) => {
      // ALWAYS apply borderOffset transform (raw → displayed) for consistent rendering
      // in both calibration mode and user view
      if (borderOffset) {
        const adjustedX =
          borderOffset.left +
          (x / 100) * (100 - borderOffset.left - borderOffset.right);
        const adjustedY =
          borderOffset.top +
          (y / 100) * (100 - borderOffset.top - borderOffset.bottom);
        return { x: adjustedX, y: adjustedY };
      }
      return { x, y };
    },
    [borderOffset],
  );

  const transformCoordinate = useCallback(
    (x: number, y: number, imageWidth: number, imageHeight: number) => {
      const pos = getPercentPosition(x, y);
      return { x: (pos.x / 100) * imageWidth, y: (pos.y / 100) * imageHeight };
    },
    [getPercentPosition],
  );

  const renderedImageSize = useMemo(() => {
    if (!containerSize.width || !containerSize.height) {
      return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
    }

    const containerAspect = containerSize.width / containerSize.height;

    let width: number;
    let height: number;

    if (containerAspect > aspectRatio) {
      height = containerSize.height;
      width = height * aspectRatio;
    } else {
      width = containerSize.width;
      height = width / aspectRatio;
    }

    const offsetX = (containerSize.width - width) / 2;
    const offsetY = (containerSize.height - height) / 2;

    console.log("[MapScreen] renderedImageSize for", mapId, ":", {
      width,
      height,
      offsetX,
      offsetY,
    });
    return { width, height, offsetX, offsetY };
  }, [containerSize, aspectRatio, mapId]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  }, []);

  const getPOIByID = useCallback(
    (id: string) => {
      return pois.find((poi) => poi.id === id);
    },
    [pois],
  );

  const strategyElements = useMemo(() => {
    if (mapId !== "blackheart") return null;

    const grinderPit = getPOIByID("grinder_pit");
    const subBay = getPOIByID("sub_bay");
    const repairBay = getPOIByID("repair_bay");
    const drillSectorA = getPOIByID("drill_sector_a");

    if (!grinderPit && !subBay && !repairBay && !drillSectorA) return null;

    return { grinderPit, subBay, repairBay, drillSectorA };
  }, [mapId, getPOIByID]);

  const handleMarkerPress = useCallback(
    (poi: PointOfInterest) => {
      if (calibrationMode) return;
      dismissCoachMark();
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      navigation.navigate("POIDetail", { poi, mapId });
    },
    [navigation, mapId, calibrationMode, dismissCoachMark],
  );

  const handleBack = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.goBack();
  }, [navigation]);

  const handleZoomIn = useCallback(() => {
    const ZOOM_STEP = 0.25;
    const maxZoom = calibrationMode ? 4 : 3;
    const newZoom = Math.min(zoomLevel + ZOOM_STEP, maxZoom);
    zoomableViewRef.current?.zoomTo(newZoom);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [zoomLevel, calibrationMode]);

  const handleZoomOut = useCallback(() => {
    const ZOOM_STEP = 0.25;
    const minZoom = 1;
    const newZoom = Math.max(zoomLevel - ZOOM_STEP, minZoom);
    zoomableViewRef.current?.zoomTo(newZoom);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [zoomLevel, calibrationMode]);

  const handleResetZoom = useCallback(() => {
    zoomableViewRef.current?.zoomTo(1);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const autoSyncToServer = useCallback(
    async (
      elementType: "poi" | "domination" | "hardpoint" | "snd" | "label",
      elementId: string,
      coordinates: { x: number; y: number },
    ) => {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(
          new URL("/api/calibration/save", apiUrl).toString(),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mapName: mapId,
              elementType,
              elementId,
              coordinates,
            }),
          },
        );
        const result = await response.json();
        if (result.success) {
          console.log(
            `[Auto-Sync] Saved ${elementType} "${elementId}" to JSON: (${coordinates.x}, ${coordinates.y})`,
          );
        } else {
          console.warn(`[Auto-Sync] Failed: ${result.message}`);
        }
      } catch (error) {
        console.warn("[Auto-Sync] Error:", error);
      }
    },
    [mapId],
  );

  const handlePositionChange = useCallback(
    async (id: string, displayX: number, displayY: number) => {
      const rawPosition = displayToRawCoordinates(
        displayX,
        displayY,
        borderOffset,
      );

      setMarkerPositions((prev) => {
        const newPositions = { ...prev, [id]: rawPosition };
        AsyncStorage.setItem(
          CALIBRATION_KEY,
          JSON.stringify(newPositions),
        ).catch((err) => console.error("Error saving positions:", err));
        return newPositions;
      });

      autoSyncToServer("poi", id, rawPosition);
    },
    [CALIBRATION_KEY, borderOffset, autoSyncToServer],
  );

  const handleObjectivePositionChange = useCallback(
    async (id: string, displayX: number, displayY: number) => {
      const rawPosition = displayToRawCoordinates(
        displayX,
        displayY,
        borderOffset,
      );

      setObjectivePositions((prev) => {
        const newPositions = { ...prev, [id]: rawPosition };
        AsyncStorage.setItem(
          OBJECTIVES_CALIBRATION_KEY,
          JSON.stringify(newPositions),
        ).catch((err) =>
          console.error("Error saving objective positions:", err),
        );
        return newPositions;
      });

      const elementType = id.startsWith("dom_")
        ? "domination"
        : id.startsWith("hp_")
          ? "hardpoint"
          : "snd";
      autoSyncToServer(elementType, id, rawPosition);
    },
    [OBJECTIVES_CALIBRATION_KEY, borderOffset, autoSyncToServer],
  );

  const handleLabelPositionChange = useCallback(
    async (id: string, x: number, y: number) => {
      setLabelPositions((prev) => {
        const newPositions = { ...prev, [id]: { x, y } };
        AsyncStorage.setItem(
          LABEL_CALIBRATION_KEY,
          JSON.stringify(newPositions),
        ).catch((err) => console.error("Error saving label positions:", err));
        return newPositions;
      });

      autoSyncToServer("label", id, { x, y });
    },
    [LABEL_CALIBRATION_KEY, autoSyncToServer],
  );

  const toggleCalibrationMode = useCallback(async () => {
    if (!__DEV__) return;
    if (!calibrationMode) {
      try {
        const saved = await AsyncStorage.getItem(CALIBRATION_KEY);
        if (saved) {
          // AsyncStorage stores RAW coordinates
          setMarkerPositions(JSON.parse(saved));
        } else {
          // Initialize with RAW coordinates from JSON (no transform needed)
          const initialPositions: Record<string, { x: number; y: number }> = {};
          pois.forEach((poi) => {
            initialPositions[poi.id] = {
              x: poi.coordinates.x,
              y: poi.coordinates.y,
            };
          });
          setMarkerPositions(initialPositions);
        }

        const savedObjectives = await AsyncStorage.getItem(
          OBJECTIVES_CALIBRATION_KEY,
        );
        if (savedObjectives) {
          setObjectivePositions(JSON.parse(savedObjectives));
        } else {
          setObjectivePositions(initializeObjectivePositions());
        }

        const savedLabels = await AsyncStorage.getItem(LABEL_CALIBRATION_KEY);
        const parsedLabels = savedLabels ? JSON.parse(savedLabels) : null;
        if (parsedLabels && Object.keys(parsedLabels).length > 0) {
          setLabelPositions(parsedLabels);
        } else {
          const initialLabelPositions: Record<
            string,
            { x: number; y: number }
          > = {};
          pois.forEach((poi) => {
            if ((poi as any).labelPosition) {
              initialLabelPositions[poi.id] = (poi as any).labelPosition;
            }
          });
          setLabelPositions(initialLabelPositions);
        }
      } catch (error) {
        // Initialize with RAW coordinates from JSON (no transform needed)
        const initialPositions: Record<string, { x: number; y: number }> = {};
        pois.forEach((poi) => {
          initialPositions[poi.id] = {
            x: poi.coordinates.x,
            y: poi.coordinates.y,
          };
        });
        setMarkerPositions(initialPositions);
        setObjectivePositions(initializeObjectivePositions());
        const initialLabelPositions: Record<string, { x: number; y: number }> =
          {};
        pois.forEach((poi) => {
          if ((poi as any).labelPosition) {
            initialLabelPositions[poi.id] = (poi as any).labelPosition;
          }
        });
        setLabelPositions(initialLabelPositions);
      }
      zoomableViewRef.current?.zoomTo(1);
      setZoomLevel(1);
    }
    setCalibrationMode(!calibrationMode);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [
    calibrationMode,
    pois,
    CALIBRATION_KEY,
    OBJECTIVES_CALIBRATION_KEY,
    LABEL_CALIBRATION_KEY,
    initializeObjectivePositions,
  ]);

  const exportCoordinates = useCallback(async () => {
    const coordsOutput: Record<string, { x: number; y: number }> = {};
    pois.forEach((poi) => {
      const pos = markerPositions[poi.id] || poi.coordinates;
      coordsOutput[poi.id] = {
        x: Math.round(pos.x),
        y: Math.round(pos.y),
      };
    });

    const objectiveCoordsOutput: Record<string, { x: number; y: number }> = {};
    Object.entries(objectivePositions).forEach(([id, pos]) => {
      objectiveCoordsOutput[id] = {
        x: Math.round(pos.x),
        y: Math.round(pos.y),
      };
    });

    const labelCoordsOutput: Record<string, { x: number; y: number }> = {};
    Object.entries(labelPositions).forEach(([id, pos]) => {
      labelCoordsOutput[id] = {
        x: Math.round(pos.x),
        y: Math.round(pos.y),
      };
    });

    const allCoords = {
      pois: coordsOutput,
      objectives: objectiveCoordsOutput,
      labels: labelCoordsOutput,
    };
    const jsonOutput = JSON.stringify(allCoords, null, 2);
    console.log("=== CALIBRATED COORDINATES (RAW PERCENTAGES) ===");
    console.log(jsonOutput);

    const fullPoiStructure = pois.map((poi) => ({
      id: poi.id,
      type: poi.type,
      coordinates: coordsOutput[poi.id] || { x: 0, y: 0 },
    }));
    console.log("=== FULL POI STRUCTURE ===");
    console.log(JSON.stringify(fullPoiStructure, null, 2));

    console.log("=== OBJECTIVE COORDINATES ===");
    console.log(JSON.stringify(objectiveCoordsOutput, null, 2));

    let copySuccess = false;

    if (Platform.OS === "web") {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = jsonOutput;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (result) {
          copySuccess = true;
          console.log("Clipboard copy successful via execCommand");
        }
      } catch (webErr) {
        console.log("Web clipboard fallback failed:", webErr);
      }

      if (
        !copySuccess &&
        typeof navigator !== "undefined" &&
        navigator.clipboard
      ) {
        try {
          await navigator.clipboard.writeText(jsonOutput);
          copySuccess = true;
          console.log("Clipboard copy successful via navigator.clipboard");
        } catch (navErr) {
          console.log("Navigator clipboard API failed:", navErr);
        }
      }
    }

    if (!copySuccess) {
      try {
        await Clipboard.setStringAsync(jsonOutput);
        copySuccess = true;
        console.log("Clipboard copy successful via expo-clipboard");
      } catch (expoErr) {
        console.log("Expo clipboard failed:", expoErr);
      }
    }

    if (copySuccess) {
      if (Platform.OS === "web") {
        alert("Coordinates copied to clipboard!");
      } else {
        Alert.alert(
          "Coordinates Copied",
          "POI and Objective coordinates copied to clipboard and logged to console.",
          [{ text: "OK" }],
        );
      }
    } else {
      if (Platform.OS === "web") {
        alert("Coordinates exported to console. Press F12 to view.");
      } else {
        Alert.alert(
          "Coordinates Exported",
          "Check the console/terminal for the calibrated coordinates.",
          [{ text: "OK" }],
        );
      }
    }
  }, [markerPositions, objectivePositions, labelPositions, pois]);

  const resetToJsonPositions = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(CALIBRATION_KEY);
      await AsyncStorage.removeItem(OBJECTIVES_CALIBRATION_KEY);
      await AsyncStorage.removeItem(LABEL_CALIBRATION_KEY);
      // Reset to RAW coordinates from JSON (no transform needed)
      const initialPositions: Record<string, { x: number; y: number }> = {};
      pois.forEach((poi) => {
        initialPositions[poi.id] = {
          x: poi.coordinates.x,
          y: poi.coordinates.y,
        };
      });
      setMarkerPositions(initialPositions);
      setObjectivePositions(initializeObjectivePositions());
      const initialLabelPositions: Record<string, { x: number; y: number }> = {};
      pois.forEach((poi) => {
        if ((poi as any).labelPosition) {
          initialLabelPositions[poi.id] = (poi as any).labelPosition;
        }
      });
      setLabelPositions(initialLabelPositions);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
          "Reset Complete",
          "All markers and labels reset to defaults.",
        );
      } else {
        alert("All markers and labels reset to defaults.");
      }
    } catch (error) {
      console.error("Error resetting positions:", error);
    }
  }, [
    CALIBRATION_KEY,
    OBJECTIVES_CALIBRATION_KEY,
    LABEL_CALIBRATION_KEY,
    pois,
    initializeObjectivePositions,
  ]);

  const getMarkerPosition = useCallback(
    (poi: PointOfInterest) => {
      // markerPositions stores RAW coordinates (after calibration auto-transform)
      // Always apply forward transform to get display coordinates
      const hasCalibrationOverride = !!markerPositions[poi.id];
      const rawPos = markerPositions[poi.id] || poi.coordinates;
      const displayPos = rawToDisplayCoordinates(
        rawPos.x,
        rawPos.y,
        borderOffset,
      );

      return displayPos;
    },
    [markerPositions, borderOffset],
  );

  const getLayoutPosition = useCallback(
    (poi: PointOfInterest) => {
      return getAdjustedPosition(poi.coordinates.x, poi.coordinates.y);
    },
    [getAdjustedPosition],
  );

  const getRawPosition = useCallback(
    (poi: PointOfInterest) => {
      return markerPositions[poi.id] || poi.coordinates;
    },
    [markerPositions],
  );

  return (
    <View style={[styles.container, { backgroundColor: "#0F172A" }]}>
      {isLoadingPositions && (
        <View style={styles.loadingOverlay} accessibilityRole="progressbar" accessibilityLabel="Loading map data">
          <ActivityIndicator size="large" color="#FFD700" />
          <ThemedText style={styles.loadingText}>Loading positions...</ThemedText>
        </View>
      )}
      {calibrationMode ? (
        <View
          style={[
            styles.calibrationHeader,
            { paddingTop: insets.top + Spacing.sm },
          ]}
        >
          <View style={styles.calibrationHeaderRow}>
            <View style={styles.calibrationBadge}>
              <View style={styles.calibrationBlueDot} />
              <ThemedText style={styles.calibrationBadgeText}>
                CALIBRATION MODE
              </ThemedText>
            </View>
            <View style={styles.calibrationZoomBadge}>
              <ThemedText style={styles.zoomText}>
                {Math.round(zoomLevel * 100)}%
              </ThemedText>
            </View>
            <Pressable
              style={[styles.calibrationToggle, styles.calibrationToggleActive]}
              onPress={toggleCalibrationMode}
            >
              <Feather name="x" size={16} color="#FFF" />
              <ThemedText style={styles.calibrationToggleText}>
                EXIT
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.calibrationHeaderRow}>
            <Pressable style={styles.resetButton} onPress={resetToJsonPositions}>
              <Feather name="refresh-cw" size={16} color="#FFF" />
              <ThemedText style={styles.exportButtonText}>RESET</ThemedText>
            </Pressable>
            <Pressable style={styles.exportButton} onPress={exportCoordinates}>
              <Feather name="copy" size={16} color="#FFF" />
              <ThemedText style={styles.exportButtonText}>COPY</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.controlsFlowContainer,
          isLandscape
            ? {
                position: "absolute",
                right: insets.right + 16,
                top: insets.top + 16,
                alignItems: "flex-end",
              }
            : calibrationMode
              ? { paddingTop: Spacing.sm }
              : { paddingTop: insets.top + 110 },
          showOverviewModal && { opacity: 0, pointerEvents: 'none' },
        ]}
      >
        <View
          style={[
            styles.viewModeToggleFlow,
            isLandscape && { flexDirection: "column" },
          ]}
        >
          <LayerToggleButton
            label="Strategy"
            isActive={showStrategy}
            onToggle={() => setShowStrategy(!showStrategy)}
            activeColor="#4A90D9"
          />
          {mapData.objectives?.domination?.length ? (
            <LayerToggleButton
              label="Domination"
              isActive={showDomination}
              onToggle={() => setShowDomination(!showDomination)}
              activeColor="#E74C3C"
            />
          ) : null}
          {mapData.objectives?.hardpoint?.length ? (
            <LayerToggleButton
              label="Hardpoint"
              isActive={showHardpoint}
              onToggle={() => setShowHardpoint(!showHardpoint)}
              activeColor="#F1C40F"
            />
          ) : null}
          {mapData.hasSearchAndDestroy &&
          mapData.objectives?.searchAndDestroy?.length ? (
            <LayerToggleButton
              label="S&D"
              isActive={showSearchAndDestroy}
              onToggle={() => setShowSearchAndDestroy(!showSearchAndDestroy)}
              activeColor="#FF6B35"
            />
          ) : null}
        </View>
        {!calibrationMode && mapData.operationalOverview ? (
          <View style={isLandscape ? styles.overviewPillLandscapeWrapper : styles.overviewPillPortraitWrapper}>
            <Pressable
              style={({ pressed }) => [
                styles.overviewIconButton,
                pressed && styles.overviewIconButtonActive,
              ]}
              onPress={() => setShowOverviewModal(true)}
              accessibilityLabel="Map overview"
              accessibilityRole="button"
            >
              {({ pressed }) => (
                <View style={styles.overviewPillRow}>
                  <Svg width={22} height={22} viewBox="0 0 44 44" fill="none">
                    <Circle cx={22} cy={22} r={14} stroke={pressed ? "#CFFF80" : "#A3FF00"} strokeWidth={2} strokeOpacity={pressed ? 1 : 0.8} />
                    <Path d="M22 4 L22 14" stroke={pressed ? "#CFFF80" : "#A3FF00"} strokeWidth={2.5} strokeLinecap="round" />
                    <Path d="M22 30 L22 40" stroke={pressed ? "#CFFF80" : "#A3FF00"} strokeWidth={2.5} strokeLinecap="round" />
                    <Path d="M4 22 L14 22" stroke={pressed ? "#CFFF80" : "#A3FF00"} strokeWidth={2.5} strokeLinecap="round" />
                    <Path d="M30 22 L40 22" stroke={pressed ? "#CFFF80" : "#A3FF00"} strokeWidth={2.5} strokeLinecap="round" />
                    <Circle cx={22} cy={22} r={2} fill={pressed ? "#CFFF80" : "#A3FF00"} />
                  </Svg>
                  <Text style={styles.overviewPillText}>OVERVIEW</Text>
                </View>
              )}
            </Pressable>
            {overviewTooltipVisible ? (
              isLandscape ? (
                <Animated.View style={[styles.overviewTooltipLandscape, { opacity: overviewTooltipOpacity }]}>
                  <View style={styles.overviewTooltipBody}>
                    <Text style={styles.overviewTooltipText}>Tap for map briefing</Text>
                  </View>
                  <View style={styles.overviewCaretRight} />
                </Animated.View>
              ) : (
                <Animated.View style={[styles.overviewTooltipPortrait, { opacity: overviewTooltipOpacity }]}>
                  <View style={styles.overviewCaretUp} />
                  <View style={styles.overviewTooltipBody}>
                    <Text style={styles.overviewTooltipText}>Tap for map briefing</Text>
                  </View>
                </Animated.View>
              )
            ) : null}
          </View>
        ) : null}
      </View>

      {overviewTooltipVisible ? (
        <Pressable
          style={[StyleSheet.absoluteFillObject, { zIndex: 45 }]}
          onPress={dismissOverviewTooltip}
        />
      ) : null}

      <View
        style={[
          styles.zoomableContainer,
          calibrationMode ? { paddingTop: insets.top + 60 } : {},
        ]}
        onLayout={handleLayout}
      >
        {renderedImageSize.width > 0 && renderedImageSize.height > 0 ? (
          calibrationMode ? (
            <ReactNativeZoomableView
              ref={zoomableViewRef}
              maxZoom={4}
              minZoom={1}
              initialZoom={1}
              bindToBorders={true}
              onZoomAfter={(event, gestureState, zoomableViewEventObject) => {
                setZoomLevel(zoomableViewEventObject.zoomLevel);
              }}
              style={styles.zoomableView}
              contentWidth={containerSize.width}
              contentHeight={containerSize.height}
              panEnabled={false}
              movementSensibility={0}
            >
              <View
                ref={mapContainerRef}
                collapsable={false}
                style={{
                  width: containerSize.width,
                  height: containerSize.height,
                  overflow: 'visible',
                }}
              >
                <View
                  style={[
                    styles.mapWrapper,
                    {
                      position: "absolute",
                      left: renderedImageSize.offsetX,
                      top: renderedImageSize.offsetY,
                      width: renderedImageSize.width,
                      height: renderedImageSize.height,
                      overflow: 'visible',
                    },
                  ]}
                >
                  <Image
                    source={mapImage}
                    style={{
                      width: renderedImageSize.width,
                      height: renderedImageSize.height,
                    }}
                    contentFit="fill"
                    onLoad={() =>
                      console.log(
                        "[MapScreen] Calibration Image loaded for",
                        mapId,
                      )
                    }
                    onError={(e) =>
                      console.error(
                        "[MapScreen] Calibration Image error for",
                        mapId,
                        ":",
                        e,
                      )
                    }
                  />

                  {showStrategy ? (
                    <POILabelsContainer
                      pois={pois}
                      getMarkerPosition={getMarkerPosition}
                      getLayoutPosition={getLayoutPosition}
                      getRawPosition={getRawPosition}
                      mapDimensions={renderedImageSize}
                      onMarkerPress={handleMarkerPress}
                      showCoordinates={true}
                      calibrationMode={true}
                      onPositionChange={handlePositionChange}
                      labelPositions={labelPositions}
                      onLabelPositionChange={handleLabelPositionChange}
                      borderOffset={borderOffset}
                    />
                  ) : null}

                  {showDomination &&
                    mapData.objectives?.domination?.map((obj) => {
                      const posKey = `dom_${obj.zone}`;
                      const rawPos = objectivePositions[posKey] || {
                        x: obj.coordinates.x,
                        y: obj.coordinates.y,
                      };
                      const position = rawToDisplayCoordinates(
                        rawPos.x,
                        rawPos.y,
                        borderOffset,
                      );
                      return (
                        <DraggableObjectiveMarker
                          key={posKey}
                          id={posKey}
                          type="domination"
                          zone={obj.zone || ""}
                          position={position}
                          rawPosition={rawPos}
                          onPositionChange={handleObjectivePositionChange}
                          imageBounds={renderedImageSize}
                        />
                      );
                    })}

                  {showHardpoint &&
                    mapData.objectives?.hardpoint?.map((obj) => {
                      const posKey = `hp_${obj.number}`;
                      const rawPos = objectivePositions[posKey] || {
                        x: obj.coordinates.x,
                        y: obj.coordinates.y,
                      };
                      const position = rawToDisplayCoordinates(
                        rawPos.x,
                        rawPos.y,
                        borderOffset,
                      );
                      return (
                        <DraggableObjectiveMarker
                          key={posKey}
                          id={posKey}
                          type="hardpoint"
                          zone={obj.name || ""}
                          order={obj.number}
                          position={position}
                          rawPosition={rawPos}
                          onPositionChange={handleObjectivePositionChange}
                          imageBounds={renderedImageSize}
                        />
                      );
                    })}

                  {showSearchAndDestroy &&
                    mapData.objectives?.searchAndDestroy?.map((obj) => {
                      const posKey = `snd_${obj.site || obj.zone}`;
                      const rawPos = objectivePositions[posKey] || {
                        x: obj.coordinates.x,
                        y: obj.coordinates.y,
                      };
                      const position = rawToDisplayCoordinates(
                        rawPos.x,
                        rawPos.y,
                        borderOffset,
                      );
                      return (
                        <DraggableObjectiveMarker
                          key={posKey}
                          id={posKey}
                          type="searchAndDestroy"
                          zone={obj.site || obj.zone || ""}
                          position={position}
                          rawPosition={rawPos}
                          onPositionChange={handleObjectivePositionChange}
                          imageBounds={renderedImageSize}
                        />
                      );
                    })}
                </View>
              </View>
            </ReactNativeZoomableView>
          ) : (
            <ReactNativeZoomableView
              ref={zoomableViewRef}
              maxZoom={5}
              minZoom={0.5}
              initialZoom={1}
              bindToBorders={true}
              onZoomAfter={(event, gestureState, zoomableViewEventObject) => {
                setZoomLevel(zoomableViewEventObject.zoomLevel);
              }}
              style={styles.zoomableView}
              contentWidth={containerSize.width}
              contentHeight={containerSize.height}
            >
              <View
                ref={mapContainerRef}
                collapsable={false}
                style={{
                  width: containerSize.width,
                  height: containerSize.height,
                }}
              >
                <View
                  style={[
                    styles.mapWrapper,
                    {
                      position: "absolute",
                      left: renderedImageSize.offsetX,
                      top: renderedImageSize.offsetY,
                      width: renderedImageSize.width,
                      height: renderedImageSize.height,
                    },
                  ]}
                >
                  <Image
                    source={mapImage}
                    style={{
                      width: renderedImageSize.width,
                      height: renderedImageSize.height,
                    }}
                    contentFit="fill"
                    onLoad={() =>
                      console.log("[MapScreen] Image loaded for", mapId)
                    }
                    onError={(e) =>
                      console.error(
                        "[MapScreen] Image error for",
                        mapId,
                        ":",
                        e,
                      )
                    }
                  />

                  {strategyElements ? (
                    <Svg
                      width={renderedImageSize.width}
                      height={renderedImageSize.height}
                      style={styles.svgLayer}
                    >
                      {strategyElements.grinderPit &&
                        (() => {
                          const pos = transformCoordinate(
                            strategyElements.grinderPit.coordinates.x,
                            strategyElements.grinderPit.coordinates.y,
                            renderedImageSize.width,
                            renderedImageSize.height,
                          );
                          return (
                            <Rect
                              x={pos.x - 20}
                              y={pos.y - 20}
                              width={40}
                              height={40}
                              stroke={POIColors.hazard}
                              strokeWidth={2}
                              strokeDasharray="6,3"
                              fill="transparent"
                            />
                          );
                        })()}

                      {strategyElements.subBay &&
                        strategyElements.repairBay &&
                        (() => {
                          const pos1 = transformCoordinate(
                            strategyElements.subBay.coordinates.x,
                            strategyElements.subBay.coordinates.y,
                            renderedImageSize.width,
                            renderedImageSize.height,
                          );
                          const pos2 = transformCoordinate(
                            strategyElements.repairBay.coordinates.x,
                            strategyElements.repairBay.coordinates.y,
                            renderedImageSize.width,
                            renderedImageSize.height,
                          );
                          return (
                            <Line
                              x1={pos1.x}
                              y1={pos1.y}
                              x2={pos2.x}
                              y2={pos2.y}
                              stroke={POIColors.flank}
                              strokeWidth={2}
                              strokeLinecap="round"
                            />
                          );
                        })()}

                      {strategyElements.drillSectorA &&
                        (() => {
                          const pos = transformCoordinate(
                            strategyElements.drillSectorA.coordinates.x,
                            strategyElements.drillSectorA.coordinates.y,
                            renderedImageSize.width,
                            renderedImageSize.height,
                          );
                          return (
                            <Circle
                              cx={pos.x}
                              cy={pos.y}
                              r={30}
                              stroke={POIColors.objective}
                              strokeWidth={2}
                              fill="rgba(59, 130, 246, 0.2)"
                            />
                          );
                        })()}
                    </Svg>
                  ) : null}

                  {showStrategy ? (
                    <POILabelsContainer
                      pois={pois}
                      getMarkerPosition={getMarkerPosition}
                      getRawPosition={getRawPosition}
                      mapDimensions={renderedImageSize}
                      onMarkerPress={handleMarkerPress}
                      labelPositions={labelPositions}
                      borderOffset={borderOffset}
                      coachMarkPoiId={coachMarkPoiId}
                      onCoachMarkDismiss={dismissCoachMark}
                    />
                  ) : null}

                  {showDomination &&
                    mapData.objectives?.domination?.map((obj) => {
                      const posKey = `dom_${obj.zone}`;
                      const rawPos = objectivePositions[posKey] || obj.coordinates;
                      return (
                        <ObjectiveMarker
                          key={obj.id}
                          type="domination"
                          zone={obj.zone || ""}
                          coordinates={rawPos}
                          mapDimensions={renderedImageSize}
                          getAdjustedPosition={getAdjustedPosition}
                        />
                      );
                    })}

                  {showHardpoint &&
                    mapData.objectives?.hardpoint?.map((obj) => {
                      const posKey = `hp_${obj.number}`;
                      const rawPos = objectivePositions[posKey] || obj.coordinates;
                      return (
                        <ObjectiveMarker
                          key={obj.id}
                          type="hardpoint"
                          zone={obj.name || ""}
                          order={obj.number}
                          coordinates={rawPos}
                          mapDimensions={renderedImageSize}
                          getAdjustedPosition={getAdjustedPosition}
                        />
                      );
                    })}

                  {showSearchAndDestroy &&
                    mapData.objectives?.searchAndDestroy?.map((obj) => {
                      const posKey = `snd_${obj.site || obj.zone}`;
                      const rawPos = objectivePositions[posKey] || obj.coordinates;
                      return (
                        <ObjectiveMarker
                          key={obj.id}
                          type="searchAndDestroy"
                          zone={obj.site || obj.zone || ""}
                          coordinates={rawPos}
                          mapDimensions={renderedImageSize}
                          getAdjustedPosition={getAdjustedPosition}
                        />
                      );
                    })}
                </View>
              </View>
            </ReactNativeZoomableView>
          )
        ) : null}
      </View>

      {!calibrationMode ? (
        <View style={[styles.header, { paddingTop: isLandscape ? insets.top + Spacing.xs : insets.top + Spacing.lg }, showOverviewModal && { opacity: 0, pointerEvents: 'none' }]}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              isLandscape && { width: 32, height: 32, borderRadius: 16 },
              {
                backgroundColor: theme.backgroundDefault,
                opacity: pressed ? 0.8 : 0.9,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
            onPress={handleBack}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Feather name="arrow-left" size={isLandscape ? 16 : 20} color={theme.text} />
          </Pressable>
          <View style={[styles.headerTitleContainer, isLandscape && { paddingVertical: Spacing.xs }]}>
            <ThemedText
              style={[
                styles.headerTitle,
                isLandscape && { fontSize: 18 },
              ]}
            >
              {mapData.mapName}
            </ThemedText>
          </View>
          {__DEV__ && (
            <Pressable
              style={({ pressed }) => [
                styles.calibrateButton,
                isLandscape && { width: 32, height: 32, borderRadius: 16 },
                {
                  backgroundColor: theme.backgroundDefault,
                  opacity: pressed ? 0.8 : 0.9,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
              onPress={toggleCalibrationMode}
              accessibilityLabel="Toggle calibration mode"
              accessibilityRole="button"
            >
              <Feather name="move" size={isLandscape ? 16 : 20} color={theme.text} />
            </Pressable>
          )}
        </View>
      ) : null}

      {!calibrationMode &&
      (showDomination || showHardpoint || showSearchAndDestroy) &&
      mapData.objectives ? (
        <ObjectiveLegend
          showDomination={
            showDomination && !!mapData.objectives.domination?.length
          }
          showHardpoint={
            showHardpoint && !!mapData.objectives.hardpoint?.length
          }
          hardpointCount={mapData.objectives.hardpoint?.length || 0}
          showSearchAndDestroy={
            showSearchAndDestroy &&
            !!mapData.objectives.searchAndDestroy?.length
          }
        />
      ) : null}

      <View
        style={[
          styles.zoomControls,
          {
            bottom: calibrationMode
              ? insets.bottom + 80
              : insets.bottom + Spacing.xl,
          },
          showOverviewModal && { opacity: 0, pointerEvents: 'none' },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.zoomButton,
            {
              backgroundColor: theme.backgroundDefault,
              opacity: pressed ? 0.8 : 0.9,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
          onPress={handleZoomIn}
          accessibilityLabel="Zoom in"
          accessibilityRole="button"
        >
          <Feather name="plus" size={22} color={theme.text} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.zoomButton,
            {
              backgroundColor: theme.backgroundDefault,
              opacity: pressed ? 0.8 : 0.9,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
          onPress={handleZoomOut}
          accessibilityLabel="Zoom out"
          accessibilityRole="button"
        >
          <Feather name="minus" size={22} color={theme.text} />
        </Pressable>

        {zoomLevel !== 1 ? (
          <Pressable
            style={({ pressed }) => [
              styles.zoomButton,
              {
                backgroundColor: theme.backgroundDefault,
                opacity: pressed ? 0.8 : 0.9,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
            onPress={handleResetZoom}
            accessibilityLabel="Reset zoom"
            accessibilityRole="button"
          >
            <Feather name="minimize-2" size={20} color={theme.text} />
          </Pressable>
        ) : null}
      </View>

      {calibrationMode ? (
        <View style={[styles.coordPanel, { bottom: insets.bottom }]}>
          <Pressable
            style={styles.coordPanelHeader}
            onPress={() => setCalibrationPanelCollapsed(!calibrationPanelCollapsed)}
          >
            <ThemedText style={styles.coordPanelHeaderTitle}>
              Calibration Data
            </ThemedText>
            <Feather
              name={calibrationPanelCollapsed ? "chevron-up" : "chevron-down"}
              size={18}
              color="#F97316"
            />
          </Pressable>
          {!calibrationPanelCollapsed && (
            <>
              {/* CALIBRATION COORDINATE RULE: All coordinates in this panel
                  MUST show RAW values (matching JSON data files), NOT
                  display/rendered coordinates. markerPositions, objectivePositions,
                  and labelPositions all store raw coordinates already. */}
              <ThemedText style={styles.coordPanelTitle}>
                Live Coordinates:
              </ThemedText>
              <ScrollView
                style={styles.coordList}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {Object.entries(markerPositions).map(([id, coords]) => (
                  <View key={id} style={styles.coordItem}>
                    <ThemedText style={styles.coordItemId}>
                      {id.split("_")[0]}
                    </ThemedText>
                    <ThemedText style={styles.coordItemValue}>
                      {coords.x.toFixed(2)}, {coords.y.toFixed(2)}
                    </ThemedText>
                  </View>
                ))}
              </ScrollView>
              {Object.keys(objectivePositions).length > 0 ? (
                <>
                  <ThemedText
                    style={[styles.coordPanelTitle, { marginTop: Spacing.sm }]}
                  >
                    Objectives:
                  </ThemedText>
                  <ScrollView
                    style={styles.coordList}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {Object.entries(objectivePositions).map(([id, coords]) => {
                      let bgColor = "#B8860B"; // Default gold for hardpoint
                      if (id.startsWith("dom_")) bgColor = "#8B0000"; // Dark red for domination
                      if (id.startsWith("snd_")) bgColor = "#1E40AF"; // Blue for S&D
                      const label = id
                        .replace("dom_", "D:")
                        .replace("hp_", "HP:")
                        .replace("snd_", "S&D:");
                      return (
                        <View
                          key={id}
                          style={[styles.coordItem, { backgroundColor: bgColor }]}
                        >
                          <ThemedText style={styles.coordItemId}>
                            {label}
                          </ThemedText>
                          <ThemedText style={styles.coordItemValue}>
                            {coords.x.toFixed(2)}, {coords.y.toFixed(2)}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}
              {Object.keys(labelPositions).length > 0 ? (
                <>
                  <ThemedText
                    style={[styles.coordPanelTitle, { marginTop: Spacing.sm }]}
                  >
                    Labels:
                  </ThemedText>
                  <ScrollView
                    style={styles.coordList}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {Object.entries(labelPositions).map(([id, coords]) => {
                      const poi = pois.find((p) => p.id === id);
                      const labelName =
                        poi?.hud_name ||
                        poi?.content?.title ||
                        id.replace(/_/g, " ").slice(0, 12);
                      const shortLabel =
                        labelName.length > 10
                          ? labelName.slice(0, 10) + "…"
                          : labelName;
                      return (
                        <View
                          key={id}
                          style={[styles.coordItem, { backgroundColor: "#6B21A8" }]}
                        >
                          <ThemedText style={styles.coordItemId}>
                            LBL:{shortLabel}
                          </ThemedText>
                          <ThemedText style={styles.coordItemValue}>
                            {coords.x.toFixed(2)}, {coords.y.toFixed(2)}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}
            </>
          )}
        </View>
      ) : null}

      <Modal
        visible={showOverviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOverviewModal(false)}
      >
        <View style={styles.overviewModalOverlay}>
          <View style={styles.overviewModalContent}>
            <Pressable
              style={styles.overviewCloseButton}
              onPress={() => setShowOverviewModal(false)}
            >
              <Feather name="x" size={24} color="#FFFFFF" />
            </Pressable>

            <ScrollView showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.overviewTitle}>
                {mapData.mapName} Overview
              </ThemedText>

              {mapData.operationalOverview ? (
                <>
                  <Image
                    source={getOverviewImage(mapId)}
                    style={styles.overviewImage}
                    contentFit="contain"
                  />

                  <ThemedText style={styles.overviewSetting}>
                    {mapData.operationalOverview.setting}
                  </ThemedText>

                  <ThemedText style={styles.overviewFactions}>
                    {mapData.operationalOverview.factions}
                  </ThemedText>

                  <ThemedText style={styles.overviewDescription}>
                    {mapData.operationalOverview.description}
                  </ThemedText>

                  {mapData.operationalOverview.lanes &&
                  mapData.operationalOverview.lanes.length > 0 ? (
                    <View style={styles.lanesContainer}>
                      <ThemedText style={styles.lanesTitle}>
                        Primary Lanes:
                      </ThemedText>
                      {mapData.operationalOverview.lanes.map((lane, index) => (
                        <ThemedText key={index} style={styles.laneItem}>
                          {index + 1}.{" "}
                          <ThemedText style={styles.laneName}>
                            {lane.name}:
                          </ThemedText>{" "}
                          {lane.description}
                        </ThemedText>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calibrationHeader: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    zIndex: 200,
    position: "relative",
    gap: Spacing.sm,
  },
  calibrationHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  calibrationZoomBadge: {
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginLeft: "auto",
  },
  calibrationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  calibrationBlueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
  },
  calibrationBadgeText: {
    color: "#3B82F6",
    fontWeight: "700",
    fontSize: 12,
  },
  calibrationToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#475569",
  },
  calibrationToggleActive: {
    backgroundColor: "#EF4444",
  },
  calibrationToggleText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 12,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#22C55E",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#6366F1",
  },
  exportButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 12,
  },
  zoomableContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomableView: {
    flex: 1,
  },
  mapWrapper: {
    position: "relative",
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  svgLayer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  markerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  marker: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  markerInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  coordLabel: {
    position: "absolute",
    top: -24,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 80,
    alignItems: "center",
  },
  coordText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "600",
  },
  objectiveMarkerDraggableWrapper: {
    position: "absolute",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  objectiveMarkerDraggable: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  objectiveMarkerText: {
    fontSize: 6,
    fontWeight: "700",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    ...Typography.body,
    marginTop: Spacing.md,
    color: "#94A3B8",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 100,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  calibrateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitleContainer: {
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  headerTitle: {
    ...Typography.title,
    fontFamily: undefined,
    fontWeight: "bold",
    fontSize: 45, // 25% increase from 36 (36 * 1.25 = 45)
    fontStyle: "italic",
    color: "#F1F5F9",
  },
  headerSpacer: {
    width: 40,
  },
  zoomIndicator: {
    position: "absolute",
    left: Spacing.md,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  zoomText: {
    ...Typography.small,
    color: "#F1F5F9",
  },
  zoomControls: {
    position: "absolute",
    right: Spacing.md,
    gap: Spacing.sm,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  coordPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  coordPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: Spacing.xs,
    marginBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  coordPanelHeaderTitle: {
    color: "#F97316",
    fontWeight: "700",
    fontSize: 14,
  },
  coordPanelTitle: {
    color: "#F97316",
    fontWeight: "600",
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  coordList: {
    flexDirection: "row",
  },
  coordItem: {
    backgroundColor: "#1E293B",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginRight: Spacing.sm,
    alignItems: "center",
  },
  coordItemId: {
    color: "#94A3B8",
    fontSize: 10,
    textTransform: "uppercase",
  },
  coordItemValue: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  controlsFlowContainer: {
    alignItems: "center",
    paddingBottom: Spacing.lg,
    zIndex: 50,
  },
  viewModeToggleFlow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  overviewLabelFlow: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
  },
  overviewPillPortraitWrapper: {
    alignItems: "center",
    marginTop: 14,
    marginBottom: 10,
  },
  overviewPillLandscapeWrapper: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 6,
  },
  overviewPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  overviewPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  overviewIconButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(163, 255, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  overviewIconButtonActive: {
    backgroundColor: "rgba(163, 255, 0, 0.15)",
    shadowColor: "#A3FF00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.08 }],
  },
  overviewTooltipPortrait: {
    alignItems: "center",
    marginTop: 8,
    maxWidth: 180,
  },
  overviewTooltipLandscape: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    maxWidth: 220,
  },
  overviewTooltipBody: {
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  overviewTooltipText: {
    color: "#A3FF00",
    fontSize: 13,
  },
  overviewCaretUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(0, 0, 0, 0.85)",
    alignSelf: "center",
  },
  overviewCaretRight: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 8,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "rgba(0, 0, 0, 0.85)",
    alignSelf: "center",
  },
  topControlsWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  viewModeToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: BorderRadius.sm,
    padding: 4,
    marginHorizontal: Spacing.md,
  },
  toggleButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  toggleButtonActive: {
    backgroundColor: "#4A90D9",
  },
  toggleButtonText: {
    color: "#888888",
    fontSize: 13,
    fontWeight: "600",
  },
  toggleButtonTextActive: {
    color: "#FFFFFF",
  },
  overviewLabelContainer: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  overviewLabelText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  overviewModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  overviewModalContent: {
    backgroundColor: "#1a1a2e",
    borderRadius: 15,
    padding: 20,
    margin: 20,
    maxHeight: "85%",
    width: "90%",
    maxWidth: 600,
  },
  overviewCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 5,
  },
  overviewTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    marginTop: 10,
  },
  overviewImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginBottom: 15,
  },
  overviewSetting: {
    color: "#4FC3F7",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  overviewFactions: {
    color: "#FFD54F",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  overviewDescription: {
    color: "#E0E0E0",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  lanesContainer: {
    backgroundColor: "#2a2a3e",
    borderRadius: 8,
    padding: 12,
  },
  lanesTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  laneItem: {
    color: "#B0B0B0",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 5,
  },
  laneName: {
    color: "#4FC3F7",
    fontWeight: "600",
  },
});
