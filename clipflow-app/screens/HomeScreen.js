import React, { useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import ClipFlowHeader from '../components/ClipFlowHeader';
import { PUBLIC_WEB_URL } from '../config/appConstants';
import { colors } from '../theme';
import { navigateFromRoot } from '../utils/rootNavigation';

const AI_BOOKING_APP_URL = 'clipflow://aibooking';

function navigateToAIBookingFromWebView(navigation) {
  navigateFromRoot(navigation, 'AIBooking');
}

/**
 * Marketing links (e.g. /barber-login) should open the in-app barber sign-in, not another WebView page.
 */
function isBarberLoginNavigationUrl(url) {
  if (
    url.startsWith('clipflow://login') ||
    url.startsWith('clipflow://barber-login')
  ) {
    return true;
  }
  try {
    const base = new URL(PUBLIC_WEB_URL);
    const u = new URL(url);
    if (u.origin !== base.origin) {
      return false;
    }
    const path = (u.pathname || '/').replace(/\/+$/, '') || '/';
    return path === '/login' || path === '/barber-login';
  } catch {
    return false;
  }
}

/**
 * Home tab: public website in a WebView with loading overlay (header stays visible).
 * Marketing CTAs use clipflow://aibooking to open the in-app AI booking modal.
 */
export default function HomeScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);

  const onShouldStartLoadWithRequest = useCallback(
    (request) => {
      const { url } = request;
      if (url.startsWith(AI_BOOKING_APP_URL)) {
        navigateToAIBookingFromWebView(navigation);
        return false;
      }
      if (isBarberLoginNavigationUrl(url)) {
        navigateFromRoot(navigation, 'Login');
        return false;
      }
      return true;
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ClipFlowHeader />

      <View style={styles.webWrap}>
        <WebView
          source={{ uri: PUBLIC_WEB_URL }}
          onLoadEnd={() => setLoading(false)}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          style={styles.webView}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          backgroundColor="#000"
        />

        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={styles.loadingText}>Loading ClipFlow...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webWrap: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.text,
    fontSize: 15,
  },
});
