import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Animated,
  Dimensions,
} from "react-native";
import * as SplashScreen from "expo-splash-screen";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const SPLASH_BG = "#0A0E12";
const TOTAL_DURATION = 2500;

const FRAME_1 = require("../../assets/images/splash_frame_1.jpg");
const FRAME_2 = require("../../assets/images/splash_frame_2.jpg");
const FRAME_3 = require("../../assets/images/splash_frame_3.jpg");
const FRAME_4 = require("../../assets/images/splash_frame_4.jpg");

SplashScreen.preventAutoHideAsync();

interface AnimatedSplashScreenProps {
  children: React.ReactNode;
  isReady: boolean;
}

export default function AnimatedSplashScreen({
  children,
  isReady,
}: AnimatedSplashScreenProps) {
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const [isSplashHidden, setIsSplashHidden] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const exitProgress = useRef(new Animated.Value(0)).current;

  const frame1Opacity = progress.interpolate({
    inputRange:  [0,  10, 20, 30, 40],
    outputRange: [0,   1,  1,  1,  0],
    extrapolate: "clamp",
  });

  const frame2Opacity = progress.interpolate({
    inputRange:  [30, 40, 55, 65, 75],
    outputRange: [0,   1,  1, 0.3, 0],
    extrapolate: "clamp",
  });

  const frame3Opacity = progress.interpolate({
    inputRange:  [55, 65, 75, 80, 85],
    outputRange: [0,   1,  1,  1,  0],
    extrapolate: "clamp",
  });

  const frame4Opacity = progress.interpolate({
    inputRange:  [80, 88, 100],
    outputRange: [0,   1,   1],
    extrapolate: "clamp",
  });

  const sceneScale = progress.interpolate({
    inputRange:  [0,  30,  75, 85, 100],
    outputRange: [1, 1.0, 1.06, 4,   8],
    extrapolate: "clamp",
  });

  const overlayOpacity = exitProgress.interpolate({
    inputRange:  [0, 100],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const appOpacity = exitProgress.interpolate({
    inputRange:  [0, 100],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const appScale = exitProgress.interpolate({
    inputRange:  [0, 100],
    outputRange: [0.95, 1],
    extrapolate: "clamp",
  });

  useEffect(() => {
    if (!isReady || isSplashHidden) return;

    const run = async () => {
      await SplashScreen.hideAsync();
      setIsSplashHidden(true);

      progress.setValue(0);
      exitProgress.setValue(0);

      Animated.sequence([
        Animated.timing(progress, {
          toValue: 100,
          duration: TOTAL_DURATION,
          easing: (t: number) => t,
          useNativeDriver: true,
        }),
        Animated.timing(exitProgress, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsAnimationComplete(true);
      });
    };

    run();
  }, [isReady, isSplashHidden]);

  return (
    <View style={[styles.container, { backgroundColor: SPLASH_BG }]}>
      <Animated.View
        style={[
          styles.appContainer,
          {
            opacity: appOpacity,
            transform: [{ scale: appScale }],
          },
        ]}
      >
        {children}
      </Animated.View>

      {!isAnimationComplete && (
        <Animated.View
          style={[
            styles.splashOverlay,
            { opacity: overlayOpacity },
          ]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              styles.frameContainer,
              { transform: [{ scale: sceneScale }] },
            ]}
          >
            <Animated.Image
              source={FRAME_1}
              style={[styles.frame, { opacity: frame1Opacity }]}
              resizeMode="cover"
            />
            <Animated.Image
              source={FRAME_2}
              style={[styles.frame, { opacity: frame2Opacity }]}
              resizeMode="cover"
            />
            <Animated.Image
              source={FRAME_3}
              style={[styles.frame, { opacity: frame3Opacity }]}
              resizeMode="cover"
            />
            <Animated.Image
              source={FRAME_4}
              style={[styles.frame, { opacity: frame4Opacity }]}
              resizeMode="cover"
            />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appContainer: {
    flex: 1,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_BG,
    justifyContent: "center",
    alignItems: "center",
  },
  frameContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "relative",
  },
  frame: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
