import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, TextInput, ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRouteStations, searchStations, getBusArrival } from '../api';

const C = {
  blue: '#4F8EF7', blueSoft: '#EBF2FF',
  green: '#2ECC8A', orange: '#FF7A3D',
  red: '#FF4D6A', dark: '#1A1F36',
  gray: '#9BA3BF', bg: '#F0F4FF', white: '#FFFFFF',
};

const ROUTE_COLORS: Record<number, string> = {
  11: '#FF7A3D', 12: '#4F8EF7', 13: '#2ECC8A',
  14: '#A259FF', 15: '#FF4D6A', 30: '#2ECC8A',
};

function getColor(typeCd: number) {
  return ROUTE_COLORS[typeCd] ?? C.blue;
}

export default function MapScreen() {
  const router = useRouter();
  const [stations, setStations] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [stationBuses, setStationBuses] = useState<any[]>([]);
  const [busLoading, setBusLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const mapRef = useRef<MapView>(null);
  const refreshIntervalRef = useRef<any>(null);

  useEffect(() => {
    const loadAllStations = async () => {
      try {
        // 포천시청을 지나는 주요 노선 ID (138번 등 고정 포함)
        const POCHEON_STATION_ID = '236000308';
        const MAIN_ROUTE_IDS = ['236000049', '236000061', '236000063']; // 138, 138-5, 1386

        // 현재 운행 중인 버스 + 고정 노선 합치기
        const buses = await getBusArrival(POCHEON_STATION_ID);
        const runningIds = buses.map((b: any) => String(b.routeId));
        const uniqueRouteIds = [...new Set([...MAIN_ROUTE_IDS, ...runningIds])];

        const allRouteStations = await Promise.all(
          uniqueRouteIds.map(id => getRouteStations(id))
        );
        const seen = new Set<string>();
        const merged = allRouteStations.flat().filter((s: any) => {
          if (!s?.stationId || !s?.x || !s?.y) return false;
          if (seen.has(String(s.stationId))) return false;
          seen.add(String(s.stationId));
          return true;
        });
        setStations(merged);
      } catch (e) {
        console.log('초기 정류장 로드 오류:', e);
      }
      setMapLoading(false);
    };
    loadAllStations();
  }, []);

  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (text.length >= 1) {
      const results = await searchStations(text);
      setSearchResults(Array.isArray(results) ? results : []);
    } else {
      setSearchResults([]);
    }
  };

  const fetchBuses = async (station: any, showLoading = false) => {
    if (showLoading) setBusLoading(true);
    try {
      const data = await getBusArrival(String(station.stationId));
      const filtered = data
        .filter((b: any) => b.predictTime1 !== '' && b.predictTime1 !== null)
        .sort((a: any, b: any) => a.predictTime1 - b.predictTime1);
      setStationBuses(filtered);

      // 이 정류장을 지나는 모든 노선의 정류장 마커 표시
      if (filtered.length > 0) {
        const uniqueRouteIds = [...new Set(filtered.map((b: any) => String(b.routeId)))];
        const allRouteStations = await Promise.all(
          uniqueRouteIds.map(id => getRouteStations(id))
        );
        // 중복 제거 후 합치기
        const seen = new Set<string>();
        const merged = allRouteStations.flat().filter((s: any) => {
          if (!s?.stationId || !s?.x || !s?.y) return false;
          if (seen.has(String(s.stationId))) return false;
          seen.add(String(s.stationId));
          return true;
        });
        setStations(merged);
      }
    } catch (e) {
      console.log('버스 오류:', e);
    }
    if (showLoading) setBusLoading(false);
  };

  const selectStation = async (station: any) => {
    setSelectedStation(station);
    setSearchText('');
    setSearchResults([]);

    // 지도 이동
    if (mapRef.current) {
      mapRef.current.animateCamera({
        center: { latitude: station.y, longitude: station.x },
        zoom: 16,
      }, { duration: 800 });
    }

    // 기존 갱신 중단 후 새로 시작
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    fetchBuses(station, true);
    refreshIntervalRef.current = setInterval(() => fetchBuses(station), 15000);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={{
            latitude: 37.895,
            longitude: 127.2016,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {stations.map((s, i) => {
            const isSelected = selectedStation?.stationId === s.stationId;
            return (
              <Marker
                key={`station-${i}`}
                coordinate={{ latitude: s.y, longitude: s.x }}
                onPress={() => selectStation(s)}
                tracksViewChanges={false}
              >
                <View style={styles.stationMarker}>
                  <View style={[styles.stationDot, isSelected && styles.stationDotSelected]} />
                </View>
              </Marker>
            );
          })}
          {selectedStation && (
            <Marker
              coordinate={{ latitude: selectedStation.y, longitude: selectedStation.x }}
              title={selectedStation.stationName}
            >
              <View style={styles.selectedMarker}>
                <Ionicons name="location" size={20} color={C.white} />
              </View>
            </Marker>
          )}
        </MapView>

        {/* 로딩 표시 */}
        {mapLoading && (
          <View style={styles.mapLoadingOverlay}>
            <View style={styles.mapLoadingBox}>
              <Ionicons name="location" size={20} color={C.blue} />
              <Text style={styles.mapLoadingText}>정류장 불러오는 중...</Text>
            </View>
          </View>
        )}

        {/* 검색창 - 지도 위에 오버레이 */}
        <View style={styles.searchOverlay}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={14} color={C.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="정류장 검색"
              placeholderTextColor={C.gray}
              value={searchText}
              onChangeText={handleSearch}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchText(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={14} color={C.gray} />
              </TouchableOpacity>
            )}
          </View>
          {searchResults.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={styles.searchResultItem}
              onPress={() => selectStation(s)}
            >
              <Text style={styles.searchResultName}>{s.stationName}</Text>
              <Text style={styles.searchResultSub}>{s.mobileNo?.trim()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHandle} />

        {selectedStation ? (
          <>
            <View style={styles.stationHeaderRow}>
              <Ionicons name="location" size={14} color={C.blue} />
              <Text style={styles.stationTitle}>{selectedStation.stationName}</Text>
              <TouchableOpacity onPress={() => {
                setSelectedStation(null);
                setStationBuses([]);
                if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
              }}>
                <Ionicons name="close" size={16} color={C.gray} />
              </TouchableOpacity>
            </View>
            {busLoading ? (
              <Text style={styles.busLoadingText}>버스 정보 불러오는 중...</Text>
            ) : stationBuses.length === 0 ? (
              <Text style={styles.busLoadingText}>현재 운행 중인 버스가 없어요</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.busScroll}>
                {stationBuses.map((b, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.busChip}
                    onPress={() => b.lowPlate1 === 1
                      ? router.push({
                          pathname: '/boarding',
                          params: {
                            routeName: b.routeName,
                            routeDestName: b.routeDestName,
                            predictTime1: b.predictTime1,
                            routeId: b.routeId,
                            stationId: selectedStation?.stationId,
                          },
                        })
                      : router.push({
                          pathname: '/riding',
                          params: { routeName: b.routeName, routeDestName: b.routeDestName, predictTime1: b.predictTime1, routeId: b.routeId },
                        })
                    }
                  >
                    <View style={[styles.busChipNum, { backgroundColor: getColor(b.routeTypeCd) }]}>
                      <Text style={styles.busChipNumText}>{b.routeName}</Text>
                    </View>
                    {b.lowPlate1 === 1 && (
                      <Ionicons name="accessibility" size={10} color={C.green} />
                    )}
                    <Text style={styles.busChipEta}>{b.predictTime1}분</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        ) : (
          <Text style={styles.busLoadingText}>정류장을 검색하거나 마커를 눌러보세요</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  backBtn:    { width: 38, height: 38, borderRadius: 13, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headerTitle:{ fontSize: 15, fontWeight: '800', color: C.dark },
  headerSub:  { fontSize: 12, color: C.gray, marginTop: 1 },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  searchOverlay: { position: 'absolute', top: 12, left: 12, right: 12, gap: 6 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  searchInput: { flex: 1, fontSize: 13, color: C.dark },
  searchResultItem: { backgroundColor: C.white, padding: 12, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  searchResultName: { fontSize: 13, fontWeight: '600', color: C.dark },
  searchResultSub:  { fontSize: 11, color: C.gray, marginTop: 1 },
  stationMarker: { alignItems: 'center', justifyContent: 'center' },
  stationDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.white, borderWidth: 2, borderColor: C.blue },
  stationDotSelected: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.orange, borderColor: C.orange },
  selectedMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.white },
  panel:    { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  panelHandle: { width: 40, height: 4, backgroundColor: '#E0E5F2', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  stationHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  stationTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: C.dark },
  busLoadingText: { fontSize: 13, color: C.gray, textAlign: 'center', paddingVertical: 12 },
  mapLoadingOverlay: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  mapLoadingBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.white, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  mapLoadingText: { fontSize: 13, color: C.blue, fontWeight: '600' },
  busScroll: { marginBottom: 4 },
  busChip: { alignItems: 'center', marginRight: 10, gap: 4 },
  busChipNum: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, minWidth: 50, alignItems: 'center' },
  busChipNumText: { fontSize: 12, fontWeight: '900', color: C.white },
  busChipEta: { fontSize: 12, fontWeight: '700', color: C.blue },
});