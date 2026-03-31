import { useRoute } from '@react-navigation/native';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { WEBSITE_URL } from '../constants/config';
import { colors } from '../constants/theme';

/**
 * Embeds your marketing/booking site. Home-screen buttons pass `route.params.url`;
 * the Book tab uses WEBSITE_URL from config when no param is set.
 */
export default function BookWebScreen() {
  const route = useRoute();
  const url = route.params?.url ?? WEBSITE_URL;

  const source = useMemo(() => ({ uri: url }), [url]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <WebView
        key={url}
        source={source}
        style={styles.web}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  web: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
