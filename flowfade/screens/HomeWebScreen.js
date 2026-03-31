import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BrandedWebView from "../components/BrandedWebView";
import OfflineScreen from "../components/OfflineScreen";
import { WEBSITE_URL } from "../constants/config";
import { colors, spacing } from "../constants/theme";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

/** Main site — WebView under a slim gold-accent header. */
export default function HomeWebScreen() {
  const { isOffline } = useNetworkStatus();
  const [retryKey, setRetryKey] = useState(0);

  if (isOffline) {
    return <OfflineScreen onRetry={() => setRetryKey((k) => k + 1)} />;
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>FLOWFADE</Text>
        <View style={styles.rule} />
        <Text style={styles.tag}>Barber studio</Text>
      </View>
      <BrandedWebView key={`home-${retryKey}`} uri={WEBSITE_URL} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  wordmark: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 4,
  },
  rule: {
    height: 2,
    width: 40,
    backgroundColor: colors.goldDim,
    marginVertical: 6,
    borderRadius: 1,
  },
  tag: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
