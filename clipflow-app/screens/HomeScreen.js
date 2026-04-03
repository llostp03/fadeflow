import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import ClipFlowHeader from '../components/ClipFlowHeader';
import { PUBLIC_WEB_URL } from '../config/appConstants';
import { colors } from '../theme';

/**
 * Home tab: public website in a WebView with loading overlay (header stays visible).
 */
export default function HomeScreen() {
  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ClipFlowHeader />

      <View style={styles.webWrap}>
        <WebView
          source={{ uri: PUBLIC_WEB_URL }}
          onLoadEnd={() => setLoading(false)}
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
