/**
 * Zeona — 404 Not Found
 */

import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ZText } from '@/components/ui';
import { colors } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <ZText variant="displayMedium" align="center">🌸</ZText>
        <ZText variant="headingLarge" color={colors.textPrimary} align="center">
          Page not found
        </ZText>
        <Link href="/" style={styles.link}>
          <ZText variant="bodyMedium" color={colors.primary}>Go to Home</ZText>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  link: { marginTop: 16 },
});
