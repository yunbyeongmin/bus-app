import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, Alert, TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { getRouteStations, getBusLocation } from '../api';

const C = {
  blue: '#4F8EF7', blueSoft: '#EBF2FF',
  green: '#2ECC8A', greenSoft: '#E5FBF3',
  orange: '#FF7A3D', orangeSoft: '#FFF0E8',
  red: '#FF4D6A', dark: '#1A1F36',
  gray: '#9BA3BF', bg: '#F0F4FF', white: '#FFFFFF',
};

export default function RidingScreen() {
  const router = useRouter();
  const { routeName, routeId, routeDestName } = useLocalSearchParams();
  const [stations, setStations] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [riding, setRiding] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [stationSearch, setStationSearch] = useState('');
  const [currentSeq, setCurrentSeq] = useState<number>(0);
  const [turnSeq, setTurnSeq] = useState<number>(0);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [stationsError, setStationsError] = useState('');
  const intervalRef = useRef<any>(null);
  const notifiedRef = useRef<Set<number>>(new Set());
  const stationsRef = useRef<any[]>([]); // 정류장 캐시

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // 화면 진입할 때마다 상태 초기화
      setRiding(false);
      setSelectedStation(null);
      setRemaining(null);
      setStationSearch('');
      setCurrentSeq(0);
      notifiedRef.current = new Set();
      if (intervalRef.current) clearInterval(intervalRef.current);
      loadStations();
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [routeId])
  );

  const loadStations = async () => {
    setStationsLoading(true);
    setStationsError('');
    try {
      const id = String(routeId);
      const list = await getRouteStations(id);
      stationsRef.current = list;
      const locs = await getBusLocation(id, list); // 캐시 전달로 이중 fetch 방지
      if (list.length === 0) {
        setStationsError(`정류장 정보 없음 (routeId: ${id})`);
      }
      setStations(list);
      const turn = list.find((s: any) => s.turnYn === 'Y');
      if (turn) setTurnSeq(Number(turn.stationSeq));
      if (locs.length > 0) {
        const minSeq = Math.min(...locs.map((l: any) => Number(l.stationSeq)));
        setCurrentSeq(minSeq);
      }
    } catch (e) {
      console.log('[riding] 오류:', e);
      setStationsError('정류장을 불러오지 못했어요');
    }
    setStationsLoading(false);
  };

  const startRiding = async (station: any) => {
    setSelectedStation(station);
    setRiding(true);
    notifiedRef.current = new Set();
    // currentSeq로 즉시 표시
    if (currentSeq > 0) {
      const diff = station.stationSeq - currentSeq;
      setRemaining(diff > 0 ? diff : null);
    }
    intervalRef.current = setInterval(() => checkBusPosition(station.stationSeq), 5000);
    checkBusPosition(station.stationSeq);
  };

  const checkBusPosition = async (target: number) => {
    try {
      const locs = await getBusLocation(String(routeId), stationsRef.current);
      if (locs.length === 0) return;
      // 목적지보다 앞에 있는 버스 중 가장 가까운 것
      const approaching = locs.filter((l: any) => Number(l.stationSeq) <= target);
      if (approaching.length === 0) {
        setRemaining(null); // 접근 중인 버스 없음
        return;
      }
      const nearest = approaching.reduce((a: any, b: any) =>
        (target - a.stationSeq) < (target - b.stationSeq) ? a : b
      );
      const diff = target - nearest.stationSeq;
      setCurrentSeq(nearest.stationSeq);
      setRemaining(diff);

      if ([3, 2, 1].includes(diff) && !notifiedRef.current.has(diff)) {
        notifiedRef.current.add(diff);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${routeName}번 버스`,
            body: `목적지까지 ${diff}정거장 남았어요!`,
            sound: true,
          },
          trigger: null,
        });
        if (diff === 1) {
          Alert.alert('곧 도착!', '다음 정거장이 목적지예요. 준비하세요!');
        }
      }

      if (diff <= 0) {
        clearInterval(intervalRef.current);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('도착!', '목적지에 도착했어요!', [
          { text: '확인', onPress: () => router.canGoBack() ? router.back() : router.replace('/') }
        ]);
      }
    } catch (e) {
      console.log('위치 오류:', e);
    }
  };

  const stopRiding = () => {
    clearInterval(intervalRef.current);
    setRiding(false);
    setSelectedStation(null);
    notifiedRef.current = new Set();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.blue} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{routeName}번 버스 탑승</Text>
          <Text style={styles.headerSub}>{routeDestName}</Text>
        </View>
      </View>

      {!riding ? (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={C.blue} />
              <Text style={styles.infoText}>목적지 정류장을 선택하면{'\n'}3, 2, 1 정거장 전에 알려드려요</Text>
            </View>
            <Text style={styles.sectionLabel}>목적지 정류장 선택</Text>
            <View style={styles.stationSearchWrap}>
              <Ionicons name="search" size={16} color={C.gray} />
              <TextInput
                style={styles.stationSearchInput}
                placeholder="정류장 검색"
                placeholderTextColor={C.gray}
                value={stationSearch}
                onChangeText={setStationSearch}
              />
            </View>
            {stationsLoading ? (
              <View style={styles.loadingBox}>
                <Ionicons name="bus" size={32} color={C.blue} />
                <Text style={styles.loadingText}>정류장 불러오는 중...</Text>
              </View>
            ) : stationsError ? (
              <View style={styles.loadingBox}>
                <Ionicons name="alert-circle-outline" size={32} color={C.orange} />
                <Text style={styles.loadingText}>{stationsError}</Text>
                <TouchableOpacity onPress={loadStations} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>다시 시도</Text>
                </TouchableOpacity>
              </View>
            ) : (
              stations
              .filter(s =>
                Number(s.stationSeq) > currentSeq &&
                (stationSearch === '' || s.stationName.includes(stationSearch))
              )
              .map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.stationItem}
                  onPress={() => startRiding(s)}
                >
                  <View style={styles.stationSeqBox}>
                    <Text style={styles.stationSeqText}>{s.stationSeq}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stationName}>{s.stationName}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                      {s.turnYn === 'Y' ? (
                        <View style={{ backgroundColor: '#FFE4E4', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, color: C.red, fontWeight: '700' }}>회차</Text>
                        </View>
                      ) : Number(s.stationSeq) <= turnSeq ? (
                        <View style={{ backgroundColor: C.blueSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, color: C.blue, fontWeight: '700' }}>가는 방향</Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: C.greenSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, color: C.green, fontWeight: '700' }}>오는 방향</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.gray} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.ridingContent}>
          <View style={styles.ridingCard}>
            <Ionicons name="navigate" size={48} color={C.blue} style={{ marginBottom: 16 }} />
            <Text style={styles.ridingTitle}>탑승 중</Text>
            <Text style={styles.ridingDest}>{selectedStation?.stationName}</Text>
            <View style={styles.remainingBox}>
              {remaining === null ? (
                <Text style={[styles.remainingLabel, { fontSize: 14, textAlign: 'center', marginTop: 8 }]}>
                  접근 중인 버스를 찾는 중...
                </Text>
              ) : remaining === 0 ? (
                <Text style={[styles.remainingNum, { fontSize: 36, color: C.green }]}>곧 도착!</Text>
              ) : (
                <>
                  <Text style={styles.remainingNum}>{remaining}</Text>
                  <Text style={styles.remainingLabel}>정거장 남음</Text>
                </>
              )}
            </View>
          </View>
          <View style={styles.alertBox}>
            <Ionicons name="notifications" size={16} color={C.orange} />
            <Text style={styles.alertText}>3, 2, 1 정거장 전에 진동과 알림으로 알려드려요</Text>
          </View>
          <TouchableOpacity style={styles.stopBtn} onPress={stopRiding}>
            <Ionicons name="stop-circle" size={20} color={C.white} />
            <Text style={styles.stopBtnText}>탑승 종료</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  backBtn:    { width: 38, height: 38, borderRadius: 13, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headerTitle:{ fontSize: 16, fontWeight: '800', color: C.dark },
  headerSub:  { fontSize: 12, color: C.gray, marginTop: 1 },
  scroll:  { flex: 1 },
  content: { padding: 20, gap: 12 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: C.blueSoft, borderRadius: 16, padding: 14 },
  infoText:{ fontSize: 13, color: C.blue, fontWeight: '600', lineHeight: 20, flex: 1 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: C.dark },
  loadingBox:   { padding: 40, alignItems: 'center', gap: 12 },
  loadingText:  { color: C.gray, fontSize: 14 },
  stationItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  stationSeqBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' },
  stationSeqText: { fontSize: 11, fontWeight: '700', color: C.blue },
  stationName: { fontSize: 14, fontWeight: '600', color: C.dark },
  ridingContent: { flex: 1, padding: 24, gap: 16, justifyContent: 'center' },
  ridingCard: { backgroundColor: C.white, borderRadius: 28, padding: 32, alignItems: 'center', shadowColor: C.blue, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20 },
  ridingTitle:{ fontSize: 18, fontWeight: '800', color: C.dark, marginBottom: 4 },
  ridingDest: { fontSize: 22, fontWeight: '900', color: C.blue, marginBottom: 24 },
  remainingBox: { alignItems: 'center' },
  remainingNum: { fontSize: 72, fontWeight: '900', color: C.blue, lineHeight: 80 },
  remainingLabel: { fontSize: 16, color: C.gray, fontWeight: '600' },
  alertBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.orangeSoft, borderRadius: 14, padding: 14 },
  alertText: { fontSize: 13, color: C.orange, fontWeight: '600', flex: 1 },
  stopBtn: { backgroundColor: C.red, borderRadius: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  stopBtnText: { fontSize: 16, fontWeight: '800', color: C.white },
  retryBtn: { backgroundColor: C.blue, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: C.white },
  stationSearchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  stationSearchInput: { flex: 1, fontSize: 14, color: C.dark },
});