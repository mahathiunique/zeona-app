import { View, StyleSheet, ScrollView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Award, TrendingUp, Settings, Calendar, Heart } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../constants/theme';
import Text from '../../components/common/Text';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text variant="h2">My Journey</Text>
          <Pressable
            onPress={() => router.push('/(main)/settings')}
            style={styles.settingsIconButton}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Settings size={22} color={colors.text} />
          </Pressable>
        </View>
        
        {/* User Card */}
        <Card variant="flat" style={styles.profileCard}>
          <View style={styles.avatarPlaceholder}>
            <Text variant="h2" color="#1E1C1A">Z</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text variant="subtitle">Zeona Companion</Text>
            <Text variant="caption" color={colors.textSecondary}>Member since August 2026</Text>
          </View>
        </Card>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <Card variant="elevated" style={styles.statCard}>
            <TrendingUp size={20} color={colors.primaryDark} />
            <Text variant="h3" style={styles.statNumber}>5 Days</Text>
            <Text variant="caption" color={colors.textSecondary}>Daily Streak</Text>
          </Card>
          
          <Card variant="elevated" style={styles.statCard}>
            <Calendar size={20} color={colors.secondary} />
            <Text variant="h3" style={styles.statNumber}>12</Text>
            <Text variant="caption" color={colors.textSecondary}>Reflections</Text>
          </Card>
        </View>

        {/* Dynamic Achievements */}
        <View style={styles.section}>
          <Text variant="subtitle" style={styles.sectionTitle}>Achievements</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeScroll}>
            <Card variant="outlined" style={styles.badgeCard}>
              <Award size={24} color="#FFD54F" />
              <Text variant="caption" style={styles.badgeLabel}>Early Bird</Text>
            </Card>
            <Card variant="outlined" style={styles.badgeCard}>
              <Heart size={24} color={colors.accentPink} />
              <Text variant="caption" style={styles.badgeLabel}>Mindful</Text>
            </Card>
            <Card variant="outlined" style={styles.badgeCard}>
              <Award size={24} color={colors.primaryDark} />
              <Text variant="caption" style={styles.badgeLabel}>Organized</Text>
            </Card>
          </ScrollView>
        </View>

        {/* Insights Placeholder */}
        <View style={styles.section}>
          <Text variant="subtitle" style={styles.sectionTitle}>Personal Insights</Text>
          <Card variant="flat" style={[styles.insightCard, { backgroundColor: colors.accentYellow }]}>
            <Text variant="bodySecondary" color="#5C4D2E" style={styles.insightText}>
              🧠 Based on your entries this week, your mental energy is highest in the mornings after meditation. Keep up the great pattern!
            </Text>
          </Card>
        </View>

        {/* Settings Action Button */}
        <Button
          title="App Preferences"
          variant="outline"
          onPress={() => router.push('/(main)/settings')}
          style={styles.settingsButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsIconButton: {
    padding: Spacing.xs,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#CCDDFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileDetails: {
    marginLeft: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  statNumber: {
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  badgeScroll: {
    gap: Spacing.sm,
  },
  badgeCard: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  badgeLabel: {
    fontWeight: '600',
  },
  insightCard: {
    borderRadius: BorderRadius.md,
  },
  insightText: {
    lineHeight: 22,
  },
  settingsButton: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});
