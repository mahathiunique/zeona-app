import { StyleSheet, View } from 'react-native';
import { Flame } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../constants/theme';
import Text from './Text';
import Card from './Card';

interface StreakCardProps {
  streakCount: number;
}

export default function StreakCard({ streakCount }: StreakCardProps) {
  const { colors } = useTheme();

  return (
    <Card
      variant="flat"
      style={[styles.card, { backgroundColor: '#CCDDFD' }]} // Pastel Blue
    >
      <View style={styles.contentRow}>
        <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
          <Flame color="#F26C2A" size={24} fill="#F26C2A" />
        </View>
        <View style={styles.textContainer}>
          <Text variant="h3" color={colors.text}>
            {streakCount} {streakCount === 1 ? 'Day' : 'Days'}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            Current Activity Streak! Keep it up ✨
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
});
