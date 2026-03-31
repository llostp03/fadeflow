import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  PRICING_URL,
  SERVICES_URL,
  WEBSITE_URL,
} from '../constants/config';
import { colors, radius, spacing } from '../constants/theme';

/**
 * Marketing home: wordmark plus four actions. “Contact” opens native
 * call/email choices; the others jump to the Book tab with a WebView URL.
 */
export default function HomeScreen() {
  const navigation = useNavigation();

  const openContactOptions = () => {
    Alert.alert('Contact Flowfade', 'How would you like to reach us?', [
      {
        text: 'Call',
        onPress: () => Linking.openURL(`tel:${CONTACT_PHONE}`),
      },
      {
        text: 'Email',
        onPress: () => Linking.openURL(`mailto:${CONTACT_EMAIL}`),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const goBook = (url) => {
    navigation.navigate('Book', { url });
  };

  return (
    <LinearGradient
      colors={[colors.background, '#14141f', colors.background]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <View style={styles.logoMark}>
          <Text style={styles.logoLetters}>FF</Text>
        </View>
        <Text style={styles.title}>Flowfade</Text>
        <Text style={styles.subtitle}>Dark, modern, effortless.</Text>

        <View style={styles.actions}>
          <ActionButton label="Book Now" onPress={() => goBook(WEBSITE_URL)} />
          <ActionButton label="Services" onPress={() => goBook(SERVICES_URL)} />
          <ActionButton label="Pricing" onPress={() => goBook(PRICING_URL)} />
          <ActionButton label="Contact" onPress={openContactOptions} variant="outline" />
        </View>
      </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function ActionButton({ label, onPress, variant }) {
  const isOutline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isOutline ? styles.buttonOutline : styles.buttonSolid,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonLabel, isOutline && styles.buttonLabelOutline]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  logoMark: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoLetters: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.background,
    letterSpacing: -0.5,
  },
  title: {
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 1,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 16,
  },
  actions: {
    marginTop: spacing.xl * 1.5,
    gap: spacing.md,
  },
  button: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonSolid: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderColor: colors.accent,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonLabelOutline: {
    color: colors.accent,
  },
});
