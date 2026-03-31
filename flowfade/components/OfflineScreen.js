import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { colors, radius, spacing } from "../constants/theme";

/**
 * Shown when NetInfo reports no connection — barber-shop luxury styling.
 */
export default function OfflineScreen({ onRetry }) {
  const refresh = async () => {
    await NetInfo.fetch();
    onRetry?.();
  };

  return (
    <View style={styles.root}>
      <View style={styles.accentLine} />
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline" size={44} color={colors.gold} />
      </View>
      <Text style={styles.title}>You’re offline</Text>
      <Text style={styles.body}>
        Check your signal or Wi‑Fi, then try again. Flowfade needs a connection to load your site.
      </Text>
      <Pressable onPress={refresh} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}>
        <Ionicons name="refresh" size={20} color={colors.bg} style={{ marginRight: 8 }} />
        <Text style={styles.ctaLabel}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  accentLine: {
    width: 48,
    height: 3,
    backgroundColor: colors.gold,
    borderRadius: 2,
    marginBottom: spacing.lg,
    opacity: 0.9,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  body: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 320,
    marginBottom: spacing.xl,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gold,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  ctaLabel: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
