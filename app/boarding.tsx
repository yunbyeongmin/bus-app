import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, SafeAreaView, StatusBar, ScrollView,
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

const TYPES = [
  { icon: 'eye-off',       label: '시각장애',    color: C.blue,   bg: C.blueSoft },
  { icon: 'accessibility', label: '휠체어',      color: C.green,  bg: C.greenSoft },
  { icon: 'person',        label: '교통약자',    color: C.orange, bg: C.orangeSoft },
  { icon: 'bandage',       label: '일시적 불편', color: C.purple, bg: C.purpleSoft },
];

export default function BoardingScreen() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [selectedType, setSelectedType] = useState(0);
  const scale   = useRef(new Animated.Value(1)).current;
  const success = useRef(new Animated.Value(0)).current;

  const handleBoard = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.02, duration: 200, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.00, duration: 150, useNativeDriver: true }),
    ]).start();
    Animated.timing(success, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }).start();
    setSent(true);
  };

  const successOpacity = success.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const successSlide   = success.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.blue} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>승차 의사 표시</Text>
          <Text style={styles.headerSub}>버스 기사에게 알림을 전송합니다</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          <LinearGradient colors={['#4F8EF7', '#2E6FD8']} style={styles.busCard}>
            <View style={styles.busNumBox}>
              <Text style={styles.busNum}>16</Text>
            </View>
            <View style={styles.busCardInfo}>
              <Text style={styles.busCardName}>16번 버스</Text>
              <Text style={styles.busCardDetail}>의정부역 방면 · 포천시청 정류장</Text>
              <View style={styles.arrivalBadge}>
                <Text style={styles.arrivalText}>⏰ 약 3분 후 도착</Text>
              </View>
            </View>
          </LinearGradient>

          {sent && (
            <Animated.View style={[styles.sentBox, { opacity: successOpacity, transform: [{ translateY: successSlide }] }]}>
              <Ionicons name="checkmark-circle" size={22} color={C.green} />
              <Text style={styles.sentText}>기사님께 승차 알림이 전달되었어요!</Text>
            </Animated.View>
          )}

          <Text style={styles.sectionLabel}>탑승 유형 선택</Text>
          <View style={styles.typeGrid}>
            {TYPES.map((t, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.8}
                onPress={() => setSelectedType(i)}
                style={[
                  styles.typeCard,
                  { backgroundColor: t.bg },
                  selectedType === i && { borderWidth: 2, borderColor: t.color },
                ]}
              >
                <Ionicons name={t.icon as any} size={20} color={t.color} />
                <Text style={[styles.typeLabel, { color: t.color }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity activeOpacity={0.9} onPress={handleBoard}>
              <LinearGradient
                colors={sent ? ['#1A9C6A', '#0E7A52'] : ['#2ECC8A', '#1A9C6A']}
                style={styles.bigBtn}
              >
                <Ionicons name={sent ? 'checkmark' : 'hand-left'} size={22} color="white" />
                <Text style={styles.bigBtnText}>
                  {sent ? ' 전송 완료!' : ' 이 버스를 탈게요!'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity activeOpacity={0.88} style={styles.secondBtn}>
            <Ionicons name="accessibility" size={18} color={C.orange} />
            <Text style={styles.secondBtnText}> 휠체어 탑승 안내 요청</Text>
          </TouchableOpacity>

          <View style={styles.warningBox}>
            <Ionicons name="warning" size={18} color="#B7791F" />
            <Text style={styles.warningText}>
              버스가 정류장에 가까워지면 자동으로 음성 안내가 시작돼요. 준비해주세요!
            </Text>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  header:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  backBtn: { width: 38, height: 38, borderRadius: 13, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' },
  headerInfo:  { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.dark },
  headerSub:   { fontSize: 12, color: C.gray, marginTop: 1 },
  content:  { padding: 20, gap: 14 },
  busCard:  { borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, shadowColor: C.blue, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20 },
  busNumBox:   { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  busNum:      { fontSize: 22, fontWeight: '900', color: C.white },
  busCardInfo: { flex: 1 },
  busCardName:   { fontSize: 16, fontWeight: '800', color: C.white },
  busCardDetail: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  arrivalBadge:  { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginTop: 8 },
  arrivalText:   { fontSize: 12, fontWeight: '700', color: C.white },
  sentBox:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.greenSoft, borderRadius: 16, padding: 14 },
  sentText: { fontSize: 14, fontWeight: '600', color: C.green, flex: 1 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: C.dark },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: { width: '47%', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  typeLabel:{ fontSize: 13, fontWeight: '700' },
  bigBtn:   { borderRadius: 22, paddingVertical: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', shadowColor: C.green, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20 },
  bigBtnText:    { fontSize: 18, fontWeight: '900', color: C.white },
  secondBtn:     { backgroundColor: C.orangeSoft, borderRadius: 18, paddingVertical: 17, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  secondBtnText: { fontSize: 15, fontWeight: '700', color: C.orange },
  warningBox:  { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#FFF8E1', borderRadius: 16, padding: 14 },
  warningText: { flex: 1, fontSize: 13, color: '#B7791F', fontWeight: '600', lineHeight: 19 },
});