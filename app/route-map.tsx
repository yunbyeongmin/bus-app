import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Camera } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBusArrival, getBusLocation, getRouteStations } from '../api';

const C = {
  blue: '#4F8EF7', blueSoft: '#EBF2FF',
  green: '#2ECC8A', orange: '#FF7A3D',
  dark: '#1A1F36', gray: '#9BA3BF', bg: '#F0F4FF', white: '#FFFFFF',
};

const ROUTE_COLORS: Record<number, string> = {
  11: '#FF7A3D', 12: '#4F8EF7', 13: '#2ECC8A',
  14: '#A259FF', 15: '#FF4D6A', 30: '#2ECC8A',
};

export default function RouteMapScreen() {
  const router = useRouter();
  const { routeName, routeDestName, predictTime1, routeId } = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);

  const [busLocations, setBusLocations] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [userMode, setUserMode] = useState<string | null>(null);

  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [stationBuses, setStationBuses] = useState<any[]>([]);
  const [stationLoading, setStationLoading] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem('userMode').then(val => setUserMode(val));
    }, [])
  );

  useEffect(() => {
    if (!routeId) return;
    const load = async () => {
      try {
        const stationList = await getRouteStations(String(routeId));
        setStations(stationList);
        const locs = await getBusLocation(String(routeId), stationList);
        setBusLocations(locs);
      } catch (e) {}
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [routeId]);

  useEffect(() => {
    if (busLocations.length > 0 && mapRef.current) {
      const bus = busLocations[0];
      if (!bus.y || !bus.x) return;
      mapRef.current.animateCamera({
        center: { latitude: bus.y, longitude: bus.x },
        heading: 0, pitch: 0, zoom: 15,
      }, { duration: 1000 });
    }
  }, [busLocations]);

  const handleStationPress = async (id: string, name: string) => {
    setSelected({ id, name });
    setStationLoading(true);
    setStationBuses([]);
    const list = await getBusArrival(id);
    const filtered = list
      .filter((b: any) => b.predictTime1 !== '' && b.predictTime1 != null)
      .sort((a: any, b: any) => Number(a.predictTime1) - Number(b.predictTime1));
    setStationBuses(filtered);
    setStationLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.blue} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{routeName}번 버스</Text>
          <Text style={styles.headerSub}>{routeDestName} 방면</Text>
        </View>
        <View style={[styles.etaBadge]}>
          <Text style={styles.etaBadgeText}>{predictTime1}분 후</Text>
        </View>
      </View>

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
        {busLocations.map((bus, i) => (
          <Marker
            key={i}
            coordinate={{ latitude: bus.y ?? 37.895, longitude: bus.x ?? 127.2016 }}
          >
            <View style={styles.busMarker}>
              <Ionicons name="bus" size={18} color={C.white} />
            </View>
          </Marker>
        ))}
        {stations.map((s, i) => (
          <Marker
            key={`st-${i}`}
            coordinate={{ latitude: s.y, longitude: s.x }}
            onPress={() => handleStationPress(String(s.stationId), s.stationName)}
          >
            <View style={[
              styles.stationMarker,
              selected?.id === String(s.stationId) && styles.stationMarkerSelected,
            ]}>
              <View style={[
                styles.stationDot,
                selected?.id === String(s.stationId) && styles.stationDotSelected,
              ]} />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.panel}>
        <View style={styles.panelHandle} />

        {selected ? (
          <>
            <View style={styles.stationHeader}>
              <Ionicons name="location" size={15} color={C.blue} />
              <Text style={styles.stationName}>{selected.name}</Text>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={16} color={C.gray} />
              </TouchableOpacity>
            </View>
            {stationLoading ? (
              <View style={styles.row}>
                <ActivityIndicator color={C.blue} />
                <Text style={styles.grayText}>불러오는 중...</Text>
              </View>
            ) : stationBuses.length === 0 ? (
              <View style={styles.row}>
                <Text style={styles.grayText}>도착 예정 버스가 없어요</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 210 }} showsVerticalScrollIndicator={false}>
                {stationBuses.map((b, i) => {
                  const color = ROUTE_COLORS[b.routeTypeCd] ?? C.blue;
                  return (
                    <View key={i} style={[styles.busRow, i > 0 && styles.busRowBorder]}>
                      <View style={[styles.busNumBox, { backgroundColor: color }]}>
                        <Text style={styles.busNum}>{b.routeName}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.busDest}>{b.routeDestName}</Text>
                        {b.lowPlate1 === 1 && (
                          <View style={styles.lowFloor}>
                            <Ionicons name="accessibility" size={10} color={C.green} />
                            <Text style={styles.lowFloorText}> 저상</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={[styles.eta, { color }]}>{b.predictTime1}분</Text>
                        {b.predictTime2 ? <Text style={styles.eta2}>다음 {b.predictTime2}분</Text> : null}
                        {userMode === 'disabled' && (
                          <TouchableOpacity
                            onPress={() => router.push({ pathname: '/boarding', params: { routeName: b.routeName, routeDestName: b.routeDestName, predictTime1: String(b.predictTime1), stationId: String(selected?.id ?? ''), routeId: String(b.routeId) } })}
                            style={styles.boardSmall}
                          >
                            <Ionicons name="hand-left" size={11} color={C.white} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </>
        ) : (
          <>
            <Text style={styles.busCount}>현재 운행 중인 버스 {busLocations.length}대</Text>
            <Text style={styles.hint}>정류장을 탭하면 도착 버스를 확인할 수 있어요</Text>
            {userMode === 'disabled' && (
              <TouchableOpacity
                style={{ marginTop: 14 }}
                onPress={() => router.push({ pathname: '/boarding', params: { routeName, routeDestName, predictTime1, routeId } })}
              >
                <LinearGradient colors={['#2ECC8A', '#1A9C6A']} style={styles.boardBtn}>
                  <Ionicons name="hand-left" size={18} color="white" />
                  <Text style={styles.boardBtnText}> 이 버스 탑승 의사 표시하기</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  backBtn: { width: 38, height: 38, borderRadius: 13, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.dark },
  headerSub: { fontSize: 12, color: C.gray, marginTop: 1 },
  etaBadge: { backgroundColor: C.blueSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  etaBadgeText: { fontSize: 13, fontWeight: '800', color: C.blue },
  map: { flex: 1 },
  busMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.white, shadowColor: C.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8 },
  stationMarker: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.white, borderWidth: 2, borderColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  stationMarkerSelected: { width: 22, height: 22, borderRadius: 11, borderColor: C.orange, borderWidth: 3 },
  stationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.blue },
  stationDotSelected: { backgroundColor: C.orange },
  panel: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, maxHeight: 320, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.07, shadowRadius: 20 },
  panelHandle: { width: 40, height: 4, backgroundColor: '#E0E5F2', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  busCount: { fontSize: 14, fontWeight: '700', color: C.dark, marginBottom: 4 },
  hint: { fontSize: 12, color: C.gray },
  boardBtn: { borderRadius: 20, paddingVertical: 17, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  boardBtnText: { fontSize: 15, fontWeight: '800', color: C.white },
  stationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  stationName: { fontSize: 15, fontWeight: '800', color: C.dark, flex: 1 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F4FF', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, justifyContent: 'center' },
  grayText: { fontSize: 13, color: C.gray },
  busRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  busRowBorder: { borderTopWidth: 1, borderTopColor: '#F0F4FF' },
  busNumBox: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  busNum: { fontSize: 12, fontWeight: '900', color: C.white },
  busDest: { fontSize: 13, fontWeight: '600', color: C.dark },
  lowFloor: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  lowFloorText: { fontSize: 10, fontWeight: '700', color: C.green },
  eta: { fontSize: 17, fontWeight: '900' },
  eta2: { fontSize: 11, color: C.gray },
  boardSmall: { backgroundColor: C.green, borderRadius: 7, padding: 5 },
});
