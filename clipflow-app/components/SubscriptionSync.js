import React, { useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { fetchCurrentUser } from '../api/me';

/**
 * When an email-linked account is signed in, refetch GET /me on app foreground so
 * subscription_status stays in sync after Stripe Checkout / webhooks (renewals, past_due, etc.).
 * Does not run for guest / barber-demo sessions (user == null).
 */
export default function SubscriptionSync() {
  const { user, setUser, ready } = useAuth();

  const refetch = useCallback(async () => {
    if (!user?.id) return;
    try {
      const next = await fetchCurrentUser(user.id);
      await setUser(next);
    } catch {
      /* offline or stale token — ignore */
    }
  }, [user, setUser]);

  useEffect(() => {
    if (!ready) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refetch();
      }
    });
    return () => sub.remove();
  }, [ready, refetch]);

  return null;
}
