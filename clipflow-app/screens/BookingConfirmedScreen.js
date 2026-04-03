import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ClipFlowHeader from '../components/ClipFlowHeader';
import { colors, radius } from '../theme';

/**
 * Full-screen confirmation after payment and server booking save.
 * Params: { confirmation: { booking_id, name, service, date, time, payment_status, message } }
 */
export default function BookingConfirmedScreen({ route, navigation }) {
  const confirmation = route.params?.confirmation;

  if (!confirmation) {
    navigation.popToTop();
    return null;
  }

  const dateLabel = confirmation.date?.trim() ? confirmation.date : 'To be scheduled';
  const timeLabel = confirmation.time?.trim() ? confirmation.time : 'To be scheduled';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ClipFlowHeader />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={64} color={colors.gold} />
          </View>
          <Text style={styles.title}>Booking confirmed</Text>
          <Text style={styles.subtitle}>{confirmation.message}</Text>
        </View>

        <View style={styles.card}>
          <Row label="Name" value={confirmation.name} />
          <Row label="Service" value={confirmation.service} />
          <Row label="Date" value={dateLabel} />
          <Row label="Time" value={timeLabel} />
          <Row label="Payment" value={confirmation.payment_status} />
          {confirmation.booking_id != null && (
            <Text style={styles.ref}>Reference #{confirmation.booking_id}</Text>
          )}
        </View>

        <Text style={styles.footerNote}>
          We will follow up to confirm your appointment. Keep this reference for your records.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={() => navigation.popToTop()}
        >
          <Text style={styles.primaryBtnText}>Back to booking</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconWrap: {
    marginBottom: 12,
  },
  title: {
    color: colors.gold,
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 20,
  },
  row: {
    marginBottom: 16,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  rowValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  ref: {
    marginTop: 4,
    color: colors.gold,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerNote: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.gold,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 17,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.9,
  },
});
