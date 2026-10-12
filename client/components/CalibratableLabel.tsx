import React, { useRef, useState, useEffect, memo, useMemo } from 'react';
import { View, Text, PanResponder, StyleSheet, Platform } from 'react-native';
import * as Haptics from "expo-haptics";

interface CalibratableLabelProps {
  poiId: string;
  initialPosition: { x: number; y: number }; // Pixel coordinates
  displayName: string;
  typeLabel: string;
  color: string;
  isCalibrationMode: boolean;
  hasCustomPosition: boolean;
  onPositionChange: (poiId: string, position: { x: number; y: number }) => void;
  onLayout: (poiId: string, width: number) => void;
  mapDimensions: { width: number; height: number };
}

const LABEL_HEIGHT = 24;

const CalibratableLabel: React.FC<CalibratableLabelProps> = memo(({
  poiId,
  initialPosition,
  displayName,
  typeLabel,
  color,
  isCalibrationMode,
  hasCustomPosition,
  onPositionChange,
  onLayout,
  mapDimensions,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [currentPixelPos, setCurrentPixelPos] = useState(initialPosition);
  const startPixelPos = useRef(initialPosition);
  const calibrationModeRef = useRef(isCalibrationMode);
  const mapDimensionsRef = useRef(mapDimensions);
  const onPositionChangeRef = useRef(onPositionChange);
  const currentPixelPosRef = useRef(currentPixelPos);

  useEffect(() => {
    calibrationModeRef.current = isCalibrationMode;
  }, [isCalibrationMode]);

  useEffect(() => {
    mapDimensionsRef.current = mapDimensions;
  }, [mapDimensions]);

  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  useEffect(() => {
    currentPixelPosRef.current = currentPixelPos;
  }, [currentPixelPos]);

  useEffect(() => {
    if (!isDragging) {
      setCurrentPixelPos(initialPosition);
      startPixelPos.current = initialPosition;
      currentPixelPosRef.current = initialPosition;
    }
  }, [initialPosition.x, initialPosition.y, isDragging]);

  const panResponder = useMemo(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: () => calibrationModeRef.current,
      onMoveShouldSetPanResponder: () => calibrationModeRef.current,
      onStartShouldSetPanResponderCapture: () => calibrationModeRef.current,
      onMoveShouldSetPanResponderCapture: () => calibrationModeRef.current,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,

      onPanResponderGrant: () => {
        setIsDragging(true);
        startPixelPos.current = currentPixelPosRef.current;
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },

      onPanResponderMove: (_, gestureState) => {
        const dims = mapDimensionsRef.current;
        const newX = startPixelPos.current.x + gestureState.dx;
        const newY = startPixelPos.current.y + gestureState.dy;
        
        const clampedX = Math.max(-dims.width, Math.min(dims.width * 2, newX));
        const clampedY = Math.max(-dims.height, Math.min(dims.height * 2, newY));
        
        setCurrentPixelPos({ x: clampedX, y: clampedY });
        currentPixelPosRef.current = { x: clampedX, y: clampedY };
        
        const percentX = (clampedX / dims.width) * 100;
        const percentY = (clampedY / dims.height) * 100;
        onPositionChangeRef.current(poiId, { x: percentX, y: percentY });
      },

      onPanResponderRelease: () => {
        setIsDragging(false);
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      },
    }), [poiId]);

  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      onLayout(poiId, width);
    }
  };

  return (
    <View
      style={[
        styles.label,
        isCalibrationMode && !hasCustomPosition && styles.labelCalibrationMode,
        {
          left: currentPixelPos.x,
          top: currentPixelPos.y,
          zIndex: isDragging ? 1000 : 10,
        },
        isCalibrationMode && hasCustomPosition && styles.labelCustomPosition,
        isDragging && styles.labelDragging,
      ]}
      {...panResponder.panHandlers}
      onLayout={handleLayout}
    >
      <Text style={styles.labelText} numberOfLines={1}>
        {displayName.toUpperCase()}{" "}
        <Text style={[styles.typeText, { color }]}>({typeLabel})</Text>
      </Text>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.poiId === nextProps.poiId &&
    prevProps.initialPosition.x === nextProps.initialPosition.x &&
    prevProps.initialPosition.y === nextProps.initialPosition.y &&
    prevProps.displayName === nextProps.displayName &&
    prevProps.typeLabel === nextProps.typeLabel &&
    prevProps.color === nextProps.color &&
    prevProps.isCalibrationMode === nextProps.isCalibrationMode &&
    prevProps.hasCustomPosition === nextProps.hasCustomPosition &&
    prevProps.mapDimensions.width === nextProps.mapDimensions.width &&
    prevProps.mapDimensions.height === nextProps.mapDimensions.height
  );
});

const styles = StyleSheet.create({
  label: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    height: LABEL_HEIGHT,
    justifyContent: "center",
  },
  labelCalibrationMode: {
    shadowColor: '#00FF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  labelCustomPosition: {
    shadowColor: '#FFFF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  labelDragging: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
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
});

export default CalibratableLabel;
