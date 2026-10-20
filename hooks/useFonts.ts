/**
 * Zeona — useFonts hook
 * Loads Google Fonts via expo-font.
 */

import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display';
import { Ionicons } from '@expo/vector-icons';

export function useZeonaFonts() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    DMSans_400Regular,
    DMSans_500Medium,
    // Alias for SemiBold (DM Sans doesn't have 600 in the package; use 500 + bold weight)
    DMSans_600SemiBold: DMSans_500Medium,
    DMSans_700Bold,
    Playfair_400Regular:           PlayfairDisplay_400Regular,
    Playfair_700Bold:              PlayfairDisplay_700Bold,
    Playfair_400Regular_Italic:    PlayfairDisplay_400Regular_Italic,
  });

  return { fontsLoaded, fontError };
}

