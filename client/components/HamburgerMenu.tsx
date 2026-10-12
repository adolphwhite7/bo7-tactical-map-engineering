import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HamburgerMenu() {
  const [visible, setVisible] = useState(false);
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const handleOpen = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
  };

  const handleStrategicBriefing = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setVisible(false);
    navigation.navigate("StrategicBriefing");
  };

  const handleSupport = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setVisible(false);
    Linking.openURL("https://tacguideapps.com/");
  };

  const handlePrivacyPolicy = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setVisible(false);
    Linking.openURL("https://tacguideapps.com/privacy/");
  };

  return (
    <>
      <Pressable
        onPress={handleOpen}
        accessibilityLabel="Menu"
        accessibilityHint="Opens navigation and support options"
        style={[
          styles.menuButton,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: theme.border,
          },
        ]}
      >
        <Feather name="menu" size={20} color={theme.text} />
      </Pressable>

      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleStrategicBriefing}
              accessibilityLabel="Strategy Briefing"
              accessibilityHint="Opens the strategic briefing screen"
            >
              <Feather name="book-open" size={18} color={theme.text} />
              <ThemedText style={styles.menuItemText}>
                Strategy Briefing
              </ThemedText>
            </Pressable>

            <View style={[styles.separator, { borderColor: theme.border }]} />

            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleSupport}
              accessibilityLabel="Support"
              accessibilityHint="Opens the support website in your browser"
            >
              <Feather name="external-link" size={18} color={theme.text} />
              <ThemedText style={styles.menuItemText}>Support</ThemedText>
            </Pressable>

            <View style={[styles.separator, { borderColor: theme.border }]} />

            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handlePrivacyPolicy}
              accessibilityLabel="Privacy Policy"
              accessibilityHint="Opens the privacy policy website in your browser"
            >
              <Feather name="shield" size={18} color={theme.text} />
              <ThemedText style={styles.menuItemText}>Privacy Policy</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  backdrop: {
    flex: 1,
  },
  dropdown: {
    position: "absolute",
    top: 100,
    right: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  menuItemText: {
    ...Typography.body,
    fontWeight: "500",
  },
  separator: {
    borderTopWidth: 1,
  },
});
