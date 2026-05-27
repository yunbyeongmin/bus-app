import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, SafeAreaView, StatusBar, Dimensions, RefreshControl,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBusArrivalMulti, getNearestStation, searchStations, STATIONS } from '../api';

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

const STATION_NAMES: Record<string, string> = {
  '223000142': '포천시청앞',
  '223000145': '포천터미널',
  '223000141': '포천소방서',
  '223000143': '신읍11통.시청별관',
  '223000139': '포천고등학교앞',
  '223000131': '골든아파트앞',
  '223000140': '가채리공원',
  '223000138': '가채1통.오리동',
  '223000133': '신북면행정복지센터',
  '223000119': '선단1통.대진대학교',
  '223000115': '송우리터미널',
  '223000113': '소흘읍행정복지센터',
  '223000116': '송우6통.현대아파트',
  '223000117': '설운3통.여우고개',
  '223000118': '선단4통.장승거리',
  '223000134': '자작1통',
  '223000135': '자작2통',
  '223000136': '어룡1통',
  '223000137': '어룡2통',
  '223000144': '어룡3통',
  '223000107': '축석고개',
  '207000001': '본자일마을',
  '207000002': '자일동',
  '207000011': '의정부성모병원',
  '207000019': '금오초등학교',
  '207000023': '의정부버스터미널',
  '207000007': '의정부역',
  '236001234': '포천농협.하나로마트',
  '236001235': '포천농협.하나로마트',
};

