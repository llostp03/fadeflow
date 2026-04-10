import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/appConstants';
import { fetchCurrentUser } from '../api/me';
import { colors } from '../theme';

const DEMO_EMAIL = 'admin';
const DEMO_PASSWORD = 'fadeflow123';

function loginErrorMessage(err) {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return 'Could not sign in and load your barber account.';
}

export default function LoginScreen() {
  const navigation = useNavigation();
  const { setUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault?.();

    if (loading) {
      return;
    }

    const trimmedEmail = (email || '').trim();
    const trimmedPassword = (password || '').trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Missing credentials', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
        }),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { detail: text?.slice(0, 200) || `Request failed (${res.status})` };
      }
      if (!res.ok) {
        const msg =
          (typeof data.detail === 'string' && data.detail) ||
          (typeof data.error === 'string' && data.error) ||
          `Login failed (${res.status})`;
        throw new Error(msg);
      }

      const id = data?.user?.id;
      if (typeof id !== 'number' || id < 1) {
        throw new Error('No user ID returned from login.');
      }
      const profile = await fetchCurrentUser(id);

      if (!profile || typeof profile.id !== 'number') {
        throw new Error('Could not load your account profile.');
      }

      await setUser(profile);

      const sub = String(profile.subscription_status || '').trim().toLowerCase();

      if (sub === 'active') {
        navigation.replace('Home');
      } else {
        navigation.replace('Paywall');
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('Login failed', err);
      }
      Alert.alert('Login failed', loginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdmin = async () => {
    if (loading) {
      return;
    }

    const trimmedEmail = (email || '').trim();
    const trimmedPassword = (password || '').trim();

    if (trimmedEmail !== DEMO_EMAIL || trimmedPassword !== DEMO_PASSWORD) {
      Alert.alert(
        'Demo credentials',
        `Enter email "${DEMO_EMAIL}" and password "${DEMO_PASSWORD}" to use the demo.`,
      );
      return;
    }

    setLoading(true);
    try {
      await setUser(null);
      navigation.replace('Home');
    } catch (err) {
      if (__DEV__) {
        console.warn('Demo barber failed', err);
      }
      Alert.alert('Demo failed', loginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.hint}>Enter your barber account email and password</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        editable={!loading}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        editable={!loading}
      />

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <>
          <Button title="Log in" onPress={handleLogin} />
          <View style={styles.spacer} />
          <Button title="Barber demo" onPress={handleDemoAdmin} />
          <Pressable
            onPress={() => navigation.navigate('SignUp')}
            style={({ pressed }) => [styles.signUpLink, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.signUpLinkText}>New barber? Create an account</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  hint: { fontSize: 14, color: '#666', marginBottom: 16, textAlign: 'center' },
  input: { height: 48, borderColor: '#ccc', borderWidth: 1, marginBottom: 12, paddingHorizontal: 8 },
  spacer: { height: 12 },
  signUpLink: { marginTop: 24, alignItems: 'center', paddingVertical: 8 },
  signUpLinkText: { color: colors.gold, fontSize: 15, fontWeight: '600' },
});
