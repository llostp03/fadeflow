import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { API_BASE } from '../config/appConstants';
import { colors, radius } from '../theme';

const EMAIL_REGEX = /\S+@\S+\.\S+/;

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignUp = async () => {
    try {
      const cleanEmail = email.trim();

      if (!cleanEmail || !password) {
        Alert.alert('Required', 'Email and password are required.');
        return;
      }

      if (!EMAIL_REGEX.test(cleanEmail)) {
        Alert.alert('Email', 'Enter a valid email.');
        return;
      }

      if (password.length < 8) {
        Alert.alert('Password', 'Password must be at least 8 characters.');
        return;
      }

      setSubmitting(true);

      const response = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          name: name?.trim() || '',
        }),
      });

      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { detail: text?.slice(0, 200) || `Server error (${response.status})` };
      }

      console.log('SIGNUP RESPONSE:', data);

      if (!response.ok) {
        const msg =
          (typeof data.detail === 'string' && data.detail) ||
          (typeof data.error === 'string' && data.error) ||
          'Signup failed';
        throw new Error(msg);
      }

      Alert.alert(
        'Success',
        'Account created successfully. Please log in.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } catch (error) {
      console.error('SIGNUP ERROR:', error);
      Alert.alert('Signup failed', error?.message || 'Could not create account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={28} color={colors.gold} />
        </Pressable>
        <Text style={styles.topTitle}>Create account</Text>
        <View style={styles.backSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.form}>
          <Text style={styles.label}>Name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            editable={!submitting}
            autoComplete="name"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            editable={!submitting}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 8 characters"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            editable={!submitting}
            secureTextEntry
            autoComplete="password-new"
          />

          <Pressable
            onPress={handleSignUp}
            disabled={submitting}
            style={({ pressed }) => [
              styles.submitBtn,
              submitting && styles.submitDisabled,
              pressed && !submitting && styles.pressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitText}>Sign up</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  backBtn: { padding: 8 },
  backSpacer: { width: 44 },
  topTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  form: { padding: 20, paddingTop: 8 },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
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
  submitBtn: {
    marginTop: 8,
    backgroundColor: colors.gold,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#000', fontSize: 17, fontWeight: 'bold' },
  pressed: { opacity: 0.88 },
});
