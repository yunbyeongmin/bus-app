import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

function TabIcon({ name, label, focused }: { name: any; label: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
      <Ionicons name={name} size={22} color={focused ? '#4F8EF7' : '#9BA3BF'} />
      <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
    </View>
  );
}

export default function Layout() {
  const [checked, setChecked] = useState(false);
  const [mode, setMode] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem('userMode').then(val => {
      setMode(val);
      setChecked(true);
      if (!val) {
        setTimeout(() => router.replace('/onboarding'), 0);
      }
    });
  }, []);

  if (!checked) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="index"      options={{ tabBarIcon: ({ focused }) => <TabIcon name="home"        label="홈"       focused={focused} /> }} />
      <Tabs.Screen name="map"        options={{ tabBarIcon: ({ focused }) => <TabIcon name="map"         label="지도"     focused={focused} /> }} />
      <Tabs.Screen name="favorites"  options={{ tabBarIcon: ({ focused }) => <TabIcon name="star"        label="즐겨찾기" focused={focused} /> }} />
      <Tabs.Screen name="voice"      options={{ tabBarIcon: ({ focused }) => <TabIcon name="volume-high" label="음성"     focused={focused} /> }} />
      <Tabs.Screen name="boarding"   options={{ href: null }} />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
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
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 18,
    gap: 2,
  },
  iconWrapFocused: { backgroundColor: '#EBF2FF' },
  emoji: { fontSize: 22 },
  label: { fontSize: 10, fontWeight: '600', color: '#9BA3BF' },
  labelFocused: { color: '#4F8EF7' },
});