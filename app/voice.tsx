import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, SafeAreaView, StatusBar, ScrollView, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const C = {
  blue: '#4F8EF7', blueSoft: '#EBF2FF',
  green: '#2ECC8A', greenSoft: '#E5FBF3',
  orange: '#FF7A3D', orangeSoft: '#FFF0E8',
  purple: '#A259FF', purpleSoft: '#F3EBFF',
  dark: '#1A1F36', gray: '#9BA3BF', bg: '#F0F4FF', white: '#FFFFFF',
};

const SPEEDS = ['0.75×', '1.0×', '1.25×', '1.5×'];

const TOGGLES = [
  { icon: 'notifications', label: '버스 도착 알림',    sub: '정류장 도착 전 음성으로 안내', color: C.blue,   bg: C.blueSoft,   init: true },
  { icon: 'location',      label: '현재 위치 안내',    sub: '버스 위치를 실시간 음성 안내', color: C.green,  bg: C.greenSoft,  init: true },
  { icon: 'phone-portrait',label: '진동 함께 알림',    sub: '음성과 함께 진동으로도 알림',  color: C.orange, bg: C.orangeSoft, init: true },
  { icon: 'accessibility', label: '저상버스 우선 안내', sub: '저상버스만 음성 알림',         color: C.purple, bg: C.purpleSoft, init: false },
];

function WaveBar({ delay, maxH }: { delay: number; maxH: number }) {
  const anim = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: maxH, duration: 500 + delay * 80, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 8,    duration: 500 + delay * 80, useNativeDriver: false }),
      ])
    );
    const timer = setTimeout(() => loop.start(), delay * 60);
    return () => { clearTimeout(timer); loop.stop(); };
  }, []);
  return <Animated.View style={[styles.waveBar, { height: anim }]} />;
}

export default function VoiceScreen() {
  const router = useRouter();
  const [toggles, setToggles] = useState(TOGGLES.map(t => t.init));
  const [speed, setSpeed] = useState(1);
  const [testing, setTesting] = useState(false);
  const testScale = useRef(new Animated.Value(1)).current;

  const flip = (i: number) => {
    const next = [...toggles];
    next[i] = !next[i];
    setToggles(next);
  };

  const runTest = () => {
    setTesting(true);
    Animated.sequence([
      Animated.timing(testScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(testScale, { toValue: 1.0,  duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setTesting(false), 2800);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.blue} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>음성 안내 설정</Text>
          <Text style={styles.headerSub}>시각장애 & 교통약자 편의 기능</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          <LinearGradient colors={['#A259FF', '#7C3AFF']} style={styles.hero}>
            <View style={styles.waveRow}>
              {[0,1,2,3,4,5,6].map(i => (
                <WaveBar key={i} delay={i} maxH={[28,40,48,36,44,32,40][i]} />
              ))}
            </View>
            <Ionicons name="volume-high" size={20} color="white" style={{ marginBottom: 6 }} />
            <Text style={styles.heroTitle}>음성 안내 활성화됨</Text>
            <Text style={styles.heroSub}>"16번 버스가 2정거장 앞에 있습니다"</Text>
          </LinearGradient>

          {TOGGLES.map((t, i) => (
            <View key={i} style={styles.toggleRow}>
              <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
                <Ionicons name={t.icon as any} size={20} color={t.color} />
              </View>
              <View style={styles.toggleText}>
                <Text style={styles.toggleLabel}>{t.label}</Text>
                <Text style={styles.toggleSub}>{t.sub}</Text>
              </View>
              <Switch
                value={toggles[i]}
                onValueChange={() => flip(i)}
                trackColor={{ false: '#E0E5F2', true: t.color }}
                thumbColor={C.white}
                ios_backgroundColor="#E0E5F2"
              />
            </View>
          ))}

          <View style={styles.speedCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Ionicons name="options" size={16} color={C.dark} />
              <Text style={styles.speedTitle}>음성 속도</Text>
            </View>
            <View style={styles.speedRow}>
              {SPEEDS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.8}
                  onPress={() => setSpeed(i)}
                  style={[styles.speedOpt, speed === i && styles.speedOptActive]}
                >
                  <Text style={[styles.speedNum, speed === i && styles.speedNumActive]}>{s}</Text>
                  <Text style={[styles.speedHint, speed === i && { color: C.purple }]}>
                    {['느리게','보통','빠르게','매우 빠름'][i]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: testScale }] }}>
            <TouchableOpacity activeOpacity={0.88} onPress={runTest}>
              <LinearGradient
                colors={testing ? ['#2ECC8A', '#1A9C6A'] : ['#A259FF', '#7C3AFF']}
                style={styles.testBtn}
              >
                <Ionicons name={testing ? 'volume-high' : 'play'} size={18} color="white" />
                <Text style={styles.testBtnText}>
                  {testing ? '  "16번 버스가 2정거장 앞에 있습니다"' : '  음성 안내 테스트'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 20 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  backBtn:     { width: 38, height: 38, borderRadius: 13, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' },
  headerInfo:  { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.dark },
  headerSub:   { fontSize: 12, color: C.gray, marginTop: 1 },
  content: { padding: 20, gap: 12 },
  hero:     { borderRadius: 28, padding: 28, alignItems: 'center', shadowColor: C.purple, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20 },
  waveRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 54, marginBottom: 16 },
  waveBar:  { width: 6, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 3 },
  heroTitle:{ fontSize: 16, fontWeight: '700', color: C.white, marginBottom: 4 },
  heroSub:  { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  toggleRow:  { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, borderRadius: 20, padding: 16, shadowColor: '#1A1F36', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10 },
  iconWrap:   { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  toggleText: { flex: 1 },
  toggleLabel:{ fontSize: 14, fontWeight: '700', color: C.dark },
  toggleSub:  { fontSize: 12, color: C.gray, marginTop: 2 },
  speedCard:  { backgroundColor: C.white, borderRadius: 20, padding: 18, shadowColor: '#1A1F36', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10 },
  speedTitle: { fontSize: 14, fontWeight: '700', color: C.dark },
  speedRow:   { flexDirection: 'row', gap: 8 },
  speedOpt:   { flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 2, borderColor: '#E0E5F2' },
  speedOptActive: { backgroundColor: C.purpleSoft, borderColor: C.purple },
  speedNum:   { fontSize: 13, fontWeight: '800', color: C.gray },
  speedNumActive: { color: C.purple },
  speedHint:  { fontSize: 10, color: C.gray, marginTop: 2 },
  testBtn:    { borderRadius: 20, paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 16 },
  testBtnText:{ fontSize: 15, fontWeight: '800', color: C.white },
});