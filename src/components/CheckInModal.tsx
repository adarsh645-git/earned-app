import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CheckInResult } from '../store/economyStore';

interface CheckInModalProps {
  visible: boolean;
  checkInResult: CheckInResult | null;
  onClose: () => void;
}

export default function CheckInModal({ visible, checkInResult, onClose }: CheckInModalProps) {
  if (!visible || !checkInResult || !checkInResult.rewarded) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 360, backgroundColor: '#0E0E10', borderWidth: 1, borderColor: '#F59E0B', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }}>
          
          {/* Flame Icon */}
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: '#F59E0B', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="flame" size={36} color="#F59E0B" />
          </View>

          {/* Title */}
          <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
            {checkInResult.isWelcomeBack ? 'Streak Shield Activated!' : 'Daily Discipline Check-in'}
          </Text>

          <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '900', textAlign: 'center' }}>
            {checkInResult.streak} Day Streak!
          </Text>

          {checkInResult.isWelcomeBack ? (
            <View style={{ backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 8, marginBottom: 4 }}>
              <Text style={{ color: '#FCD34D', fontSize: 11, fontWeight: '700', textAlign: 'center' }}>
                🛡️ Welcome back! Grace Shield preserved your streak.
              </Text>
            </View>
          ) : (
            <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '500', marginTop: 4, textAlign: 'center' }}>
              Showing up daily is 80% of the battle. Keep building!
            </Text>
          )}

          {/* Reward Box */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(39,39,42,0.8)', borderWidth: 1, borderColor: 'rgba(63,63,70,0.8)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, marginTop: 16, marginBottom: 24, gap: 8 }}>
            <Ionicons name="logo-usd" size={16} color="#30D158" />
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
              +{checkInResult.dollarsAwarded.toFixed(2)} Check-in Reward
            </Text>
          </View>

          {/* Claim Button */}
          <Pressable
            onPress={onClose}
            style={{ width: '100%', backgroundColor: '#F59E0B', paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FBBF24' }}
          >
            <Text style={{ color: '#000000', fontSize: 16, fontWeight: '800' }}>
              Claim & Start Day
            </Text>
          </Pressable>

        </View>
      </View>
    </Modal>
  );
}
