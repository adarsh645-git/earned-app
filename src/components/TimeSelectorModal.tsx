import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PrimaryButton } from './PrimaryButton';

interface TimeSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (totalMinutes: number) => void;
  initialMinutes?: number;
  title?: string;
}

export default function TimeSelectorModal({
  visible,
  onClose,
  onConfirm,
  initialMinutes = 0,
  title = "Select Duration",
}: TimeSelectorModalProps) {
  const [mode, setMode] = useState<'carousel' | 'manual'>('carousel');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  // For manual input
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');

  useEffect(() => {
    if (visible) {
      const h = Math.floor(initialMinutes / 60);
      const m = initialMinutes % 60;
      setHours(h);
      setMinutes(m);
      setManualHours(h.toString());
      setManualMinutes(m.toString());
    }
  }, [visible, initialMinutes]);

  const handleConfirm = () => {
    let finalHours = hours;
    let finalMinutes = minutes;

    if (mode === 'manual') {
      finalHours = parseInt(manualHours) || 0;
      finalMinutes = parseInt(manualMinutes) || 0;
    }

    const total = (finalHours * 60) + finalMinutes;
    onConfirm(total);
  };

  const renderCarouselWheel = (
    data: number[],
    selectedValue: number,
    onSelect: (val: number) => void,
    label: string
  ) => {
    return (
      <View style={{ flex: 1, height: 200, backgroundColor: '#18181B', borderRadius: 12, overflow: 'hidden' }}>
        <Text style={{ textAlign: 'center', color: '#A1A1AA', fontSize: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#27272A' }}>
          {label}
        </Text>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 80 }} // padding to allow top/bottom scrolling
          snapToInterval={40} // height of each item
          decelerationRate="fast"
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.y / 40);
            if (data[index] !== undefined) onSelect(data[index]);
          }}
        >
          {data.map((val) => (
            <Pressable 
              key={val} 
              onPress={() => onSelect(val)}
              style={{ height: 40, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ 
                color: selectedValue === val ? '#FFFFFF' : '#52525B', 
                fontSize: selectedValue === val ? 24 : 18,
                fontWeight: selectedValue === val ? '700' : '500'
              }}>
                {val.toString().padStart(2, '0')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)' }}
      >
        <View style={{ margin: 24, backgroundColor: '#09090B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#27272A' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>{title}</Text>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#A1A1AA" />
            </Pressable>
          </View>

          {/* Body */}
          {mode === 'carousel' ? (
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {renderCarouselWheel(Array.from({length: 25}, (_, i) => i), hours, setHours, 'Hours')}
              {renderCarouselWheel(Array.from({length: 60}, (_, i) => i), minutes, setMinutes, 'Minutes')}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 8, fontWeight: '500' }}>Hours</Text>
                <TextInput
                  value={manualHours}
                  onChangeText={setManualHours}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#52525B"
                  style={{
                    backgroundColor: '#18181B',
                    color: '#FFFFFF',
                    padding: 16,
                    borderRadius: 12,
                    fontSize: 24,
                    borderWidth: 1,
                    borderColor: '#27272A',
                    textAlign: 'center'
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 8, fontWeight: '500' }}>Minutes</Text>
                <TextInput
                  value={manualMinutes}
                  onChangeText={setManualMinutes}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#52525B"
                  style={{
                    backgroundColor: '#18181B',
                    color: '#FFFFFF',
                    padding: 16,
                    borderRadius: 12,
                    fontSize: 24,
                    borderWidth: 1,
                    borderColor: '#27272A',
                    textAlign: 'center'
                  }}
                />
              </View>
            </View>
          )}

          {/* Mode Toggle & Confirm */}
          <View style={{ marginTop: 24, gap: 12 }}>
            <Pressable 
              onPress={() => setMode(m => m === 'carousel' ? 'manual' : 'carousel')}
              style={{ paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#0A84FF', fontSize: 14, fontWeight: '600' }}>
                {mode === 'carousel' ? '⌨️ Type Manually' : '🔄 Use Wheel Selector'}
              </Text>
            </Pressable>
            
            <PrimaryButton title="Confirm" onPress={handleConfirm} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
