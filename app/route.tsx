import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchStations, getBusArrival } from '../api';

const C = {
  blue: '#4F8EF7', blueSoft: '#EBF2FF',
  green: '#2ECC8A', greenSoft: '#E5FBF3',
  orange: '#FF7A3D', dark: '#1A1F36',
  gray: '#9BA3BF', bg: '#F0F4FF', white: '#FFFFFF',
};

const ROUTE_COLORS: Record<number, string> = {
  11: '#FF7A3D', 12: '#4F8EF7', 13: '#2ECC8A',
  14: '#A259FF', 15: '#FF4D6A', 30: '#2ECC8A',
};

function getColor(typeCd: number) {
  return ROUTE_COLORS[typeCd] ?? C.blue;
}

export default function RouteScreen() {
  const router = useRouter();
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [fromResults, setFromResults] = useState<any[]>([]);
  const [toResults, setToResults] = useState<any[]>([]);
  const [fromStation, setFromStation] = useState<any>(null);
  const [toStation, setToStation] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeInput, setActiveInput] = useState<'from' | 'to' | null>(null);

  const handleFromSearch = async (text: string) => {
    setFromText(text);
    setFromStation(null);
    if (text.length >= 1) {
      const res = await searchStations(text);
      setFromResults(Array.isArray(res) ? res.filter((s: any) => s.regionName?.includes('포천')) : []);
    } else {
      setFromResults([]);
    }
  };

  const handleToSearch = async (text: string) => {
    setToText(text);
    setToStation(null);
    if (text.length >= 1) {
      const res = await searchStations(text);
      setToResults(Array.isArray(res) ? res.filter((s: any) => s.regionName?.includes('포천')) : []);
    } else {
      setToResults([]);
    }
  };

  const search = async () => {
    if (!fromStation || !toStation) return;
    setLoading(true);
    setSearched(true);
    try {
      const fromBuses = await getBusArrival(String(fromStation.stationId));
      const toBuses = await getBusArrival(String(toStation.stationId));
      const toRouteIds = new Set(toBuses.map((b: any) => b.routeId));
      const common = fromBuses.filter((b: any) => toRouteIds.has(b.routeId));
      setResults(common);
    } catch (e) {
      console.log('오류:', e);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>경로 검색</Text>
        <Text style={styles.headerSub}>두 정류장을 모두 지나는 버스를 찾아요</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>

          {/* 출발지 */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>출발 정류장</Text>
            <View style={[styles.inputBar, fromStation && styles.inputBarSelected]}>
              <Ionicons name="radio-button-on" size={16} color={C.green} />
              <TextInput
                style={styles.input}
                placeholder="출발 정류장 검색"
                placeholderTextColor={C.gray}
                value={fromText}
                onChangeText={handleFromSearch}
                onFocus={() => setActiveInput('from')}
              />
              {fromStation && <Ionicons name="checkmark-circle" size={16} color={C.green} />}
            </View>
            {activeInput === 'from' && fromResults.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.resultItem}
                onPress={() => {
                  setFromStation(s);
                  setFromText(s.stationName);
                  setFromResults([]);
                  setActiveInput(null);
                }}
              >
                <Text style={styles.resultName}>{s.stationName}</Text>
                <Text style={styles.resultSub}>{s.mobileNo?.trim()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 화살표 */}
          <View style={styles.arrowWrap}>
            <View style={styles.arrowLine} />
            <View style={styles.arrowCircle}>
              <Ionicons name="arrow-down" size={16} color={C.blue} />
            </View>
            <View style={styles.arrowLine} />
          </View>

          {/* 도착지 */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>도착 정류장</Text>
            <View style={[styles.inputBar, toStation && styles.inputBarSelected]}>
              <Ionicons name="location" size={16} color={C.orange} />
              <TextInput
                style={styles.input}
                placeholder="도착 정류장 검색"
                placeholderTextColor={C.gray}
                value={toText}
                onChangeText={handleToSearch}
                onFocus={() => setActiveInput('to')}
              />
              {toStation && <Ionicons name="checkmark-circle" size={16} color={C.green} />}
            </View>
            {activeInput === 'to' && toResults.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.resultItem}
                onPress={() => {
                  setToStation(s);
                  setToText(s.stationName);
                  setToResults([]);
                  setActiveInput(null);
                }}
              >
                <Text style={styles.resultName}>{s.stationName}</Text>
                <Text style={styles.resultSub}>{s.mobileNo?.trim()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 검색 버튼 */}
          <TouchableOpacity
            style={[styles.searchBtn, (!fromStation || !toStation) && styles.searchBtnDisabled]}
            onPress={search}
            disabled={!fromStation || !toStation}
          >
            <Ionicons name="search" size={18} color={C.white} />
            <Text style={styles.searchBtnText}>버스 검색</Text>
          </TouchableOpacity>

          {/* 결과 */}
          {loading ? (
            <View style={styles.loadingBox}>
              <Ionicons name="bus" size={32} color={C.blue} />
              <Text style={styles.loadingText}>버스 찾는 중...</Text>
            </View>
          ) : searched && results.length === 0 ? (
            <View style={styles.loadingBox}>
              <Ionicons name="alert-circle" size={32} color={C.gray} />
              <Text style={styles.loadingText}>두 정류장을 모두 지나는 버스가 없어요</Text>
            </View>
          ) : results.length > 0 ? (
            <View style={styles.resultList}>
              <Text style={styles.resultTitle}>{results.length}개의 버스가 있어요</Text>
              {results.map((b, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.busCard}
                  onPress={() => router.push({
                    pathname: '/businfo',
                    params: { routeName: b.routeName, routeDestName: b.routeDestName, routeId: b.routeId, startStationName: fromStation.stationName },
                  })}
                >
                  <View style={[styles.busNumBox, { backgroundColor: getColor(b.routeTypeCd) }]}>
                    <Text style={styles.busNum}>{b.routeName}</Text>
                  </View>
                  <View style={styles.busInfo}>
                    <Text style={styles.busDest}>{b.routeName}번 — {b.routeDestName}</Text>
                    {b.predictTime1 ? (
                      <Text style={styles.busEta}>{b.predictTime1}분 후 도착</Text>
                    ) : (
                      <Text style={styles.busEtaGray}>도착 정보 없음</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.gray} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, backgroundColor: C.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: C.dark },
  headerSub: { fontSize: 13, color: C.gray, marginTop: 3 },
  scroll:  { flex: 1 },
  content: { padding: 20, gap: 16 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: C.gray, paddingLeft: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  inputBarSelected: { borderWidth: 1.5, borderColor: C.blue },
  input: { flex: 1, fontSize: 14, color: C.dark },
  resultItem: { backgroundColor: C.white, padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  resultName: { fontSize: 13, fontWeight: '600', color: C.dark },
  resultSub:  { fontSize: 11, color: C.gray },
  arrowWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  arrowLine:  { flex: 1, height: 1, backgroundColor: '#E0E5F2' },
  arrowCircle:{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' },
  searchBtn: { backgroundColor: C.blue, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  searchBtnDisabled: { backgroundColor: '#C0CCEE' },
  searchBtnText: { fontSize: 16, fontWeight: '800', color: C.white },
  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { color: C.gray, fontSize: 14, textAlign: 'center' },
  resultList: { gap: 10 },
  resultTitle: { fontSize: 15, fontWeight: '800', color: C.dark, marginBottom: 4 },
  busCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, borderRadius: 18, padding: 14, shadowColor: '#1A1F36', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
  busNumBox: { width: 54, height: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  busNum:    { fontSize: 13, fontWeight: '900', color: C.white },
  busInfo:   { flex: 1, gap: 4 },
  busDest:   { fontSize: 14, fontWeight: '700', color: C.dark },
  busEta:    { fontSize: 13, fontWeight: '700', color: C.blue },
  busEtaGray:{ fontSize: 12, color: C.gray },
});
