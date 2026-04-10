import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StripeProvider } from '@stripe/stripe-react-native';
import { StatusBar } from 'expo-status-bar';

import { STRIPE_PUBLISHABLE_KEY } from './stripeConfig';
import HomeScreen from './screens/HomeScreen';
import BookScreen from './screens/BookScreen';
import BookingConfirmedScreen from './screens/BookingConfirmedScreen';
import ContactScreen from './screens/ContactScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import SignUpScreen from './screens/SignUpScreen';
import LoginScreen from './screens/LoginScreen';
import AIBookingScreen from './screens/AIBookingScreen';
import { colors } from './theme';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const BookStack = createNativeStackNavigator();

function BookStackNavigator() {
  return (
    <BookStack.Navigator screenOptions={{ headerShown: false }}>
      <BookStack.Screen name="BookMain" component={BookScreen} />
      <BookStack.Screen name="BookingConfirmed" component={BookingConfirmedScreen} />
    </BookStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: 'home-outline',
            Book: 'calendar-outline',
            Contact: 'mail-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Book" component={BookStackNavigator} options={{ title: 'Book' }} />
      <Tab.Screen name="Contact" component={ContactScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const publishableKey = STRIPE_PUBLISHABLE_KEY.trim();

  if (!publishableKey) {
    return (
      <View style={styles.missingKey}>
        <Text style={styles.missingKeyTitle}>Stripe key missing</Text>
        <Text style={styles.missingKeyBody}>
          Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to a .env file in clipflow-app (your publishable key
          from Stripe Dashboard → Developers → API keys). Restart Expo, then rebuild your dev client if
          needed.
        </Text>
      </View>
    );
  }

  return (
    <StripeProvider publishableKey={publishableKey} urlScheme="clipflow">
      <NavigationContainer>
        <StatusBar style="light" />
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Home" component={MainTabs} />
          <RootStack.Screen
            name="PrivacyPolicy"
            component={PrivacyPolicyScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <RootStack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <RootStack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <RootStack.Screen
            name="AIBooking"
            component={AIBookingScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  missingKey: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 28,
  },
  missingKeyTitle: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  missingKeyBody: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
});
