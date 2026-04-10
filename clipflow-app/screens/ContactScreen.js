import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ClipFlowHeader from '../components/ClipFlowHeader';
import { CONTACT } from '../config/appConstants';
import { colors, radius } from '../theme';

async function openLink(url, label) {
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  } else {
    Alert.alert('Unable to open', `This link could not be opened on your device.`);
  }
}

export default function ContactScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ClipFlowHeader />

      <View style={styles.body}>
        <Text style={styles.subtitle}>Reach {CONTACT.BUSINESS_NAME}</Text>

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          onPress={() => openLink(`tel:${CONTACT.PHONE_E164}`, 'phone')}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="call" size={22} color={colors.gold} />
          </View>
          <View style={styles.btnTextWrap}>
            <Text style={styles.btnTitle}>Call</Text>
            <Text style={styles.btnHint}>{CONTACT.PHONE_DISPLAY}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          onPress={() => openLink(`mailto:${CONTACT.EMAIL}`, 'email')}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="mail" size={22} color={colors.gold} />
          </View>
          <View style={styles.btnTextWrap}>
            <Text style={styles.btnTitle}>Email</Text>
            <Text style={styles.btnHint}>{CONTACT.EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          onPress={() => {
            const root = navigation.getParent()?.getParent();
            if (root) {
              root.navigate('SignUp');
            } else {
              navigation.navigate('SignUp');
            }
          }}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="person-add-outline" size={22} color={colors.gold} />
          </View>
          <View style={styles.btnTextWrap}>
            <Text style={styles.btnTitle}>Create account</Text>
            <Text style={styles.btnHint}>Sign up with email</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          onPress={() => openLink(CONTACT.INSTAGRAM_URL, 'Instagram')}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="logo-instagram" size={22} color={colors.gold} />
          </View>
          <View style={styles.btnTextWrap}>
            <Text style={styles.btnTitle}>Instagram</Text>
            <Text style={styles.btnHint}>{CONTACT.INSTAGRAM_SUBTITLE}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.legalBtn, pressed && styles.pressed]}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        >
          <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
          <Text style={styles.legalText}>Privacy policy</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    padding: 20,
    gap: 14,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    marginBottom: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  btnTextWrap: {
    flex: 1,
  },
  btnTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  btnHint: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  legalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 10,
  },
  legalText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
});
