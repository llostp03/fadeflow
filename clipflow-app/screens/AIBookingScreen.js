import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { submitAIAppointmentDraft } from '../api/aiBooking';

const SERVICES = ['Cut & style', 'Fade & line-up', 'Beard trim', 'The works'];
const BARBERS = ['Any available', 'Alex', 'Jordan', 'Sam'];

function navigateRootBack(navigation) {
  if (navigation.canGoBack?.()) {
    navigation.goBack();
    return;
  }
  let nav = navigation;
  while (nav.getParent?.()) {
    nav = nav.getParent();
  }
  nav.navigate('Home');
}

export default function AIBookingScreen({ navigation }) {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([
    {
      role: 'ai',
      text: 'Welcome to ClipFlow. Tell me what you want (cut, fade, beard, lineup), then fill in your details below so we can save your appointment for the shop.',
    },
  ]);

  const [draft, setDraft] = useState({
    clientName: '',
    service: SERVICES[0],
    barberName: BARBERS[0],
    preferredDate: '',
    preferredTime: '',
  });

  const updateDraft = useCallback((key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  const conversationSummary = useCallback(() => {
    return chat
      .filter((m) => m.role === 'user' || m.role === 'ai')
      .slice(-8)
      .map((m) => `${m.role === 'user' ? 'Client' : 'Assistant'}: ${m.text}`);
  }, [chat]);

  const handleSend = () => {
    if (!message.trim()) return;

    const userMessage = { role: 'user', text: message.trim() };
    let aiReply = {
      role: 'ai',
      text: 'Got it. Add your name, date, and time below, then tap Confirm booking when you are ready.',
    };

    const lower = message.toLowerCase();

    if (lower.includes('haircut') || lower.includes('cut')) {
      aiReply.text =
        'Haircut noted. Pick a service chip if you want to lock the type, then set date and time below.';
    } else if (lower.includes('beard')) {
      aiReply.text = 'Beard work noted. Choose barber and time below when you are ready.';
    } else if (lower.includes('line') || lower.includes('lineup')) {
      aiReply.text = 'Lineup noted. Confirm barber preference and slot below.';
    } else if (lower.includes('fade')) {
      aiReply.text = 'Fade noted. You can select Fade & line-up above and add your preferred time.';
    }

    setChat((prev) => [...prev, userMessage, aiReply]);
    setMessage('');
  };

  const handleConfirm = async () => {
    if (!draft.clientName.trim()) {
      Alert.alert('Name required', 'Please enter your name so the barber can find your booking.');
      return;
    }
    if (!draft.preferredDate.trim() || !draft.preferredTime.trim()) {
      Alert.alert('Date & time', 'Add a preferred date and time to complete the request.');
      return;
    }

    const payload = {
      clientName: draft.clientName.trim(),
      service: draft.service,
      barberName: draft.barberName,
      preferredDate: draft.preferredDate.trim(),
      preferredTime: draft.preferredTime.trim(),
      conversationSummary: conversationSummary(),
    };

    const result = await submitAIAppointmentDraft(payload);

    if (result.ok && result.confirmation) {
      Alert.alert('Booked', `Confirmation: ${result.confirmation}`, [
        { text: 'OK', onPress: () => navigateRootBack(navigation) },
      ]);
      return;
    }

    Alert.alert(
      'Almost there',
      result.error ||
        'We could not reach the server. Your details are prepared; connect the API when ready.',
      [{ text: 'OK' }],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>AI booking</Text>
          <Pressable
            onPress={() => navigateRootBack(navigation)}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>Chat</Text>
          <View style={styles.chatBox}>
            {chat.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.message,
                  item.role === 'user' ? styles.userMessage : styles.aiMessage,
                ]}
              >
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionLabel}>For the barber calendar</Text>
          <Text style={styles.hint}>
            These fields map directly to what we will POST when your `/ai-bookings` (or similar)
            route exists.
          </Text>

          <Text style={styles.fieldLabel}>Your name</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={colors.textMuted}
            value={draft.clientName}
            onChangeText={(t) => updateDraft('clientName', t)}
            autoComplete="name"
          />

          <Text style={styles.fieldLabel}>Service</Text>
          <View style={styles.chipRow}>
            {SERVICES.map((s) => {
              const selected = draft.service === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => updateDraft('service', s)}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Barber</Text>
          <View style={styles.chipRow}>
            {BARBERS.map((b) => {
              const selected = draft.barberName === b;
              return (
                <Pressable
                  key={b}
                  onPress={() => updateDraft('barberName', b)}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{b}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Preferred date</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Apr 12"
            placeholderTextColor={colors.textMuted}
            value={draft.preferredDate}
            onChangeText={(t) => updateDraft('preferredDate', t)}
          />

          <Text style={styles.fieldLabel}>Preferred time</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2:30 PM"
            placeholderTextColor={colors.textMuted}
            value={draft.preferredTime}
            onChangeText={(t) => updateDraft('preferredTime', t)}
          />

          <TextInput
            style={[styles.input, styles.chatInput]}
            placeholder="Message the assistant…"
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={handleSend}
          />

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={handleSend}
          >
            <Text style={styles.primaryBtnText}>Send</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressed]}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmBtnText}>Confirm booking</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.gold,
  },
  closeBtn: {
    padding: 8,
    marginRight: -8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  chatBox: {
    marginBottom: 20,
  },
  message: {
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 10,
    maxWidth: '88%',
  },
  userMessage: {
    backgroundColor: colors.goldMuted,
    borderWidth: 1,
    borderColor: colors.gold,
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  messageText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
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
    marginBottom: 14,
  },
  chatInput: {
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    borderColor: colors.gold,
    backgroundColor: colors.goldMuted,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.gold,
  },
  primaryBtn: {
    backgroundColor: colors.gold,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  confirmBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.88,
  },
});
