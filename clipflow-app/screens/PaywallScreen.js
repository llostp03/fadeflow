import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, radius } from '../theme';
import { createSubscriptionCheckoutSession } from '../api/createCheckoutSession';
import { fetchCurrentUser } from '../api/me';

export default function PaywallScreen() {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const next = await fetchCurrentUser(user.id);
      await setUser(next);
    } catch {
      /* ignore network errors on silent refresh */
    }
  }, [user, setUser]);

  useFocusEffect(
    useCallback(() => {
      refreshStatus();
    }, [refreshStatus]),
  );

  const handleSubscribe = async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      const url = await createSubscriptionCheckoutSession(String(user.id));
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to open', 'Checkout could not be opened on this device.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      Alert.alert('Subscription checkout', message);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    await setUser(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <Ionicons name="lock-closed-outline" size={56} color={colors.gold} style={styles.icon} />
        <Text style={styles.title}>ClipFlow Pro</Text>
        <Text style={styles.body}>
          Your barber account needs an active ClipFlow Pro subscription. After paying in the browser,
          return here — we refresh when you come back. Client one-time bookings use Payment Sheet and
          do not require this plan.
        </Text>

        <TouchableOpacity
          style={[styles.primary, busy && styles.primaryDisabled]}
          onPress={handleSubscribe}
          disabled={busy}
          activeOpacity={0.88}
        >
          {busy ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryText}>Upgrade to ClipFlow Pro</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={refreshStatus} disabled={busy}>
          <Text style={styles.secondaryText}>I completed checkout — refresh status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tertiary} onPress={handleSignOut}>
          <Text style={styles.tertiaryText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: colors.gold,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },
  body: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  primary: {
    backgroundColor: colors.gold,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryDisabled: {
    opacity: 0.65,
  },
  primaryText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
  },
  secondary: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryText: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '700',
  },
  tertiary: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  tertiaryText: {
    color: colors.textMuted,
    fontSize: 15,
  },
});
