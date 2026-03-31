import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../constants/theme";

/** In-page failure (e.g. DNS / SSL) while we still have network. */
export default function WebLoadError({ onRetry, message }) {
  return (
    <View style={styles.root}>
      <Ionicons name="alert-circle-outline" size={40} color={colors.goldSoft} style={{ marginBottom: spacing.md }} />
      <Text style={styles.title}>Couldn’t load page</Text>
      <Text style={styles.body}>{message || "Something went wrong reaching your site."}</Text>
      <Pressable onPress={onRetry} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.92 }]}>
        <Text style={styles.ctaLabel}>Reload</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: spacing.lg,
    maxWidth: 300,
  },
  cta: {
    borderWidth: 1,
    borderColor: colors.gold,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  ctaLabel: {
    color: colors.gold,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    fontSize: 14,
  },
});
