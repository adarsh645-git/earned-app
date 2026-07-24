import React, { useEffect } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { UnlockedMilestoneInfo } from '../store/macroGoalStore';
import { feedback } from '../utils/feedback';

interface MilestoneModalProps {
  visible: boolean;
  milestones: UnlockedMilestoneInfo[];
  onClose: () => void;
}

export default function MilestoneModal({ visible, milestones, onClose }: MilestoneModalProps) {
  const shouldShow = visible && milestones.length > 0;

  useEffect(() => {
    if (shouldShow) feedback('milestone');
  }, [shouldShow]);

  if (!shouldShow) return null;

  const totalBonus = milestones.reduce((acc, m) => acc + m.dollarsAwarded, 0);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 360, backgroundColor: '#0E0E10', borderWidth: 1, borderColor: '#A855F7', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#A855F7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }}>
          
          {/* Trophy Badge */}
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(168,85,247,0.15)', borderWidth: 1, borderColor: '#A855F7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="trophy" size={32} color="#C084FC" />
          </View>

          <Text style={{ color: '#C084FC', fontSize: 12, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
            Milestone Unlocked!
          </Text>

          {milestones.map((m, idx) => (
            <View key={idx} style={{ alignItems: 'center', marginVertical: 8 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>
                {m.percentage}% Completed
              </Text>
              <Text style={{ color: '#A1A1AA', fontSize: 14, fontWeight: '600', marginTop: 2, textAlign: 'center' }}>
                "{m.goalTitle}"
              </Text>
            </View>
          ))}

          {/* Reward Box (only for goals that actually pay Dollars) */}
          {totalBonus > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(39,39,42,0.8)', borderWidth: 1, borderColor: 'rgba(63,63,70,0.8)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, marginTop: 16, marginBottom: 24, gap: 8 }}>
              <Ionicons name="logo-usd" size={16} color="#30D158" />
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                +{totalBonus.toFixed(2)} Bonus Cash
              </Text>
            </View>
          )}

          {/* Claim Button */}
          <Pressable
            onPress={onClose}
            style={{ width: '100%', backgroundColor: '#9333EA', paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#A855F7', marginTop: totalBonus > 0 ? 0 : 16 }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
              {totalBonus > 0 ? 'Claim Milestone Reward' : 'Nice!'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
