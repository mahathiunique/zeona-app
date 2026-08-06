import { View, StyleSheet, ScrollView, Alert, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Shield, Bell, Moon, BookOpen, Database, HelpCircle, LogOut, ChevronRight, Info } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../constants/theme';
import { AuthService } from '../../services/firebase/auth';
import Text from '../../components/common/Text';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, setTheme } = useTheme();

  const handleLogout = () => {
    // Rule 17: Destructive operations require confirmation
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of Zeona? Your offline data remains safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.signOut();
              // Redirect will happen automatically in RootLayout
            } catch (error) {
              Alert.alert('Logout Failed', (error as Error).message);
            }
          },
        },
      ]
    );
  };

  const handleToggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const settingsGroups = [
    {
      title: 'Preferences',
      items: [
        {
          label: 'Account Settings',
          icon: <User size={20} color={colors.textSecondary} />,
          action: () => {},
        },
        {
          label: 'Theme Mode',
          icon: <Moon size={20} color={colors.textSecondary} />,
          rightElement: <Text variant="caption" color={colors.primaryDark}>{isDark ? 'Dark' : 'Light'}</Text>,
          action: handleToggleTheme,
        },
        {
          label: 'Notifications',
          icon: <Bell size={20} color={colors.textSecondary} />,
          action: () => {},
        },
        {
          label: 'Journal preferences',
          icon: <BookOpen size={20} color={colors.textSecondary} />,
          action: () => {},
        },
      ],
    },
    {
      title: 'Privacy & Data',
      items: [
        {
          label: 'Privacy Policy',
          icon: <Shield size={20} color={colors.textSecondary} />,
          action: () => {},
        },
        {
          label: 'Export Data',
          icon: <Database size={20} color={colors.textSecondary} />,
          action: () => {},
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          label: 'Help & Support',
          icon: <HelpCircle size={20} color={colors.textSecondary} />,
          action: () => {},
        },
        {
          label: 'About Zeona',
          icon: <Info size={20} color={colors.textSecondary} />,
          action: () => {},
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Button
          title="Back"
          variant="ghost"
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <Text variant="h2" style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {settingsGroups.map((group, gIdx) => (
          <View key={gIdx} style={styles.groupSection}>
            <Text variant="caption" color={colors.textMuted} style={styles.groupTitle}>
              {group.title.toUpperCase()}
            </Text>
            <Card variant="elevated" style={styles.groupCard}>
              {group.items.map((item, iIdx) => (
                <View key={iIdx}>
                  <Pressable
                    onPress={item.action}
                    style={styles.itemRow}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    <View style={styles.itemLeft}>
                      {item.icon}
                      <Text variant="bodySecondary" style={styles.itemLabel}>
                        {item.label}
                      </Text>
                    </View>
                    <View style={styles.itemRight}>
                      {item.rightElement}
                      <ChevronRight size={18} color={colors.textMuted} />
                    </View>
                  </Pressable>
                  {iIdx < group.items.length - 1 && (
                    <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        ))}

        {/* Logout Button */}
        <Button
          title="Log Out"
          variant="outline"
          icon={<LogOut size={18} color={colors.error} />}
          onPress={handleLogout}
          style={[styles.logoutButton, { borderColor: colors.error }]}
          accessibilityLabel="Log out of application"
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backButton: {
    minHeight: 40,
    height: 40,
    paddingVertical: 0,
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    marginLeft: Spacing.md,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  groupSection: {
    marginBottom: Spacing.xl,
  },
  groupTitle: {
    fontWeight: '700',
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  groupCard: {
    padding: 0,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  itemLabel: {
    fontWeight: '500',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  itemDivider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  logoutButton: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
});
