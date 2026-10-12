import { Platform } from "react-native";

const tintColorLight = "#3B82F6";
const tintColorDark = "#3B82F6";

export const Colors = {
  light: {
    text: "#0F172A",
    buttonText: "#FFFFFF",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    link: "#3B82F6",
    backgroundRoot: "#F8FAFC",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F1F5F9",
    backgroundTertiary: "#E2E8F0",
    textSecondary: "#94A3B8",
    border: "#CBD5E1",
  },
  dark: {
    text: "#F1F5F9",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    link: "#5BA3FF",
    backgroundRoot: "#0F172A",
    backgroundDefault: "#1E293B",
    backgroundSecondary: "#334155",
    backgroundTertiary: "#475569",
    textSecondary: "#CBD5E1",
    border: "#334155",
  },
};

export const POIColors = {
  hazard: "#EF4444",
  objective: "#3B82F6",
  flank: "#10B981",
  cover: "#F59E0B",
  escape: "#8B5CF6",
  power_position: "#EC4899",
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  heading: {
    fontSize: 24,
    fontWeight: "600" as const,
  },
  title: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
