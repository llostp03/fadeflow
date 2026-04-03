import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

/**
 * Same ClipFlow title bar you had before — reused on every tab.
 */
export default function ClipFlowHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.logo}>ClipFlow</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: 'bold',
  },
});
