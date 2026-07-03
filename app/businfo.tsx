import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBusLocation } from '../api';

const C = {
  blue: '#4F8EF7', blueSoft: '#EBF2FF',
  green: '#2ECC8A', greenSoft: '#E5FBF3',
  orange: '#FF7A3D', dark: '#1A1F36',
  gray: '#9BA3BF', bg: '#F0F4FF', white: '#FFFFFF',
};

const STATE_LABELS: Record<number, string> = {
  0: '정류장 출발',
  1: '정류장 도착',
  2: '운행 중',
};

const CROWDED_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: '여유', color: C.green },
  1: { label: '보통', color: C.orange },
  2: { label: '혼잡', color: '#FF4D6A' },
};

export default function BusInfoScreen() {
  const router = useRouter();
  const { routeName, routeId, routeDestName, startStationName } = useLocalSearchParams();
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const load = async (id: string) => {
    try {
      const locs = await getBusLocation(id);
      setBuses(locs);
      const now = new Date();
      setLastUpdated(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
    } catch (e) {
      console.log('오류:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!routeId) return;
    const id = String(routeId);
    load(id);
    const interval = setInterval(() => load(id), 15000);
    return () => clearInterval(interval);
  }, [routeId]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.blue} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{routeName}번 버스 실시간 위치</Text>
          <Text style={styles.headerSub}>{startStationName} → {routeDestName}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Ionicons name="bus" size={20} color={C.blue} />
              <Text style={styles.summaryText}>현재 운행 중인 버스 <Text style={styles.summaryNum}>{buses.length}대</Text></Text>
            </View>
            {lastUpdated && (
              <Text style={styles.updatedText}>마지막 업데이트: {lastUpdated} (15초마다 자동갱신)</Text>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <Ionicons name="bus" size={32} color={C.blue} />
              <Text style={styles.loadingText}>버스 위치 불러오는 중...</Text>
            </View>
          ) : buses.length === 0 ? (
            <View style={styles.loadingBox}>
              <Ionicons name="alert-circle" size={32} color={C.gray} />
              <Text style={styles.loadingText}>현재 운행 중인 버스가 없어요</Text>
            </View>
          ) : (
            buses.map((b, i) => (
              <View key={i} style={styles.busCard}>
                <View style={styles.busCardHeader}>
                  <View style={styles.plateBox}>
                    <Ionicons name="bus" size={16} color={C.blue} />
                    <Text style={styles.plateText}>{b.plateNo}</Text>
                  </View>
                  <View style={[styles.stateBadge, { backgroundColor: b.stateCd === 2 ? C.greenSoft : C.blueSoft }]}>
                    <Text style={[styles.stateText, { color: b.stateCd === 2 ? C.green : C.blue }]}>
                      {STATE_LABELS[b.stateCd] ?? '운행 중'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="location" size={14} color={C.gray} />
                  <Text style={styles.infoText}>현재 위치: <Text style={styles.infoHighlight}>{b.stationName ?? `${b.stationSeq}번째 정류장`}</Text></Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="navigate" size={14} color={C.gray} />
                  <Text style={styles.infoText}>노선 순서: <Text style={styles.infoHighlight}>{b.stationSeq}번째 정류장</Text></Text>
                </View>

                {b.remainSeatCnt >= 0 && (
                  <View style={styles.infoRow}>
                    <Ionicons name="people" size={14} color={C.gray} />
                    <Text style={styles.infoText}>
                      잔여 좌석: <Text style={styles.infoHighlight}>{b.remainSeatCnt}석</Text>
                      {'  '}
                      {CROWDED_LABELS[b.crowded] && (
                        <Text style={{ color: CROWDED_LABELS[b.crowded].color, fontWeight: '700' }}>
                          {CROWDED_LABELS[b.crowded].label}
                        </Text>
                      )}
                    </Text>
                  </View>
                )}

                {b.lowPlate === 1 && (
                  <View style={styles.lowFloor}>
                    <Ionicons name="accessibility" size={11} color={C.green} />
                    <Text style={styles.lowFloorText}> 저상버스</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.rideBtn}
                  onPress={() => router.push({
                    pathname: '/riding',
                    params: { routeName, routeId, routeDestName }
                  })}
                >
                  <Ionicons name="bus" size={14} color={C.white} />
                  <Text style={styles.rideBtnText}> 이 버스 탑승하기</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
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
  scroll:  { flex: 1 },
  content: { padding: 20, gap: 12 },
  summaryCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  summaryRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText: { fontSize: 14, color: C.dark, fontWeight: '600' },
  summaryNum:  { fontSize: 16, fontWeight: '900', color: C.blue },
  updatedText: { fontSize: 11, color: C.gray },
  loadingBox:  { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { color: C.gray, fontSize: 14 },
  busCard:     { backgroundColor: C.white, borderRadius: 18, padding: 16, gap: 10, shadowColor: '#1A1F36', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
  busCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plateBox:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  plateText:   { fontSize: 14, fontWeight: '800', color: C.dark },
  stateBadge:  { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  stateText:   { fontSize: 12, fontWeight: '700' },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText:    { fontSize: 13, color: C.gray },
  infoHighlight: { color: C.dark, fontWeight: '700' },
  lowFloor:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.greenSoft, alignSelf: 'flex-start', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2 },
  lowFloorText:{ fontSize: 11, fontWeight: '700', color: C.green },
  rideBtn:     { backgroundColor: C.blue, borderRadius: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  rideBtnText: { fontSize: 13, fontWeight: '700', color: C.white },
});