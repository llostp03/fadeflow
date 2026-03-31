import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SHOP_EMAIL, SHOP_PHONE } from "../constants/config";
import { colors, radius, spacing } from "../constants/theme";

function rowIcon(name) {
  return <Ionicons name={name} size={22} color={colors.gold} style={{ width: 28 }} />;
}

export default function ContactScreen() {
  const call = () => Linking.openURL(`tel:${SHOP_PHONE}`);
  const email = () => Linking.openURL(`mailto:${SHOP_EMAIL}`);

  const sheet = () => {
    Alert.alert("Contact Flowfade", "Choose how to reach us", [
      { text: "Call shop", onPress: call },
      { text: "Email", onPress: email },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>VISIT & CONNECT</Text>
        <Text style={styles.title}>Flowfade</Text>
        <View style={styles.rule} />
        <Text style={styles.blurb}>Walk-ins welcome. Prefer to book? Use the Book tab.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Direct line</Text>

        <Pressable onPress={call} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          {rowIcon("call-outline")}
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Call</Text>
            <Text style={styles.rowValue}>{SHOP_PHONE}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.goldDim} />
        </Pressable>

        <Pressable onPress={email} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          {rowIcon("mail-outline")}
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{SHOP_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.goldDim} />
        </Pressable>

        <Pressable onPress={sheet} style={({ pressed }) => [styles.altCta, pressed && styles.pressed]}>
          <Text style={styles.altCtaText}>More options</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  hero: { marginBottom: spacing.lg },
  kicker: {
    color: colors.goldDim,
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 1,
  },
  rule: {
    width: 56,
    height: 3,
    backgroundColor: colors.gold,
    marginVertical: spacing.md,
    borderRadius: 2,
  },
  blurb: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.goldSoft,
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.88 },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  rowValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 2,
  },
  altCta: {
    marginTop: spacing.sm,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldDim,
  },
  altCtaText: {
    color: colors.gold,
    fontWeight: "700",
    letterSpacing: 2,
    fontSize: 12,
    textTransform: "uppercase",
  },
});
