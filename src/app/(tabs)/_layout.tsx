import { Tabs } from 'expo-router/js-tabs';
import { Platform } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color, focused }: { color: unknown; focused: boolean }) => (
    <Icon name={icon} size={24} color={String(color)} strokeWidth={focused ? 2.3 : 1.8} />
  ),
});

export default function TabsLayout() {
  // Screens here need a profile; the root auth gate redirects everyone else.
  const { status } = useAuth();
  if (status !== 'ready') return null;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: Platform.OS === 'ios' ? 88 : 66,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
        sceneStyle: { backgroundColor: Colors.bg },
        animation: 'shift',
      }}>
      <Tabs.Screen name="index" options={tab('Home', 'home')} />
      <Tabs.Screen name="activity" options={tab('Activity', 'activity')} />
      <Tabs.Screen name="challenges" options={tab('Challenges', 'challenges')} />
      <Tabs.Screen name="community" options={tab('Community', 'community')} />
      <Tabs.Screen name="profile" options={tab('Profile', 'profile')} />
    </Tabs>
  );
}
