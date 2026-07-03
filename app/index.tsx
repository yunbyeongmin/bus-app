import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, SafeAreaView, StatusBar, Dimensions, RefreshControl,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchBusRoute, getBusLocation } from '../api';

const { width } = Dimensions.get('window');

const C = {
  blue: '#4F8EF7', blueSoft: '#EBF2FF',
  green: '#2ECC8A', greenSoft: '#E5FBF3',
  orange: '#FF7A3D', orangeSoft: '#FFF0E8',
  purple: '#A259FF', purpleSoft: '#F3EBFF',
  dark: '#1A1F36', gray: '#9BA3BF', bg: '#F0F4FF', white: '#FFFFFF',
};

const ROUTE_COLORS: Record<number, string> = {
  11: '#FF7A3D', 12: '#4F8EF7', 13: '#2ECC8A',
  14: '#A259FF', 15: '#FF4D6A', 30: '#2ECC8A',
};

function getColor(typeCd: number) {
  return ROUTE_COLORS[typeCd] ?? C.blue;
}

function FadeIn({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const anim  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: anim, transform: [{ translateY: slide }] }}>{children}</Animated.View>;
}

export default function HomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [userMode, setUserMode] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('userMode').then(val => setUserMode(val));
  }, []);

  const handleSearch = async () => {
    if (search.trim() === '') return;
    setSearching(true);
    try {
      const results = await searchBusRoute(search.trim());
      const pocheon = results.filter((r: any) =>
        r.adminName?.includes('포천') || r.regionName?.includes('포천')
      );
      setSearchResults(pocheon.length > 0 ? pocheon : results);
    } catch (e) {
      console.log('검색 오류:', e);
    }
    setSearching(false);
  };

  const addToFavorites = async (bus: any) => {
    const existing = await AsyncStorage.getItem('favBuses');
    const list = existing ? JSON.parse(existing) : [];
    const already = list.find((b: any) => b.routeId === bus.routeId);
    if (!already) {
      list.push({ routeName: bus.routeName, routeDestName: bus.endStationName, routeId: bus.routeId });
      await AsyncStorage.setItem('favBuses', JSON.stringify(list));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        <FadeIn delay={0}>
          <LinearGradient colors={['#FFFFFF', '#F0F4FF']} style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>안녕하세요 👋</Text>
                <Text style={styles.title}>버스 탑승을 도와드릴게요</Text>
              </View>
              <TouchableOpacity style={styles.avatarWrap} onPress={() => router.push('/voice')}>
                <Ionicons name="settings-outline" size={24} color={C.blue} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={C.gray} />
              <TextInput
                style={styles.searchInput}
                placeholder="버스 번호 검색 (예: 138)"
                placeholderTextColor={C.gray}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => { setSearch(''); setSearchResults([]); }}>
                  <Ionicons name="close-circle" size={16} color={C.gray} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleSearch}>
                <Ionicons name="arrow-forward-circle" size={22} color={C.blue} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </FadeIn>

        <FadeIn delay={80}>
          {searching ? (
            <View style={styles.loadingBox}>
              <Ionicons name="bus" size={32} color={C.blue} />
              <Text style={styles.loadingText}>버스 검색 중...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <View>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>"{search}" 검색 결과</Text>
                <Text style={styles.sectionMore}>{searchResults.length}개</Text>
              </View>
              <View style={styles.busList}>
                {searchResults.map((r, i) => (
                  <View key={i} style={styles.busCard}>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => router.push({
                        pathname: '/businfo',
                        params: {
                          routeName: r.routeName,
                          routeDestName: r.endStationName,
                          startStationName: r.startStationName,
                          routeId: r.routeId,
                        },
                      })}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}
                    >
                    <View style={[styles.busNumBox, { backgroundColor: getColor(r.routeTypeCd) }]}>
                      <Text style={styles.busNum}>{r.routeName}</Text>
                    </View>
                    <View style={styles.busInfo}>
                      <Text style={styles.busDest}>{r.routeName}번</Text>
                      <Text style={styles.busStop}>
                        <Ionicons name="location" size={11} color={C.gray} /> {r.startStationName} → {r.endStationName}
                      </Text>
                      <Text style={styles.busStop}>{r.regionName}</Text>
                    </View>
                    </TouchableOpacity>
                    <View style={styles.busEtaWrap}>
                      <TouchableOpacity 
                        onPress={(e) => { 
                          e.stopPropagation(); 
                          addToFavorites(r); 
                        }} 
                        style={{ padding: 8 }}
                      >
                        <Ionicons name="star-outline" size={18} color={C.gray} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : search.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="bus-outline" size={48} color={C.gray} />
              <Text style={styles.emptyText}>버스 번호를 검색해보세요</Text>
              <Text style={styles.emptySub}>138, 72, 3200 등 버스 번호를 입력하면{'\n'}실시간 위치와 노선을 확인할 수 있어요</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="alert-circle-outline" size={48} color={C.gray} />
              <Text style={styles.emptyText}>검색 결과가 없어요</Text>
            </View>
          )}
        </FadeIn>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting:  { fontSize: 13, color: C.gray, fontWeight: '600', marginBottom: 2 },
  title:     { fontSize: 20, color: C.dark, fontWeight: '800', letterSpacing: -0.4 },
  avatarWrap:{ width: 48, height: 48, borderRadius: 16, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.blueSoft, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  searchInput: { flex: 1, fontSize: 14, color: C.dark },
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 22, paddingBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.dark },
  sectionMore:  { fontSize: 13, color: C.blue, fontWeight: '600' },
  loadingBox:   { padding: 40, alignItems: 'center', gap: 12 },
  loadingText:  { color: C.gray, fontSize: 14 },
  emptyBox:     { padding: 60, alignItems: 'center', gap: 12 },
  emptyText:    { fontSize: 16, fontWeight: '700', color: C.gray },
  emptySub:     { fontSize: 13, color: C.gray, textAlign: 'center', lineHeight: 20 },
  busList:      { paddingHorizontal: 20, gap: 10 },
  busCard:      { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, borderRadius: 18, padding: 14, shadowColor: '#1A1F36', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  busNumBox:    { width: 54, height: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  busNum:       { fontSize: 13, fontWeight: '900', color: C.white },
  busInfo:      { flex: 1, gap: 2 },
  busDest:      { fontSize: 14, fontWeight: '700', color: C.dark },
  busStop:      { fontSize: 12, color: C.gray },
  busEtaWrap:   { alignItems: 'flex-end', gap: 6 },
});