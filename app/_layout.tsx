import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

function TabIcon({ name, label, focused }: { name: any; label: string; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Ionicons name={name} size={22} color={focused ? '#4F8EF7' : '#9BA3BF'} />
      <Text style={[styles.label, focused && styles.labelFocused]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function Layout() {
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem('userMode').then(val => {
      setChecked(true);
      if (!val) setTimeout(() => router.replace('/onboarding'), 0);
    });
  }, []);

  if (!checked) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F8EF7',
        tabBarInactiveTintColor: '#9BA3BF',
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <TabIcon name="location" label="정류장찾기" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <TabIcon name="star" label="즐겨찾기" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <TabIcon name="git-branch" label="경로" focused={focused} />,
        }}
      />
      <Tabs.Screen name="voice"      options={{ href: null }} />
      <Tabs.Screen name="boarding"   options={{ href: null }} />
      <Tabs.Screen name="riding"     options={{ href: null }} />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="route-map"  options={{ href: null }} />
      <Tabs.Screen name="businfo"    options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    elevation: 24,
    shadowColor: '#1A1F36',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    height: 84,
    paddingBottom: 16,
    paddingTop: 8,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 18,
    gap: 2,
    minWidth: 60,
  },
  iconWrapFocused: { backgroundColor: '#EBF2FF' },
  emoji: { fontSize: 22 },
  label: { fontSize: 9, fontWeight: '600', color: '#9BA3BF' },
  labelFocused: { color: '#4F8EF7' },
});
