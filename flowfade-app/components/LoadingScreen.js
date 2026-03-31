import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../constants/theme';

/**
 * Full-screen branded loader shown right after the native splash hides.
 * Calls onFinish() once after a short delay so the first paint feels intentional.
 */
export default function LoadingScreen({ onFinish }) {
  useEffect(() => {
    const id = setTimeout(() => {
      onFinish();
    }, 1600);
    return () => clearTimeout(id);
  }, [onFinish]);

  return (
    <View style={styles.root}>
      <Text style={styles.wordmark}>Flowfade</Text>
      <Text style={styles.tagline}>Smooth transitions. Bold presence.</Text>
      <ActivityIndicator size="large" color={colors.accent} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  wordmark: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  tagline: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  spinner: {
    marginTop: spacing.xl,
  },
});
