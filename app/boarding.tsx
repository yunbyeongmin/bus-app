import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, SafeAreaView, StatusBar, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { getBusArrival } from '../api';

const C = {
  blue: '#4F8EF7', blueSoft: '#EBF2FF',
  green: '#2ECC8A', greenSoft: '#E5FBF3',
  orange: '#FF7A3D', orangeSoft: '#FFF0E8',
  purple: '#A259FF', purpleSoft: '#F3EBFF',
  red: '#FF4D6A',
  dark: '#1A1F36', gray: '#9BA3BF', bg: '#F0F4FF', white: '#FFFFFF',
};

const TYPES = [
  { icon: 'eye-off',       label: '시각장애',    color: C.blue,   bg: C.blueSoft },
  { icon: 'accessibility', label: '휠체어',      color: C.green,  bg: C.greenSoft },
  { icon: 'person',        label: '교통약자',    color: C.orange, bg: C.orangeSoft },
  { icon: 'bandage',       label: '일시적 불편', color: C.purple, bg: C.purpleSoft },
];

export default function BoardingScreen() {
  const router = useRouter();
  const { routeName, routeDestName, predictTime1, stationId, routeId } = useLocalSearchParams<{
    routeName: string; routeDestName: string; predictTime1: string;
    stationId: string; routeId: string;
  }>();

  const [step, setStep] = useState<'select' | 'waiting' | 'arrive'>('select');
  const [selectedType, setSelectedType] = useState(0);
  const [eta, setEta] = useState<number>(Number(predictTime1) || 0);
  const intervalRef = useRef<any>(null);
  const notifiedRef = useRef<Set<number>>(new Set());
  const firstCheckRef = useRef(true); // 첫 번째 체크는 건너뜀
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  // 탭 화면이라 재진입 시 상태 초기화
  useFocusEffect(
    React.useCallback(() => {
      setStep('select');
      setSelectedType(0);
      setEta(Number(predictTime1) || 0);
      notifiedRef.current = new Set();
      firstCheckRef.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    }, [predictTime1])
  );

  // 박동 애니메이션 (대기 중)
  useEffect(() => {
    if (step !== 'waiting') return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.00, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [step]);

  // 도착 시간 실시간 갱신
  useEffect(() => {
    if (step !== 'waiting') return;
    const refresh = async () => {
      try {
        if (!stationId) return;
        // 첫 번째 호출은 ETA 업데이트만 하고 알림/도착 로직 건너뜀
        if (firstCheckRef.current) {
          firstCheckRef.current = false;
          return;
        }
        const data = await getBusArrival(String(stationId));
        const target = data.find((b: any) => String(b.routeId) === String(routeId));
        if (!target) return;
        const newEta = Number(target.predictTime1);
        setEta(newEta);

        // 3분 전 알림
        if (newEta <= 3 && !notifiedRef.current.has(3)) {
          notifiedRef.current.add(3);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${routeName}번 버스`,
              body: '3분 후 도착! 손을 들 준비를 해주세요.',
              sound: true,
            },
            trigger: null,
          });
        }

        // 1분 전 강한 진동
        if (newEta <= 1 && !notifiedRef.current.has(1)) {
          notifiedRef.current.add(1);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🚌 ${routeName}번 버스 곧 도착!`,
              body: '지금 손을 들어주세요!',
              sound: true,
            },
            trigger: null,
          });
          setStep('arrive');
          clearInterval(intervalRef.current);
        }
      } catch (e) {
        console.log('도착 시간 갱신 오류:', e);
      }
    };

    refresh();
    intervalRef.current = setInterval(refresh, 15000);
    return () => clearInterval(intervalRef.current);
  }, [step]);

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    firstCheckRef.current = true; // 다시 대기 시작할 때 초기화
    setStep('waiting');
  };

  const handleCancel = () => {
    clearInterval(intervalRef.current);
    router.canGoBack() ? router.back() : router.replace('/');
  };

  // ── 화면 1: 유형 선택 ──────────────────────────────
  if (step === 'select') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.blue} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>저상버스 탑승 의사 표시</Text>
            <Text style={styles.headerSub}>기사님께 미리 알려드려요</Text>
          </View>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>

            {/* 버스 정보 카드 */}
            <LinearGradient colors={['#4F8EF7', '#2E6FD8']} style={styles.busCard}>
              <View style={styles.busNumBox}>
                <Ionicons name="accessibility" size={20} color={C.white} />
                <Text style={styles.busNum}>{routeName}</Text>
              </View>
              <View style={styles.busCardInfo}>
                <Text style={styles.busCardName}>{routeName}번 저상버스</Text>
                <Text style={styles.busCardDetail}>{routeDestName} 방면</Text>
                {eta > 0 && (
                  <View style={styles.arrivalBadge}>
                    <Text style={styles.arrivalText}>약 {eta}분 후 도착</Text>
                  </View>
                )}
              </View>
            </LinearGradient>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={18} color={C.blue} />
              <Text style={styles.infoText}>
                버스 도착 1분 전에 진동과 알림으로 알려드려요.{'\n'}
                손을 들어 탑승 의사를 표시해주세요!
              </Text>
            </View>

            {/* 탑승 유형 */}
            <Text style={styles.sectionLabel}>탑승 유형을 선택해주세요</Text>
            <View style={styles.typeGrid}>
              {TYPES.map((t, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.8}
                  onPress={() => setSelectedType(i)}
                  style={[
                    styles.typeCard,
                    { backgroundColor: t.bg },
                    selectedType === i && { borderWidth: 2.5, borderColor: t.color },
                  ]}
                >
                  <Ionicons name={t.icon as any} size={22} color={t.color} />
                  <Text style={[styles.typeLabel, { color: t.color }]}>{t.label}</Text>
                  {selectedType === i && (
                    <Ionicons name="checkmark-circle" size={18} color={t.color} style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* 확인 버튼 */}
            <TouchableOpacity activeOpacity={0.9} onPress={handleConfirm}>
              <LinearGradient colors={['#2ECC8A', '#1A9C6A']} style={styles.bigBtn}>
                <Ionicons name="hand-left" size={24} color="white" />
                <Text style={styles.bigBtnText}> 이 버스를 탈게요!</Text>
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 화면 2: 대기 중 ────────────────────────────────
  if (step === 'waiting') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.white }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.blue} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{routeName}번 버스 대기 중</Text>
            <Text style={styles.headerSub}>{TYPES[selectedType].label} · {routeDestName}</Text>
          </View>
        </View>

        <View style={styles.waitingContent}>
          <Animated.View style={[styles.etaCircle, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient colors={['#4F8EF7', '#2E6FD8']} style={styles.etaCircleInner}>
              <Text style={styles.etaNum}>{eta}</Text>
              <Text style={styles.etaUnit}>분</Text>
            </LinearGradient>
          </Animated.View>

          <Text style={styles.waitingTitle}>버스가 오고 있어요</Text>
          <Text style={styles.waitingDesc}>
            도착 1분 전에 진동으로 알려드릴게요{'\n'}
            정류장에서 대기해주세요
          </Text>

          <View style={styles.typeDisplayBox}>
            <Ionicons
              name={TYPES[selectedType].icon as any}
              size={20}
              color={TYPES[selectedType].color}
            />
            <Text style={[styles.typeDisplayText, { color: TYPES[selectedType].color }]}>
              {TYPES[selectedType].label} 탑승
            </Text>
          </View>

          <View style={styles.alertRow}>
            <Ionicons name="notifications" size={16} color={C.orange} />
            <Text style={styles.alertText}>3분, 1분 전 자동 알림 설정됨</Text>
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>탑승 취소</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── 화면 3: 도착! ──────────────────────────────────
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.green }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.arriveContent}>
        <Ionicons name="hand-left" size={80} color={C.white} />
        <Text style={styles.arriveTitle}>지금 손을 들어주세요!</Text>
        <Text style={styles.arriveDesc}>{routeName}번 버스가 곧 도착해요</Text>

        <View style={styles.arriveCard}>
          <Text style={styles.arriveCardTitle}>{TYPES[selectedType].label} 탑승</Text>
          <Text style={styles.arriveCardDesc}>기사님께 탑승 의사가 전달됐어요</Text>
        </View>

        <TouchableOpacity
          style={styles.arriveDoneBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
        >
          <Text style={styles.arriveDoneBtnText}>확인</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  header:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 13, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' },
  headerInfo:  { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.dark },
  headerSub:   { fontSize: 12, color: C.gray, marginTop: 1 },
  content:  { padding: 20, gap: 16 },

  busCard:  { borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, shadowColor: C.blue, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
  busNumBox:   { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', gap: 2 },
  busNum:      { fontSize: 18, fontWeight: '900', color: C.white },
  busCardInfo: { flex: 1 },
  busCardName:   { fontSize: 16, fontWeight: '800', color: C.white },
  busCardDetail: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  arrivalBadge:  { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginTop: 8 },
  arrivalText:   { fontSize: 12, fontWeight: '700', color: C.white },

  infoBox:  { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: C.blueSoft, borderRadius: 16, padding: 14 },
  infoText: { flex: 1, fontSize: 13, color: C.blue, fontWeight: '600', lineHeight: 20 },

  sectionLabel: { fontSize: 15, fontWeight: '800', color: C.dark },
  typeGrid: { gap: 10 },
  typeCard: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  typeLabel:{ fontSize: 15, fontWeight: '700' },

  bigBtn:     { borderRadius: 22, paddingVertical: 22, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', shadowColor: C.green, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20 },
  bigBtnText: { fontSize: 20, fontWeight: '900', color: C.white },

  // 대기 화면
  waitingContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  etaCircle:      { marginBottom: 8 },
  etaCircleInner: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', shadowColor: C.blue, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 24 },
  etaNum:    { fontSize: 64, fontWeight: '900', color: C.white, lineHeight: 70 },
  etaUnit:   { fontSize: 20, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  waitingTitle: { fontSize: 24, fontWeight: '900', color: C.dark },
  waitingDesc:  { fontSize: 15, color: C.gray, textAlign: 'center', lineHeight: 22 },
  typeDisplayBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  typeDisplayText: { fontSize: 15, fontWeight: '700' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertText: { fontSize: 13, color: C.orange, fontWeight: '600' },
  cancelBtn: { marginTop: 8, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16, backgroundColor: C.bg },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: C.gray },

  // 도착 화면
  arriveContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 24 },
  arriveTitle:   { fontSize: 32, fontWeight: '900', color: C.white, textAlign: 'center' },
  arriveDesc:    { fontSize: 18, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  arriveCard:    { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 20, width: '100%', alignItems: 'center', gap: 6 },
  arriveCardTitle: { fontSize: 18, fontWeight: '800', color: C.white },
  arriveCardDesc:  { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  arriveDoneBtn:   { backgroundColor: C.white, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 48, marginTop: 8 },
  arriveDoneBtnText: { fontSize: 18, fontWeight: '800', color: C.green },
});
