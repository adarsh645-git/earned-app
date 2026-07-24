import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface RewardToastProps {
  visible: boolean;
  message: string;
  subtext?: string;
  chainTrail?: string[]; // leaf-first, e.g. ["Elden Ring", "RPG Backlog"] — shown as "Elden Ring → RPG Backlog"
  onDismiss: () => void;
}

export default function RewardToast({ visible, message, subtext, chainTrail, onDismiss }: RewardToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <Pressable
      onPress={onDismiss}
      style={{
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        zIndex: 9999,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#30D158',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#30D158',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(48,209,88,0.15)', borderWidth: 1, borderColor: '#30D158', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
        <Ionicons name="logo-usd" size={15} color="#30D158" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
          {message}
        </Text>
        {subtext ? (
          <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '500', marginTop: 2 }}>
            {subtext}
          </Text>
        ) : null}
        {chainTrail && chainTrail.length > 1 ? (
          <Text style={{ color: '#BF5AF2', fontSize: 11, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
            ↳ Contributed to: {chainTrail.slice(1).join(' → ')}
          </Text>
        ) : null}
      </View>

      <Ionicons name="checkmark-circle" size={20} color="#30D158" style={{ marginLeft: 8 }} />
    </Pressable>
  );
}
