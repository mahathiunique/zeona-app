/**
 * Zeona — Tab navigator layout
 * Five tabs: Home, Journal, Create (+), Calendar, Profile
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '@/utils/haptics';

import { colors, radii, shadows, spacing, fontFamilies, fontSizes } from '@/constants/theme';
import { layout } from '@/constants/spacing';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  name: IconName;
  outlineName: IconName;
  focused: boolean;
  color: string;
  isCreate?: boolean;
}

function TabIcon({ name, outlineName, focused, color, isCreate }: TabIconProps) {
  if (isCreate) {
    return (
      <View style={styles.createButton}>
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </View>
    );
  }

  return (
    <Ionicons
      name={focused ? name : outlineName}
      size={24}
      color={color}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBackground,
          borderTopWidth: 0,
          height: layout.tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? spacing[2] : spacing[3],
          paddingTop: spacing[2],
          ...shadows.md,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamilies.sansMedium,
          fontSize: fontSizes.xs,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: spacing[1],
        },
      }}
      screenListeners={{
        tabPress: () => {
          triggerHaptic();
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name="home"
              outlineName="home-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name="book"
              outlineName="book-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name="add-circle"
              outlineName="add-circle-outline"
              focused={focused}
              color={color}
              isCreate
            />
          ),
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name="calendar"
              outlineName="calendar-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name="person"
              outlineName="person-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createButton: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
    ...shadows.md,
  },
});
