import { useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BrandedWebView from "../components/BrandedWebView";
import OfflineScreen from "../components/OfflineScreen";
import { BOOKING_URL } from "../constants/config";
import { colors, spacing } from "../constants/theme";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

/** Dedicated booking WebView (set `BOOKING_URL` in config). */
export default function BookWebScreen() {
  const route = useRoute();
  const hideHeader = route.params?.hideHeader === true;
  const { isOffline } = useNetworkStatus();
  const [retryKey, setRetryKey] = useState(0);

  if (isOffline) {
    return <OfflineScreen onRetry={() => setRetryKey((k) => k + 1)} />;
  }

  return (
    <SafeAreaView style={styles.root} edges={hideHeader ? ["left", "right", "bottom"] : ["top", "left", "right"]}>
      {hideHeader ? null : (
        <View style={styles.header}>
          <Text style={styles.wordmark}>BOOK NOW</Text>
          <Text style={styles.sub}>Reserve your chair</Text>
        </View>
      )}
      <BrandedWebView key={`book-${retryKey}`} uri={BOOKING_URL} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  wordmark: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },
  sub: {
    marginTop: 4,
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
