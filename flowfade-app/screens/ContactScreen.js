import * as Linking from 'expo-linking';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CONTACT_EMAIL, CONTACT_PHONE } from '../constants/config';
import { colors, radius, spacing } from '../constants/theme';

/**
 * Dedicated Contact tab: same phone/email as Home, with explicit tap targets
 * plus an Alert fallback matching the Home “Contact” flow.
 */
export default function ContactScreen() {
  const call = () => Linking.openURL(`tel:${CONTACT_PHONE}`);
  const email = () => Linking.openURL(`mailto:${CONTACT_EMAIL}`);

  const choose = () => {
    Alert.alert('Contact Flowfade', 'Pick a channel', [
      { text: 'Call', onPress: call },
      { text: 'Email', onPress: email },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.card}>
        <Text style={styles.heading}>Let’s talk</Text>
        <Text style={styles.body}>
          Tap below to call or email. You can also use the shortcut button for both options in
          one sheet.
        </Text>
        <Pressable onPress={call} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Text style={styles.rowLabel}>Phone</Text>
          <Text style={styles.rowValue}>{CONTACT_PHONE}</Text>
        </Pressable>
        <Pressable onPress={email} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{CONTACT_EMAIL}</Text>
        </Pressable>
        <Pressable
          onPress={choose}
          style={({ pressed }) => [styles.sheetButton, pressed && styles.pressed]}
        >
          <Text style={styles.sheetLabel}>Phone or email…</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.88 },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  sheetButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
  },
  sheetLabel: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 16,
  },
});
