import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { login } from '../api/login';
import { fetchCurrentUser } from '../api/me';
import { useAuth } from '../context/AuthContext';

const EMAIL_LIKE = /\S+@\S+\.\S+/;

export default function LoginScreen({ navigation }) {
  const { setUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      Alert.alert('Missing info', 'Enter email (or barber username) and password.');
      return;
    }

    if (EMAIL_LIKE.test(cleanUsername)) {
      setLoading(true);
      try {
        const data = await login({ email: cleanUsername, password: cleanPassword });
        let profile = data.user;
        if (data.user && typeof data.user.id === 'number') {
          try {
            profile = await fetchCurrentUser(data.user.id);
          } catch {
            profile = data.user;
          }
          await setUser(profile);
        }
        const active = profile?.subscription_status === 'active';
        Alert.alert('Success', 'Logged in successfully.', [
          {
            text: 'OK',
            onPress: () => navigation.replace(active ? 'Home' : 'Paywall'),
          },
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Try again.';
        Alert.alert('Login failed', msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (cleanUsername === 'admin' && cleanPassword === 'fadeflow123') {
      await setUser(null);
      Alert.alert('Success', 'Logged in successfully.', [
        { text: 'OK', onPress: () => navigation.replace('Home') },
      ]);
      return;
    }

    Alert.alert('Login failed', 'Invalid username or password.');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 20 }}>Barber Login</Text>
      <Text style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
        Use your email to sign in for ClipFlow Pro. Or use admin / fadeflow123 for barber demo.
      </Text>

      <TextInput
        placeholder="Email or admin"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
        }}
      />

      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={{
          backgroundColor: '#111',
          padding: 14,
          borderRadius: 8,
          alignItems: 'center',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Log In</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
