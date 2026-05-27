import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const C = {
  blue: '#4F8EF7', blueSoft: '#EBF2FF',
  green: '#2ECC8A', greenSoft: '#E5FBF3',
  orange: '#FF7A3D', dark: '#1A1F36',
  gray: '#9BA3BF', bg: '#F0F4FF', white: '#FFFFFF',
};

export default function OnboardingScreen() {
  const router = useRouter();

  const handleSelect = async (mode: 'normal' | 'disabled') => {
    await AsyncStorage.setItem('userMode', mode);
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>

        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="bus" size={48} color={C.blue} />
          </View>
          <Text style={styles.title}>버스 승차 지원 앱</Text>
          <Text style={styles.sub}>포천 버스 실시간 정보를 제공해드려요</Text>
          <Text style={styles.sub2}>30906 윤병민 · 30908 이규빈 · 30913 최솔</Text>
        </View>

        <View style={styles.question}>
          <Text style={styles.questionText}>어떤 모드로 이용하실 건가요?</Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => handleSelect('normal')}
            style={styles.modeCard}
          >
            <LinearGradient colors={['#4F8EF7', '#2E6FD8']} style={styles.modeGradient}>
              <Ionicons name="person" size={36} color={C.white} />
              <Text style={styles.modeTitle}>비장애인 모드</Text>
              <Text style={styles.modeSub}>실시간 버스 정보 조회</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => handleSelect('disabled')}
            style={styles.modeCard}
          >
            <LinearGradient colors={['#2ECC8A', '#1A9C6A']} style={styles.modeGradient}>
              <Ionicons name="accessibility" size={36} color={C.white} />
              <Text style={styles.modeTitle}>장애인 모드</Text>
              <Text style={styles.modeSub}>승차 의사 표시 기능 포함</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>나중에 설정에서 변경할 수 있어요</Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 32 },
  hero:    { alignItems: 'center', gap: 10 },
  iconWrap:{ width: 96, height: 96, borderRadius: 28, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title:   { fontSize: 26, fontWeight: '900', color: C.dark, letterSpacing: -0.5 },
  sub:     { fontSize: 14, color: C.gray, textAlign: 'center' },
  sub2:    { fontSize: 12, color: C.gray, textAlign: 'center', marginTop: 4 },
  question:    { alignItems: 'center' },
  questionText:{ fontSize: 18, fontWeight: '800', color: C.dark },
  buttons: { gap: 14 },
  modeCard:     { borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
  modeGradient: { padding: 28, alignItems: 'center', gap: 8 },
  modeTitle:    { fontSize: 20, fontWeight: '900', color: C.white },
  modeSub:      { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  hint:    { textAlign: 'center', fontSize: 12, color: C.gray },
});