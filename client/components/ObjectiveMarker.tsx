import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

const ENDPOINT_SIZES = {
  user: 6,
  calibration: 8,
};

interface ObjectiveMarkerProps {
  type: 'domination' | 'hardpoint' | 'searchAndDestroy';
  zone: string;
  order?: number;
  coordinates: { x: number; y: number };
  mapDimensions: { width: number; height: number };
  description?: string;
  getAdjustedPosition: (x: number, y: number) => { x: number; y: number };
  onPress?: () => void;
  calibrationMode?: boolean;
}

const COLORS = {
  domination: {
    A: '#FF4444',
    B: '#FFFFFF',
    C: '#4444FF',
  } as Record<string, string>,
  hardpoint: '#FFD700',
  searchAndDestroy: {
    A: '#FF6B35',  // Orange for Site A
    B: '#00D4FF',  // Cyan for Site B
  } as Record<string, string>,
};

export const ObjectiveMarker: React.FC<ObjectiveMarkerProps> = ({
  type,
  zone,
  order,
  coordinates,
  mapDimensions,
  getAdjustedPosition,
  onPress,
  calibrationMode = false,
}) => {
  const adjustedPos = getAdjustedPosition(coordinates.x, coordinates.y);
  const x = (adjustedPos.x / 100) * mapDimensions.width;
  const y = (adjustedPos.y / 100) * mapDimensions.height;
  const size = calibrationMode ? ENDPOINT_SIZES.calibration : ENDPOINT_SIZES.user;

  const color = type === 'domination'
    ? COLORS.domination[zone] || '#FFFFFF'
    : type === 'searchAndDestroy'
      ? COLORS.searchAndDestroy[zone] || '#FF6B35'
      : COLORS.hardpoint;

  const displayText = type === 'domination' ? zone : type === 'searchAndDestroy' ? zone : `${order}`;
  const textColor = zone === 'B' || type === 'hardpoint' ? '#000000' : '#FFFFFF';
  const isSquare = type === 'searchAndDestroy';

  const markerSize = size * 2 + 1;
  const halfSize = markerSize / 2;

  const typeLabel =
    type === 'domination'
      ? 'Domination'
      : type === 'searchAndDestroy'
        ? 'Search and Destroy'
        : 'Hardpoint';
  const zoneLabel =
    type === 'hardpoint' ? `position ${order}` : `zone ${zone}`;

  return (
    <Pressable
      style={[styles.container, { left: x - halfSize, top: y - halfSize, width: markerSize, height: markerSize }]}
      onPress={onPress}
      hitSlop={20}
      accessibilityLabel={`${typeLabel} ${zoneLabel}`}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityHint={onPress ? 'Double tap for details' : undefined}
    >
      <View style={[
        styles.marker,
        { backgroundColor: color, width: markerSize, height: markerSize, borderRadius: halfSize },
        isSquare && styles.squareMarker,
      ]}>
        <Text style={[styles.zoneText, { color: textColor }]} allowFontScaling={false}>{displayText}</Text>
      </View>
    </Pressable>
  );
};

interface ObjectiveLegendProps {
  showDomination?: boolean;
  showHardpoint?: boolean;
  showSearchAndDestroy?: boolean;
  hardpointCount?: number;
}

export const ObjectiveLegend: React.FC<ObjectiveLegendProps> = ({
  showDomination = false,
  showHardpoint = false,
  showSearchAndDestroy = false,
  hardpointCount = 5,
}) => {
  return (
    <View style={styles.legend} accessibilityLabel="Objectives legend" accessible={true}>
      <Text style={styles.legendTitle} maxFontSizeMultiplier={1.5}>Objectives</Text>
      {showDomination && (
        <>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#FF4444' }]} accessibilityElementsHidden={true} />
            <Text style={styles.legendText} maxFontSizeMultiplier={1.5}>Domination A</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#666' }]} accessibilityElementsHidden={true} />
            <Text style={styles.legendText} maxFontSizeMultiplier={1.5}>Domination B</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#4444FF' }]} accessibilityElementsHidden={true} />
            <Text style={styles.legendText} maxFontSizeMultiplier={1.5}>Domination C</Text>
          </View>
        </>
      )}
      {showHardpoint && (
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#FFD700' }]} accessibilityElementsHidden={true} />
          <Text style={styles.legendText} maxFontSizeMultiplier={1.5}>Hardpoint (1-{hardpointCount})</Text>
        </View>
      )}
      {showSearchAndDestroy && (
        <View style={styles.legendRow}>
          <View style={[styles.legendSquare, { backgroundColor: '#00D4FF' }]} accessibilityElementsHidden={true} />
          <Text style={styles.legendText} maxFontSizeMultiplier={1.5}>S&D Site B</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
    elevation: 3,
  },
  squareMarker: {
    borderRadius: 2,
  },
  zoneText: {
    fontSize: 6,
    fontWeight: 'bold',
  },
  legend: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 8,
    padding: 12,
  },
  legendTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendSquare: {
    width: 16,
    height: 16,
    borderRadius: 3,
    marginRight: 8,
  },
  legendText: {
    color: '#CCCCCC',
    fontSize: 12,
  },
});
