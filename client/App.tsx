import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AnimatedSplashScreen from "@/components/AnimatedSplashScreen";
import {
  installGlobalCrashHandlers,
  reportBoundaryCrash,
} from "@/services/crashReporter";

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    installGlobalCrashHandlers();
    setAppIsReady(true);
  }, []);

  return (
    <ErrorBoundary onError={reportBoundaryCrash}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AnimatedSplashScreen isReady={appIsReady}>
            <GestureHandlerRootView style={styles.root}>
              <KeyboardProvider>
                <NavigationContainer>
                  <RootStackNavigator />
                </NavigationContainer>
                <StatusBar style="auto" />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AnimatedSplashScreen>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
