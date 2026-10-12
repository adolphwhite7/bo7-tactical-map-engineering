import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import HomeScreen from "@/screens/HomeScreen";
import MapScreen from "@/screens/MapScreen";
import POIDetailModal from "@/screens/POIDetailModal";
import StrategicBriefingScreen from "@/screens/StrategicBriefingScreen";

export type PointOfInterest = {
  id: string;
  hud_name?: string;
  type: "hazard" | "objective" | "flank" | "cover" | "escape" | "power_position";
  coordinates: { x: number; y: number };
  content: {
    title: string;
    description?: string;
    proTip?: string;
    relatedImageFile?: string;
  };
};

export type RootStackParamList = {
  Home: undefined;
  Map: { mapId: string };
  POIDetail: { poi: PointOfInterest; mapId: string };
  StrategicBriefing: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="POIDetail"
        component={POIDetailModal}
        options={{
          presentation: "modal",
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="StrategicBriefing"
        component={StrategicBriefingScreen}
        options={{
          presentation: "modal",
          headerShown: false,
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
}
