import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoadingScreen from './components/LoadingScreen';
import { WEBSITE_URL } from './constants/config';
import { colors } from './constants/theme';
import BookWebScreen from './screens/BookWebScreen';
import ContactScreen from './screens/ContactScreen';
import HomeScreen from './screens/HomeScreen';

SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
  },
};

/**
 * Root of the app:
 * 1) Keeps the native splash up until we finish a short bootstrap.
 * 2) Shows LoadingScreen (brand + spinner) once.
 * 3) Renders bottom tabs: Home, Book (WebView), Contact.
 */
export default function App() {
  const [ready, setReady] = useState(false);
  const [loadingDone, setLoadingDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await new Promise((r) => setTimeout(r, 400));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  const handleLoadingFinish = useCallback(() => {
    setLoadingDone(true);
  }, []);

  if (!ready) {
    return null;
  }

  if (!loadingDone) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingScreen onFinish={handleLoadingFinish} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textMuted,
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              headerShown: false,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Book"
            component={BookWebScreen}
            options={{
              title: 'Book',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="calendar-outline" size={size} color={color} />
              ),
            }}
            listeners={({ navigation }) => ({
              tabPress: () => {
                navigation.navigate('Book', { url: WEBSITE_URL });
              },
            })}
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
  );
}
