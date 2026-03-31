import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import BookWebScreen from "../screens/BookWebScreen";
import BookingPaymentScreen from "../screens/BookingPaymentScreen";
import { colors } from "../constants/theme";

const Stack = createNativeStackNavigator();

/**
 * Book tab: native Stripe checkout first, optional push to the legacy WebView scheduler.
 */
export default function BookStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.gold,
        headerTitleStyle: { color: colors.text, fontWeight: "800", letterSpacing: 0.5 },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="BookingCheckout"
        component={BookingPaymentScreen}
        options={{ title: "Book & pay" }}
      />
      <Stack.Screen
        name="BookOnline"
        component={BookWebScreen}
        options={{ title: "Web booking" }}
        initialParams={{ hideHeader: true }}
      />
    </Stack.Navigator>
  );
}
