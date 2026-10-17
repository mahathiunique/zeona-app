import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../constants/theme';
import Text from '../../components/common/Text';
import Card from '../../components/common/Card';

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  // Hardcoded mockup notifications for V1
  const mockNotifications = [
    {
      id: '1',
      title: 'Time for your Evening Wind Down 🌙',
      body: 'Take 5 minutes to relax with breathing exercises or cozy stories before sleeping.',
      time: '2 hours ago',
      unread: true,
    },
    {
      id: '2',
      title: 'Habit check-in: Hydration 💧',
      body: 'Did you drink enough water today? Update your progress now.',
      time: '6 hours ago',
      unread: false,
    },
    {
      id: '3',
      title: 'A new day begins! ☀️',
      body: 'Good morning! Write down today’s priorities and keep up your 4-day streak.',
      time: '14 hours ago',
      unread: false,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft color={colors.text} size={24} />
        </Pressable>
        <Text variant="h2" style={styles.headerTitle}>
          Notifications
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {mockNotifications.length > 0 ? (
          <View style={styles.notificationsList}>
            {mockNotifications.map((notif) => (
              <Card
                key={notif.id}
                variant="flat"
                style={[
                  styles.notifCard,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: notif.unread ? colors.primaryLight : colors.border,
                  },
                ]}
              >
                <View style={styles.notifHeader}>
                  <View style={styles.titleRow}>
                    {notif.unread && (
                      <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                    )}
                    <Text variant="subtitle" style={styles.notifTitle}>
                      {notif.title}
                    </Text>
                  </View>
                  <Text variant="caption" color={colors.textSecondary}>
                    {notif.time}
                  </Text>
                </View>
                <Text variant="body" color={colors.textSecondary} style={styles.notifBody}>
                  {notif.body}
                </Text>
              </Card>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Bell size={48} color={colors.textSecondary} style={styles.emptyIcon} />
            <Text variant="subtitle" align="center" color={colors.textSecondary}>
              All caught up! No new notifications.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    minHeight: 40,
    width: 40,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '800',
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
  },
  notificationsList: {
    gap: Spacing.md,
  },
  notifCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
    gap: Spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.round,
  },
  notifTitle: {
    fontWeight: '700',
    flex: 1,
  },
  notifBody: {
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyIcon: {
    opacity: 0.5,
  },
});
