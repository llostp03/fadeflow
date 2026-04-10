import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { login as loginWithEmail } from '../api/login';
import { fetchCurrentUser } from '../api/me';

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

  const handleLogin = async () => {
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
      const data = await loginWithEmail({ email: trimmedEmail, password: trimmedPassword });
      console.log('LOGIN OK', { data });

      const id = data?.user?.id;
      if (typeof id !== 'number' || id < 1) {
        throw new Error('No user ID returned from login.');
      }
      console.log('LOGIN USER ID', id);

      const profile = await fetchCurrentUser(id);
      console.log('PROFILE OK', profile);

      if (!profile || typeof profile.id !== 'number') {
        throw new Error('Could not load your account profile.');
      }

      await setUser(profile);

      const sub = String(profile.subscription_status || '').trim().toLowerCase();
      console.log('SUB STATUS', sub);

      if (sub === 'active') {
        navigation.replace('Home');
      } else {
        navigation.replace('Paywall');
      }
    } catch (err) {
      console.error('LOGIN FLOW ERROR', err);
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
      console.error('LOGIN FLOW ERROR', err);
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
});
