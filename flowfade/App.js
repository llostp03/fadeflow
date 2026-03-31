import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StripeProvider } from "@stripe/stripe-react-native";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { STRIPE_PUBLISHABLE_KEY } from "./constants/config";
import { colors } from "./constants/theme";
import BookStackNavigator from "./navigation/BookStackNavigator";
import ContactScreen from "./screens/ContactScreen";
import HomeWebScreen from "./screens/HomeWebScreen";

SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.gold,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

export default function App() {
  const onNavReady = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} urlScheme="flowfade">
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme} onReady={onNavReady}>
          <StatusBar style="light" />
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarStyle: {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                borderTopWidth: 1,
                height: 62,
                paddingBottom: 8,
                paddingTop: 6,
              },
              tabBarActiveTintColor: colors.gold,
              tabBarInactiveTintColor: colors.textMuted,
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.5,
              },
            }}
          >
            <Tab.Screen
              name="Home"
              component={HomeWebScreen}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="cut-outline" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Book"
              component={BookStackNavigator}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="calendar-outline" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Contact"
              component={ContactScreen}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
                ),
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </StripeProvider>
  );
}
