import { StyleSheet, Platform, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, BookOpen, Plus, Calendar, User } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Spacing, Shadows } from '../../constants/theme';

export default function MainLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: Spacing.sm,
          paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
          ...Shadows.soft,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarButton: ({ onPress, accessibilityState }) => (
            <Pressable
              onPress={onPress}
              accessibilityState={accessibilityState}
              style={[
                styles.createTabButton,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.background,
                  ...Shadows.medium,
                },
              ]}
            >
              <Plus color="#1E1C1A" size={28} strokeWidth={2.5} />
            </Pressable>
          ),
        }}
      />
      
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />

      {/* Hidden nested stacks */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // This hides settings from the bottom tab bar completely
        }}
      />
      
      <Tabs.Screen
        name="notifications"
        options={{
          href: null, // Hides notifications from bottom tab bar
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createTabButton: {
    top: Platform.OS === 'ios' ? -18 : -14,
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    marginHorizontal: Spacing.md,
  },
});
