import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe, PaymentSheetError } from '@stripe/stripe-react-native';
import ClipFlowHeader from '../components/ClipFlowHeader';
import { colors, radius } from '../theme';
import { STRIPE_PUBLISHABLE_KEY } from '../stripeConfig';
import { API_BASE } from '../config/appConstants';

const SERVICES = ['Cut & style', 'Fade & line-up', 'Beard trim', 'The works'];

function navigateToAIBooking(navigation) {
  let nav = navigation;
  while (nav.getParent?.()) {
    nav = nav.getParent();
  }
  nav.navigate('AIBooking');
}

function errorMessageFromBody(data, status) {
  if (data == null || typeof data !== 'object') {
    return `Something went wrong (${status}).`;
  }
  if (typeof data.detail === 'string') {
    return data.detail;
  }
  if (Array.isArray(data.detail)) {
    return data.detail.map((item) => item.msg || JSON.stringify(item)).join('\n');
  }
  if (typeof data.error === 'string') {
    return data.error;
  }
  if (data.message != null) {
    return String(data.message);
  }
  return `Something went wrong (${status}).`;
}

function paymentIntentIdFromClientSecret(clientSecret) {
  const marker = '_secret_';
  const i = clientSecret.indexOf(marker);
  if (i === -1) {
    return null;
  }
  return clientSecret.slice(0, i);
}

export default function BookScreen({ navigation }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [name, setName] = useState('');
  const [service, setService] = useState(SERVICES[0]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Processing payment…');

  async function onBook() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name to continue.');
      return;
    }

    if (Platform.OS === 'web') {
      Alert.alert(
        'Use the mobile app for card checkout',
        'Stripe Pay & book runs on the ClipFlow iOS and Android apps. You can still open AI booking to choose a service and time.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open AI booking',
            onPress: () => navigateToAIBooking(navigation),
          },
        ],
      );
      return;
    }

    setLoadingLabel('Processing payment…');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/create-payment-intent`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          service,
          date,
          time,
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        Alert.alert('Unable to start checkout', errorMessageFromBody(data, res.status));
        return;
      }

      if (!data.clientSecret || typeof data.clientSecret !== 'string') {
        Alert.alert('Unable to start checkout', 'Please try again in a moment.');
        return;
      }

      const clientSecret = data.clientSecret;

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'ClipFlow',
        defaultBillingDetails: {
          name: name.trim(),
        },
      });

      if (initError) {
        Alert.alert('Checkout', initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === PaymentSheetError.Canceled) {
          return;
        }
        Alert.alert('Payment', presentError.message);
        return;
      }

      const paymentIntentId = paymentIntentIdFromClientSecret(clientSecret);
      if (!paymentIntentId) {
        Alert.alert(
          'Booking',
          'We could not complete your booking record. If you were charged, contact us with your receipt.',
        );
        return;
      }

      setLoadingLabel('Confirming booking…');

      const bookRes = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          service,
          date,
          time,
          payment_intent_id: paymentIntentId,
        }),
      });

      let bookData = {};
      try {
        bookData = await bookRes.json();
      } catch {
        bookData = {};
      }

      if (!bookRes.ok) {
        Alert.alert(
          'Booking',
          `${errorMessageFromBody(bookData, bookRes.status)}\n\nIf a charge appears on your card, contact us for assistance.`,
        );
        return;
      }

      if (!bookData.confirmation) {
        Alert.alert('Booking', 'We could not confirm your booking. Please contact support.');
        return;
      }

      navigation.navigate('BookingConfirmed', { confirmation: bookData.confirmation });
    } catch (e) {
      Alert.alert(
        'Connection problem',
        e?.message ?? 'Check your internet connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ClipFlowHeader />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.lead}>
            Book with the in-app assistant — pick service, barber, and time without email.
          </Text>

          <Pressable
            disabled={submitting}
            onPress={() => navigateToAIBooking(navigation)}
            style={({ pressed }) => [
              styles.bookNowBtn,
              submitting && styles.bookNowBtnDisabled,
              pressed && !submitting && styles.pressed,
            ]}
          >
            <Text style={styles.bookNowBtnText}>Book Now</Text>
            <Text style={styles.bookNowSub}>Open full AI booking</Text>
          </Pressable>

          <View style={styles.dividerWrap}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or pay with card (classic)</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.label}>Your name</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            editable={!submitting}
            autoComplete="name"
          />

          <Text style={styles.label}>Service</Text>
          <View style={styles.serviceRow}>
            {SERVICES.map((s) => {
              const selected = service === s;
              return (
                <Pressable
                  key={s}
                  disabled={submitting}
                  onPress={() => setService(s)}
                  style={({ pressed }) => [
                    styles.serviceChip,
                    selected && styles.serviceChipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[styles.serviceChipText, selected && styles.serviceChipTextSelected]}
                  >
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Preferred date</Text>
          <TextInput
            style={styles.input}
            placeholder="Date"
            placeholderTextColor={colors.textMuted}
            value={date}
            onChangeText={setDate}
            editable={!submitting}
          />

          <Text style={styles.label}>Preferred time</Text>
          <TextInput
            style={styles.input}
            placeholder="Time"
            placeholderTextColor={colors.textMuted}
            value={time}
            onChangeText={setTime}
            editable={!submitting}
          />

          <Pressable
            onPress={onBook}
            disabled={submitting}
            style={({ pressed }) => [
              styles.bookBtn,
              submitting && styles.bookBtnDisabled,
              pressed && !submitting && styles.pressed,
            ]}
          >
            <Text style={styles.bookBtnText}>Pay & book</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {submitting && (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>{loadingLabel}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 32,
  },
  lead: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  bookNowBtn: {
    backgroundColor: colors.gold,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginBottom: 24,
  },
  bookNowBtnDisabled: {
    opacity: 0.55,
  },
  bookNowBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bookNowSub: {
    color: 'rgba(0,0,0,0.65)',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    marginBottom: 16,
  },
  serviceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  serviceChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceChipSelected: {
    borderColor: colors.gold,
    backgroundColor: colors.goldMuted,
  },
  serviceChipText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  serviceChipTextSelected: {
    color: colors.gold,
  },
  bookBtn: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  bookBtnDisabled: {
    opacity: 0.6,
  },
  bookBtnText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
