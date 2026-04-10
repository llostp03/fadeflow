import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius } from '../theme';

/**
 * Login UI — wire POST /login on the API when you add JWT/session support.
 */
export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    Alert.alert(
      'Coming soon',
      'Server login is not enabled yet. Use Sign up to create an account, or book from the Book tab.'
    );
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
        <Text style={styles.topTitle}>Log in</Text>
        <View style={styles.backSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <Pressable
            onPress={handleLogin}
            style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
          >
            <Text style={styles.submitText}>Log in</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.replace('SignUp')}
            style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
          >
            <Text style={styles.linkText}>Create an account</Text>
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
  submitText: { color: '#000', fontSize: 17, fontWeight: 'bold' },
  linkBtn: { marginTop: 20, alignItems: 'center', padding: 12 },
  linkText: { color: colors.gold, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.88 },
});
