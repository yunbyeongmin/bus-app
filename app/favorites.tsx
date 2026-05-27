import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getBusArrival } from '../api';

const C = {
  blue: '#4F8EF7', blueSoft: '#EBF2FF',
  green: '#2ECC8A', greenSoft: '#E5FBF3',
  purple: '#A259FF', purpleSoft: '#F3EBFF',
  dark: '#1A1F36', gray: '#9BA3BF', bg: '#F0F4FF', white: '#FFFFFF',
};

export default function FavoritesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'station' | 'bus'>('station');
  const [favStations, setFavStations] = useState<any[]>([]);
  const [favBuses, setFavBuses] = useState<any[]>([]);
  const [busArrivals, setBusArrivals] = useState<Record<string, any[]>>({});

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const stations = await AsyncStorage.getItem('favStations');
    const buses = await AsyncStorage.getItem('favBuses');
    if (stations) setFavStations(JSON.parse(stations));
    if (buses) setFavBuses(JSON.parse(buses));
  };

  useEffect(() => {
    if (tab === 'station' && favStations.length > 0) {
      favStations.forEach(async (s) => {
        const data = await getBusArrival(s.stationId);
        setBusArrivals(prev => ({ ...prev, [s.stationId]: data.filter((b: any) => b.predictTime1 !== '') }));
      });
    }
  }, [tab, favStations]);

  const removeStation = async (stationId: string) => {
    const updated = favStations.filter(s => s.stationId !== stationId);
    setFavStations(updated);
    await AsyncStorage.setItem('favStations', JSON.stringify(updated));
  };

  const removeBus = async (routeId: string) => {
    const updated = favBuses.filter(b => b.routeId !== routeId);
    setFavBuses(updated);
    await AsyncStorage.setItem('favBuses', JSON.stringify(updated));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>즐겨찾기</Text>
      </View>

      {/* 탭 */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'station' && styles.tabBtnActive]}
          onPress={() => setTab('station')}
        >
          <Text style={[styles.tabText, tab === 'station' && styles.tabTextActive]}>정류장</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'bus' && styles.tabBtnActive]}
          onPress={() => setTab('bus')}
        >
          <Text style={[styles.tabText, tab === 'bus' && styles.tabTextActive]}>버스</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'station' ? (
          <View style={styles.content}>
            {favStations.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="location-outline" size={40} color={C.gray} />
                <Text style={styles.emptyText}>즐겨찾기한 정류장이 없어요</Text>
                <Text style={styles.emptySubText}>정류장 검색에서 별표를 눌러 추가해보세요</Text>
              </View>
            ) : (
              favStations.map((s, i) => (
                <View key={i} style={styles.stationCard}>
                  <View style={styles.stationHeader}>
                    <View style={styles.stationInfo}>
                      <Ionicons name="location" size={16} color={C.purple} />
                      <Text style={styles.stationName}>{s.stationName}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeStation(s.stationId)}>
                      <Ionicons name="star" size={20} color={C.purple} />
                    </TouchableOpacity>
                  </View>
                  {(busArrivals[s.stationId] ?? []).slice(0, 3).map((b, j) => (
                    <View key={j} style={styles.busRow}>
                      <View style={[styles.busNumBox, { backgroundColor: C.blue }]}>
                        <Text style={styles.busNum}>{b.routeName}</Text>
                      </View>
                      <Text style={styles.busDest}>{b.routeDestName}</Text>
                      <Text style={styles.busEta}>{b.predictTime1}분</Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.content}>
            {favBuses.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="bus-outline" size={40} color={C.gray} />
                <Text style={styles.emptyText}>즐겨찾기한 버스가 없어요</Text>
                <Text style={styles.emptySubText}>버스 카드에서 별표를 눌러 추가해보세요</Text>
              </View>
            ) : (
              favBuses.map((b, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.busCard}
                  onPress={() => router.push({ pathname: '/map', params: { routeName: b.routeName, routeDestName: b.routeDestName, routeId: b.routeId } })}
                >
                  <View style={[styles.busNumBoxLarge, { backgroundColor: C.blue }]}>
                    <Text style={styles.busNumLarge}>{b.routeName}</Text>
                  </View>
                  <View style={styles.busCardInfo}>
                    <Text style={styles.busCardName}>{b.routeName}번 — {b.routeDestName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeBus(b.routeId)}>
                    <Ionicons name="star" size={20} color={C.green} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, backgroundColor: C.white },
  headerTitle: { fontSize: 22, fontWeight: '900', color: C.dark },
  tabRow: { flexDirection: 'row', backgroundColor: C.white, paddingHorizontal: 24, paddingBottom: 12, gap: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: '#F0F4FF' },
  tabBtnActive: { backgroundColor: C.blue },
  tabText: { fontSize: 14, fontWeight: '700', color: C.gray },
  tabTextActive: { color: C.white },
  scroll:  { flex: 1 },
  content: { padding: 20, gap: 12 },
  emptyBox: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '700', color: C.gray },
  emptySubText: { fontSize: 13, color: C.gray, textAlign: 'center' },
  stationCard: { backgroundColor: C.white, borderRadius: 18, padding: 16, gap: 10, shadowColor: '#1A1F36', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
  stationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stationInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stationName: { fontSize: 15, fontWeight: '800', color: C.dark },
  busRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  busNumBox: { width: 44, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  busNum: { fontSize: 11, fontWeight: '900', color: C.white },
  busDest: { flex: 1, fontSize: 13, color: C.dark },
  busEta: { fontSize: 14, fontWeight: '900', color: C.blue },
  busCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, borderRadius: 18, padding: 14, shadowColor: '#1A1F36', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
  busNumBoxLarge: { width: 54, height: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  busNumLarge: { fontSize: 13, fontWeight: '900', color: C.white },
  busCardInfo: { flex: 1 },
  busCardName: { fontSize: 14, fontWeight: '700', color: C.dark },
});