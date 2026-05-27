import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Camera } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBusLocation, getRouteStations } from '../api';

const C = {
  blue: '#4F8EF7', blueSoft: '#EBF2FF',
  green: '#2ECC8A', orange: '#FF7A3D',
  red: '#FF4D6A', dark: '#1A1F36',
  gray: '#9BA3BF', bg: '#F0F4FF', white: '#FFFFFF',
};

export default function MapScreen() {
  const router = useRouter();
  const { routeName, routeDestName, predictTime1, routeId, vehId } = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);
  const [busLocations, setBusLocations] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [userMode, setUserMode] = useState<string | null>(null);
  const visibleBusLocations = useMemo(() => (
    vehId
      ? busLocations.filter((bus) => String(bus.vehId) === String(vehId))
      : busLocations
  ), [busLocations, vehId]);

  useEffect(() => {
    AsyncStorage.getItem('userMode').then(val => setUserMode(val));
  }, []);

  useEffect(() => {
    if (!routeId) return;
    const load = async () => {
      try {
        const stationList = await getRouteStations(String(routeId));
        setStations(stationList);
        const locs = await getBusLocation(String(routeId), stationList);
        setBusLocations(locs);
      } catch (e) {
        console.log('위치 오류:', e);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [routeId]);

  useEffect(() => {
    if (visibleBusLocations.length > 0 && mapRef.current) {
      const bus = visibleBusLocations[0];
      if (!bus.y || !bus.x) return;
      const camera: Camera = {
        center: {
          latitude: bus.y,
          longitude: bus.x,
        },
        heading: 0,
        pitch: 0,
        zoom: 15,
      };
      mapRef.current.animateCamera(camera, { duration: 1000 });
    }
  }, [visibleBusLocations]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.blue} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{routeName}번 버스</Text>
          <Text style={styles.headerSub}>{routeDestName}</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn}>
          <Ionicons name="notifications" size={22} color={C.dark} />
        </TouchableOpacity>
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
        {visibleBusLocations.map((bus, i) => (
          <Marker
            key={i}
            coordinate={{
              latitude: bus.y ?? 37.895,
              longitude: bus.x ?? 127.2016,
            }}
            title={`${routeName}번`}
            description={`잔여석 ${bus.remainSeatCnt}석`}
          >
            <View style={styles.busMarker}>
              <Ionicons name="bus" size={18} color={C.white} />
            </View>
          </Marker>
        ))}

        {stations.map((s, i) => (
          <Marker
            key={`station-${i}`}
            coordinate={{ latitude: s.y, longitude: s.x }}
            title={s.stationName}
          >
            <View style={styles.stationMarker}>
              <View style={styles.stationDot} />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.panel}>
        <View style={styles.panelHandle} />
        <View style={styles.etaRow}>
          <Text style={styles.etaBig}>{predictTime1}</Text>
          <Text style={styles.etaUnit}>분</Text>
          <Text style={styles.etaDesc}>후 도착 예정</Text>
        </View>
        <Text style={styles.busCount}>
          현재 운행 중인 버스 {visibleBusLocations.length}대
        </Text>
        {userMode === 'disabled' && (
          <TouchableOpacity onPress={() => router.push('/boarding')}>
            <LinearGradient colors={['#2ECC8A', '#1A9C6A']} style={styles.boardBtn}>
              <Ionicons name="hand-left" size={18} color="white" />
              <Text style={styles.boardBtnText}> 이 버스 탑승 의사 표시하기</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  headerTitle: { fontSize: 15, fontWeight: '800', color: C.dark },
  headerSub: { fontSize: 12, color: C.gray, marginTop: 1 },
  bellBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  map: { flex: 1 },
  busMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.white, shadowColor: C.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8 },
  stationMarker: { alignItems: 'center', justifyContent: 'center' },
  stationDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.white, borderWidth: 2, borderColor: C.blue },
  panel: { backgroundColor: C.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.07, shadowRadius: 20 },
  panelHandle: { width: 40, height: 4, backgroundColor: '#E0E5F2', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  etaRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 8 },
  etaBig: { fontSize: 52, fontWeight: '900', color: C.blue, lineHeight: 52 },
  etaUnit: { fontSize: 18, color: C.gray, fontWeight: '600', paddingBottom: 6 },
  etaDesc: { fontSize: 14, color: C.dark, fontWeight: '600', paddingBottom: 8 },
  busCount: { fontSize: 13, color: C.gray, marginBottom: 14 },
  boardBtn: { borderRadius: 20, paddingVertical: 17, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  boardBtnText: { fontSize: 15, fontWeight: '800', color: C.white },
});
