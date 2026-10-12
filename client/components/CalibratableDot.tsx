import React, { useRef, useState, useEffect, memo, useMemo } from 'react';
import { View, PanResponder, StyleSheet, Platform } from 'react-native';
import * as Haptics from "expo-haptics";

interface CalibratableDotProps {
  poiId: string;
  initialPosition: { x: number; y: number }; // Pixel coordinates
  color: string;
  isCalibrationMode: boolean;
  onPositionChange: (poiId: string, position: { x: number; y: number }) => void;
  mapDimensions: { width: number; height: number };
  dotSize?: number;
}

const CalibratableDot: React.FC<CalibratableDotProps> = memo(({
  poiId,
  initialPosition,
  color,
  isCalibrationMode,
  onPositionChange,
  mapDimensions,
  dotSize = 2,
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
        console.log(`[DOT] Grant: ${poiId}`);
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
        
        const clampedX = Math.max(0, Math.min(dims.width, newX));
        const clampedY = Math.max(0, Math.min(dims.height, newY));
        
        setCurrentPixelPos({ x: clampedX, y: clampedY });
        currentPixelPosRef.current = { x: clampedX, y: clampedY };
        
        const percentX = (clampedX / dims.width) * 100;
        const percentY = (clampedY / dims.height) * 100;
        onPositionChangeRef.current(poiId, { x: percentX, y: percentY });
      },

      onPanResponderRelease: () => {
        console.log(`[DOT] Release: ${poiId}`);
        setIsDragging(false);
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      },
    }), [poiId]);

  const hitSlop = 20;

  return (
    <View
      style={[
        styles.dotContainer,
        {
          left: currentPixelPos.x - dotSize / 2,
          top: currentPixelPos.y - dotSize / 2,
          zIndex: isDragging ? 1000 : 10,
        },
      ]}
      {...panResponder.panHandlers}
      hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
    >
      <View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
          },
          isDragging && styles.dotDragging,
          isCalibrationMode && styles.dotCalibrationMode,
        ]}
      />
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.poiId === nextProps.poiId &&
    prevProps.initialPosition.x === nextProps.initialPosition.x &&
    prevProps.initialPosition.y === nextProps.initialPosition.y &&
    prevProps.color === nextProps.color &&
    prevProps.isCalibrationMode === nextProps.isCalibrationMode &&
    prevProps.mapDimensions.width === nextProps.mapDimensions.width &&
    prevProps.mapDimensions.height === nextProps.mapDimensions.height
  );
});

const styles = StyleSheet.create({
  dotContainer: {
    position: 'absolute',
  },
  dot: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  dotDragging: {
    transform: [{ scale: 1.5 }],
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  dotCalibrationMode: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});

export default CalibratableDot;
