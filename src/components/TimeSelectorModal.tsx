import React, { useState, useEffect, useRef } from 'react';
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

const ROW_HEIGHT = 40;
const LIST_MAX_HEIGHT = 160;

/**
 * A single Hours/Minutes field: a big tappable value box that expands into a
 * scrollable tap-to-select list. Selection always commits on tap — unlike a
 * scroll-and-snap wheel, there's no dependency on momentum-scroll physics
 * (which never fires on a slow trackpad/mouse drag, the primary input on
 * this app's web build), so it can never land on a value without selecting it.
 */
function DurationField({
  label,
  value,
  count,
  isOpen,
  onToggle,
  onSelect,
}: {
  label: string;
  value: number;
  count: number; // options are 0..count-1
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (v: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isOpen) {
      // Bring the current value into view immediately instead of leaving the
      // user to hunt for it — center it within the visible window.
      const visibleRows = Math.floor(LIST_MAX_HEIGHT / ROW_HEIGHT);
      const y = Math.max(0, value * ROW_HEIGHT - ROW_HEIGHT * Math.floor(visibleRows / 2));
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: false }));
    }
  }, [isOpen, value]);

  return (
    <View>
      <Text style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 8, fontWeight: '500' }}>{label}</Text>
      <Pressable
        onPress={onToggle}
        style={{
          backgroundColor: '#18181B',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: isOpen ? '#BF5AF2' : '#27272A',
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }}>{value.toString().padStart(2, '0')}</Text>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#8E8E93" style={{ marginLeft: 8 }} />
      </Pressable>

      {isOpen && (
        <View
          style={{
            marginTop: 6,
            backgroundColor: '#18181B',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#27272A',
            maxHeight: LIST_MAX_HEIGHT,
            overflow: 'hidden',
          }}
        >
          <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} bounces={false}>
            {Array.from({ length: count }, (_, i) => i).map((v) => {
              const isSelected = v === value;
              return (
                <Pressable
                  key={v}
                  onPress={() => onSelect(v)}
                  style={{
                    height: ROW_HEIGHT,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected ? 'rgba(191,90,242,0.12)' : 'transparent',
                  }}
                >
                  <Text style={{ color: isSelected ? '#FFFFFF' : '#A1A1AA', fontSize: 16, fontWeight: isSelected ? '700' : '500' }}>
                    {v.toString().padStart(2, '0')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function TimeSelectorModal({
  visible,
  onClose,
  onConfirm,
  initialMinutes = 0,
  title = "Select Duration",
}: TimeSelectorModalProps) {
  const [mode, setMode] = useState<'picker' | 'manual'>('picker');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [openField, setOpenField] = useState<'hours' | 'minutes' | null>(null);

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
      setOpenField(null);
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
        <View style={{ width: '100%', maxWidth: 320, alignSelf: 'center', backgroundColor: '#09090B', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#27272A' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}>{title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Pressable
                onPress={() => {
                  setMode(m => m === 'picker' ? 'manual' : 'picker');
                  setOpenField(null);
                }}
                style={{ padding: 4 }}
              >
                <Ionicons name={mode === 'picker' ? 'keypad-outline' : 'list-outline'} size={20} color="#A1A1AA" />
              </Pressable>
              <Pressable onPress={onClose} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#A1A1AA" />
              </Pressable>
            </View>
          </View>

          {/* Body */}
          {mode === 'picker' ? (
            <View style={{ gap: 12 }}>
              <DurationField
                label="Hours"
                value={hours}
                count={25}
                isOpen={openField === 'hours'}
                onToggle={() => setOpenField(f => (f === 'hours' ? null : 'hours'))}
                onSelect={(v) => { setHours(v); setOpenField(null); }}
              />
              <DurationField
                label="Minutes"
                value={minutes}
                count={60}
                isOpen={openField === 'minutes'}
                onToggle={() => setOpenField(f => (f === 'minutes' ? null : 'minutes'))}
                onSelect={(v) => { setMinutes(v); setOpenField(null); }}
              />
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
                  style={[{
                    backgroundColor: '#18181B',
                    color: '#FFFFFF',
                    padding: 16,
                    borderRadius: 12,
                    fontSize: 24,
                    borderWidth: 1,
                    borderColor: '#27272A',
                    textAlign: 'center'
                  }, { outlineStyle: 'none' } as any]}
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
                  style={[{
                    backgroundColor: '#18181B',
                    color: '#FFFFFF',
                    padding: 16,
                    borderRadius: 12,
                    fontSize: 24,
                    borderWidth: 1,
                    borderColor: '#27272A',
                    textAlign: 'center'
                  }, { outlineStyle: 'none' } as any]}
                />
              </View>
            </View>
          )}

          {/* Confirm Button */}
          <View style={{ marginTop: 20 }}>
            <PrimaryButton title="Confirm" onPress={handleConfirm} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