export default function HomeScreen() {
  const router = useRouter();
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [nearestStationId, setNearestStationId] = useState<string>('223000142');
  const [stationName, setStationName] = useState<string>('포천시청앞');
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [lowFloorOnly, setLowFloorOnly] = useState(false);
  const [userMode, setUserMode] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('userMode').then(val => setUserMode(val));
  }, []);

  const load = async (stationId = nearestStationId) => {
    try {
      const data = await getBusArrivalMulti([stationId]);
      const filtered = data.filter((b: any) =>
        b.predictTime1 !== '' && b.predictTime1 !== null
      );
      filtered.sort((a: any, b: any) => a.predictTime1 - b.predictTime1);
      setBuses(filtered);
    } catch (e) {
      console.log('오류:', e);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadNearest = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const nearest = getNearestStation(loc.coords.latitude, loc.coords.longitude);
          setNearestStationId(nearest);
          setStationName(STATIONS[nearest]?.name ?? '근처 정류장');
          await load(nearest);
          return;
        }
      } catch (e) {
        console.log('위치 오류:', e);
      }
      await load();
    };
    loadNearest();
  }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  const addToFavorites = async (bus: any) => {
    const existing = await AsyncStorage.getItem('favBuses');
    const list = existing ? JSON.parse(existing) : [];
    const already = list.find((b: any) => b.routeId === bus.routeId);
    if (!already) {
      list.push({
        routeName: bus.routeName,
        routeDestName: bus.routeDestName,
        routeId: bus.routeId,
      });
      await AsyncStorage.setItem('favBuses', JSON.stringify(list));
    }
  };

  const handleStationSearch = async (text: string) => {
    setSearchText(text);
    if (text.length >= 1) {
      const results = await searchStations(text);
      const filtered = results
        .filter((s: any) =>
          s.regionName?.includes('포천'))
        .sort((a: any, b: any) => {
          const aName: string = a.stationName ?? '';
          const bName: string = b.stationName ?? '';
          const aStarts = aName.startsWith(text);
          const bStarts = bName.startsWith(text);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return aName.localeCompare(bName);
        });
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />}
      >
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
                placeholder="버스 번호 검색"
                placeholderTextColor={C.gray}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={C.gray} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setLowFloorOnly(!lowFloorOnly)}
                style={[styles.filterBtn, lowFloorOnly && styles.filterBtnActive]}
              >
                <Ionicons name="accessibility" size={14} color={lowFloorOnly ? C.white : C.gray} />
                <Text style={[styles.filterBtnText, lowFloorOnly && { color: C.white }]}>저상</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </FadeIn>

        <FadeIn delay={80}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>📍 {stationName}</Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <TouchableOpacity onPress={() => { setShowSearch(!showSearch); setSearchText(''); setSearchResults([]); }}>
                <Text style={[styles.sectionMore, { fontSize: 11 }]}>정류장 변경</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onRefresh}>
                <Text style={styles.sectionMore}>새로고침 →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showSearch && (
            <View style={styles.searchBox}>
              <View style={styles.stationSearchBar}>
                <Ionicons name="location-outline" size={16} color={C.blue} />
                <TextInput
                  style={styles.stationSearchInput}
                  placeholder="정류장 이름 검색 (예: 포천시청)"
                  placeholderTextColor={C.gray}
                  value={searchText}
                  onChangeText={handleStationSearch}
                  autoFocus
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchText(''); setSearchResults([]); }}>
                    <Ionicons name="close-circle" size={16} color={C.gray} />
                  </TouchableOpacity>
                )}
              </View>
              {searchResults.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.searchResultItem}
                  onPress={() => {
                    const sid = String(s.stationId);
                    setNearestStationId(sid);
                    setStationName(s.stationName);
                    setShowSearch(false);
                    setSearchText('');
                    setSearchResults([]);
                    load(sid);
                  }}
                >
                  <View>
                    <Text style={styles.searchResultName}>{s.stationName}</Text>
                    {s.mobileNo?.trim() && (
                      <Text style={styles.searchResultSub}>정류장 번호: {s.mobileNo.trim()}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.gray} />
                </TouchableOpacity>
              ))}
              {searchText.length >= 1 && searchResults.length === 0 && (
                <View style={styles.noResult}>
                  <Text style={styles.noResultText}>검색 결과가 없어요</Text>
                </View>
              )}
            </View>
          )}

          {loading ? (
            <View style={styles.loadingBox}>
              <Ionicons name="bus" size={32} color={C.blue} />
              <Text style={styles.loadingText}>버스 정보 불러오는 중...</Text>
            </View>
          ) : buses.length === 0 ? (
            <View style={styles.loadingBox}>
              <Ionicons name="alert-circle" size={32} color={C.gray} />
              <Text style={styles.loadingText}>현재 운행 중인 버스가 없어요</Text>
            </View>
          ) : (
            <View style={styles.busList}>
              {buses
                .filter(b =>
                  (
                    search === '' ||
                    String(b.routeName).includes(search) ||
                    String(b.routeDestName).includes(search)
                  ) &&
                  (!lowFloorOnly || b.lowPlate1 === 1)
                )
                .map((b, i) => (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.88}
                    onPress={() => router.push({
                      pathname: '/map',
                      params: {
                        routeName: b.routeName,
                        routeDestName: b.routeDestName,
                        predictTime1: b.predictTime1,
                        routeId: b.routeId,
                      },
                    })}
                    style={styles.busCard}
                  >
                    <View style={[styles.busNumBox, { backgroundColor: getColor(b.routeTypeCd) }]}>
                      <Text style={styles.busNum}>{b.routeName}</Text>
                    </View>
                    <View style={styles.busInfo}>
                      <Text style={styles.busDest}>{b.routeName}번 — {b.routeDestName}</Text>
                      <Text style={styles.busStop}>
                        <Ionicons name="location" size={11} color={C.gray} /> {STATION_NAMES[String(b.stationId)] ?? b.stationNm1 ?? '포천 정류장'}
                      </Text>
                      {b.lowPlate1 === 1 && (
                        <View style={styles.lowFloor}>
                          <Ionicons name="accessibility" size={11} color={C.green} />
                          <Text style={styles.lowFloorText}> 저상버스</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.busEtaWrap}>
                      <View style={styles.busEta}>
                        <Text style={styles.etaNum}>{b.predictTime1}분</Text>
                        <Text style={styles.etaLabel}>뒤 도착</Text>
                        {b.predictTime2 ? (
                          <Text style={[styles.etaLabel, { marginTop: 2 }]}>다음 {b.predictTime2}분</Text>
                        ) : null}
                      </View>
                      <TouchableOpacity onPress={() => addToFavorites(b)} style={{ padding: 4 }}>
                        <Ionicons name="star-outline" size={18} color={C.gray} />
                      </TouchableOpacity>
                      {userMode === 'disabled' && (
                        <TouchableOpacity
                          onPress={() => router.push('/boarding')}
                          style={styles.boardingBtn}
                        >
                          <Ionicons name="hand-left" size={14} color={C.white} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
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
  filterBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  filterBtnActive: { backgroundColor: C.green },
  filterBtnText:   { fontSize: 12, fontWeight: '700', color: C.gray },
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 22, paddingBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.dark },
  sectionMore:  { fontSize: 13, color: C.blue, fontWeight: '600' },
  searchBox: { marginHorizontal: 20, marginBottom: 10, gap: 6 },
  stationSearchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  stationSearchInput: { flex: 1, fontSize: 14, color: C.dark },
  searchResultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.white, padding: 14, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  searchResultName: { fontSize: 14, fontWeight: '600', color: C.dark },
  searchResultSub:  { fontSize: 11, color: C.gray, marginTop: 2 },
  noResult: { padding: 16, alignItems: 'center' },
  noResultText: { fontSize: 13, color: C.gray },
  loadingBox:   { padding: 40, alignItems: 'center', gap: 12 },
  loadingText:  { color: C.gray, fontSize: 14 },
  busList:      { paddingHorizontal: 20, gap: 10 },
  busCard:      { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, borderRadius: 18, padding: 14, shadowColor: '#1A1F36', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  busNumBox:    { width: 54, height: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  busNum:       { fontSize: 13, fontWeight: '900', color: C.white },
  busInfo:      { flex: 1, gap: 2 },
  busDest:      { fontSize: 14, fontWeight: '700', color: C.dark },
  busStop:      { fontSize: 12, color: C.gray },
  lowFloor:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.greenSoft, alignSelf: 'flex-start', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  lowFloorText: { fontSize: 11, fontWeight: '700', color: C.green },
  busEtaWrap:   { alignItems: 'flex-end', gap: 6 },
  busEta:       { alignItems: 'flex-end' },
  etaNum:       { fontSize: 18, fontWeight: '900', color: C.blue },
  etaLabel:     { fontSize: 11, color: C.gray },
  boardingBtn:  { backgroundColor: C.green, borderRadius: 10, padding: 8 },
});
