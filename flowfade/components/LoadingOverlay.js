import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../constants/theme";

export default function LoadingOverlay({ label = "Loading…" }) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.card}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.caption}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,5,8,0.72)",
  },
  card: {
    backgroundColor: colors.surface2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  caption: {
    color: colors.textMuted,
    fontSize: 14,
    letterSpacing: 0.4,
  },
});
