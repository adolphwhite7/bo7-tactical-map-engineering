import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

interface LayerToggleButtonProps {
  label: string;
  isActive: boolean;
  onToggle: () => void;
  activeColor?: string;
}

export const LayerToggleButton: React.FC<LayerToggleButtonProps> = ({
  label,
  isActive,
  onToggle,
  activeColor = '#4A90D9',
}) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isActive ? { backgroundColor: activeColor, borderColor: activeColor, borderWidth: 2 } : styles.buttonInactive,
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
      ]}
      onPress={onToggle}
      accessibilityLabel={`${label} layer ${isActive ? 'on' : 'off'}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <Text
        style={[
          styles.text,
          isActive ? styles.textActive : styles.textInactive,
        ]}
        maxFontSizeMultiplier={1.5}
      >
        {isActive ? '✓ ' : ''}{label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#4A90D9',
  },
  buttonInactive: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  textActive: {
    color: '#FFFFFF',
  },
  textInactive: {
    color: '#4A90D9',
  },
});
