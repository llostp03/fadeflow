import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CONTACT, PRIVACY_POLICY_WEB_URL } from '../config/appConstants';
import { colors, radius } from '../theme';

const SECTIONS = [
  {
    title: 'Overview',
    body:
      'This policy describes how ClipFlow (“we”, “us”) handles information when you use our mobile application. We designed the app to minimize data collection and to use trusted providers for payments.',
  },
  {
    title: 'Information we collect',
    body:
      'When you book a service, we process the details you enter (such as name, preferred date and time, and service selection) and payment information handled securely by Stripe. We may also collect basic technical data needed to run the app (such as device type and app version) through standard platform services.',
  },
  {
    title: 'How we use information',
    body:
      'We use booking and payment information to schedule services, process payments, communicate with you about your appointment, and improve reliability and support. We do not sell your personal information.',
  },
  {
    title: 'Payments',
    body:
      'Payments are processed by Stripe. Card data is collected through Stripe’s interfaces and subject to Stripe’s privacy policy and security practices. We do not store full card numbers on our servers.',
  },
  {
    title: 'Contact',
    body:
      `Questions about this policy may be sent to ${CONTACT.EMAIL}.`,
  },
];

/**
 * In-app Privacy Policy. Optionally link to a hosted full policy URL via PRIVACY_POLICY_WEB_URL / env.
 */
export default function PrivacyPolicyScreen({ navigation }) {
  async function openHosted() {
    if (!PRIVACY_POLICY_WEB_URL) return;
    const ok = await Linking.canOpenURL(PRIVACY_POLICY_WEB_URL);
    if (ok) await Linking.openURL(PRIVACY_POLICY_WEB_URL);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={28} color={colors.gold} />
        </Pressable>
        <Text style={styles.topTitle}>Privacy policy</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Last updated: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        {PRIVACY_POLICY_WEB_URL ? (
          <Pressable
            style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
            onPress={openHosted}
          >
            <Text style={styles.linkBtnText}>Open full policy in browser</Text>
            <Ionicons name="open-outline" size={18} color={colors.gold} />
          </Pressable>
        ) : null}

        <Text style={styles.disclaimer}>
          This summary is provided for convenience. Consult a qualified professional to ensure it meets your legal obligations before app store submission.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  lead: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 20,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 20,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  linkBtnText: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  pressed: {
    opacity: 0.85,
  },
});
