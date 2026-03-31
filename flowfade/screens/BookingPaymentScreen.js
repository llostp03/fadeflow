import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Linking from "expo-linking";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useStripe } from "@stripe/stripe-react-native";
import { fetchPaymentIntentClientSecret } from "../api/createPaymentIntent";
import { BOOKING_SERVICES } from "../constants/services";
import { colors, radius, spacing } from "../constants/theme";
import { formatUsdFromCents } from "../utils/money";

/**
 * Native booking checkout: pick a service, pay a deposit or full balance via Stripe PaymentSheet.
 * Client secret is loaded from POST {API_BASE_URL}/create-payment-intent.
 */
export default function BookingPaymentScreen() {
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [selectedId, setSelectedId] = useState(BOOKING_SERVICES[0]?.id);
  const [customerName, setCustomerName] = useState("");
  const [phase, setPhase] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const selected = useMemo(
    () => BOOKING_SERVICES.find((s) => s.id === selectedId) || BOOKING_SERVICES[0],
    [selectedId]
  );

  const resetFlow = useCallback(() => {
    setPhase("idle");
    setErrorMessage("");
  }, []);

  const runPayment = useCallback(
    async (kind) => {
      if (!selected) return;
      const name = customerName.trim();
      if (!name) {
        setPhase("error");
        setErrorMessage("Please enter your name for the reservation.");
        return;
      }
      const amountCents = kind === "deposit" ? selected.depositCents : selected.fullCents;
      setPhase("preparing");
      setErrorMessage("");

      try {
        const clientSecret = await fetchPaymentIntentClientSecret({
          amountCents,
          currency: "usd",
          customerName: name,
          metadata: {
            service_id: selected.id,
            payment_kind: kind,
            service_name: selected.name,
          },
        });

        const returnURL = Linking.createURL("stripe");

        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: "Flowfade",
          paymentIntentClientSecret: clientSecret,
          returnURL,
          allowsDelayedPaymentMethods: true,
        });

        if (initError) {
          setPhase("error");
          setErrorMessage(initError.message || "Could not open payment sheet.");
          return;
        }

        const { error: presentError } = await presentPaymentSheet();

        if (presentError) {
          if (presentError.code === "Canceled") {
            setPhase("idle");
            return;
          }
          setPhase("error");
          setErrorMessage(presentError.message || "Payment did not complete.");
          return;
        }

        setPhase("success");
      } catch (e) {
        setPhase("error");
        setErrorMessage(e?.message || "Something went wrong.");
      }
    },
    [customerName, initPaymentSheet, presentPaymentSheet, selected]
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Choose your service</Text>
        {BOOKING_SERVICES.map((svc) => {
          const active = svc.id === selectedId;
          return (
            <Pressable
              key={svc.id}
              onPress={() => setSelectedId(svc.id)}
              style={({ pressed }) => [
                styles.card,
                active && styles.cardActive,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{svc.name}</Text>
                <Text style={styles.cardDuration}>{svc.duration}</Text>
              </View>
              <Text style={styles.cardDesc}>{svc.description}</Text>
              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>Full</Text>
                  <Text style={styles.priceValue}>{formatUsdFromCents(svc.fullCents)}</Text>
                </View>
                <View style={styles.priceDivider} />
                <View>
                  <Text style={styles.priceLabel}>Deposit</Text>
                  <Text style={styles.priceValueGold}>{formatUsdFromCents(svc.depositCents)}</Text>
                </View>
              </View>
              {active ? (
                <View style={styles.selectedPill}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.bg} />
                  <Text style={styles.selectedPillText}>Selected</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}

        {phase === "success" ? (
          <View style={styles.bannerOk}>
            <Ionicons name="checkmark-done-circle" size={28} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Payment received</Text>
              <Text style={styles.bannerBody}>
                Thanks — you’re confirmed. We’ll see you in the chair.
              </Text>
            </View>
            <Pressable onPress={resetFlow} style={styles.bannerBtn}>
              <Text style={styles.bannerBtnText}>Done</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === "error" ? (
          <View style={styles.bannerErr}>
            <Ionicons name="warning-outline" size={26} color={colors.goldSoft} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Payment didn’t go through</Text>
              <Text style={styles.bannerBody}>{errorMessage}</Text>
            </View>
            <Pressable onPress={resetFlow} style={styles.bannerBtnOutline}>
              <Text style={styles.bannerBtnOutlineText}>Dismiss</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Your name</Text>
        <TextInput
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Name on reservation"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="words"
          autoCorrect={false}
        />

        <Text style={styles.sectionLabel}>Checkout</Text>
        <Pressable
          onPress={() => runPayment("deposit")}
          disabled={phase === "preparing"}
          style={({ pressed }) => [
            styles.payPrimary,
            pressed && phase !== "preparing" && { opacity: 0.92 },
            phase === "preparing" && { opacity: 0.55 },
          ]}
        >
          <Text style={styles.payPrimaryText}>Pay deposit</Text>
          <Text style={styles.paySub}>{formatUsdFromCents(selected.depositCents)} hold</Text>
        </Pressable>

        <Pressable
          onPress={() => runPayment("full")}
          disabled={phase === "preparing"}
          style={({ pressed }) => [
            styles.paySecondary,
            pressed && phase !== "preparing" && { opacity: 0.92 },
            phase === "preparing" && { opacity: 0.55 },
          ]}
        >
          <Text style={styles.paySecondaryText}>Pay full amount</Text>
          <Text style={styles.paySubMuted}>{formatUsdFromCents(selected.fullCents)} total</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("BookOnline", { hideHeader: true })}
          style={styles.linkRow}
        >
          <Text style={styles.linkText}>Prefer the web scheduler?</Text>
          <Ionicons name="open-outline" size={18} color={colors.gold} />
        </Pressable>
      </ScrollView>

      {phase === "preparing" ? (
        <View style={styles.blocking}>
          <View style={styles.blockingCard}>
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={styles.blockingText}>Preparing secure checkout…</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    paddingTop: spacing.md,
  },
  sectionLabel: {
    color: colors.goldDim,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardActive: {
    borderColor: colors.gold,
    backgroundColor: colors.surface2,
  },
  cardPressed: { opacity: 0.95 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
    flex: 1,
  },
  cardDuration: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  cardDesc: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  priceDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  priceLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  priceValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  priceValueGold: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: "700",
  },
  selectedPill: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.gold,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  selectedPillText: {
    color: colors.bg,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  payPrimary: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  payPrimaryText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  paySecondary: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  paySecondaryText: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  paySub: {
    marginTop: 4,
    color: colors.bg,
    opacity: 0.85,
    fontSize: 13,
    fontWeight: "600",
  },
  paySubMuted: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing.md,
  },
  linkText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  bannerOk: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldDim,
    backgroundColor: colors.surface2,
    marginBottom: spacing.lg,
  },
  bannerErr: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#5c2a2a",
    backgroundColor: "#1a1010",
    marginBottom: spacing.lg,
  },
  bannerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  bannerBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  bannerBtn: {
    backgroundColor: colors.gold,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
  },
  bannerBtnText: {
    color: colors.bg,
    fontWeight: "800",
    fontSize: 13,
  },
  bannerBtnOutline: {
    borderWidth: 1,
    borderColor: colors.gold,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
  },
  bannerBtnOutlineText: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 13,
  },
  blocking: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,5,8,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  blockingCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl * 1.25,
    alignItems: "center",
    gap: spacing.md,
  },
  blockingText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
});
