import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { colors } from "../constants/theme";
import LoadingOverlay from "./LoadingOverlay";
import WebLoadError from "./WebLoadError";

/**
 * WebView with gold-on-black loading overlay and retry on native / HTTP errors.
 */
export default function BrandedWebView({ uri }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    setReloadToken((k) => k + 1);
  }, []);

  if (loadError) {
    return <WebLoadError onRetry={retry} message={loadError} />;
  }

  return (
    <View style={styles.box}>
      <WebView
        key={`${uri}-${reloadToken}`}
        source={{ uri }}
        style={styles.web}
        onLoadStart={() => {
          setLoading(true);
          setLoadError(null);
        }}
        onLoadEnd={() => setLoading(false)}
        onError={(e) => {
          setLoading(false);
          setLoadError(e?.nativeEvent?.description || "WebView error");
        }}
        onHttpError={() => {
          setLoading(false);
          setLoadError("The server returned an error.");
        }}
        startInLoadingState={false}
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
      />
      {loading ? <LoadingOverlay label="Opening Flowfade…" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg },
  web: { flex: 1, backgroundColor: colors.bg },
});
