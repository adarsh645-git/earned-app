import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet } from 'react-native';

interface ProgressPromptModalProps {
  visible: boolean;
  unitLabel: string;
  taskTitle: string;
  onCancel: () => void;
  onSubmit: (value: number) => void;
}

/**
 * Blocks completing a Waypoint-linked task until its progress quantity is
 * entered — same visual language as ConfirmModal, but with a numeric input
 * in place of a plain message, since a bare confirm/cancel can't collect a
 * value.
 */
export default function ProgressPromptModal({ visible, unitLabel, taskTitle, onCancel, onSubmit }: ProgressPromptModalProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (visible) setValue('');
  }, [visible]);

  const parsed = parseFloat(value);
  const canSubmit = !isNaN(parsed) && parsed > 0;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.card}>
          <Text style={styles.title}>PROGRESS REQUIRED</Text>
          <Text style={styles.message}>
            How many {unitLabel.toLowerCase()} does "{taskTitle}" cover? This Waypoint tracks progress in {unitLabel.toLowerCase()}.
          </Text>

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={`e.g. 10 ${unitLabel.toLowerCase()}`}
            placeholderTextColor="#5C5C5E"
            keyboardType="numeric"
            autoFocus
            style={[
              { backgroundColor: '#18181B', color: '#FFFFFF', padding: 14, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#2C2C2E', width: '100%', marginBottom: 20 },
              { outlineStyle: 'none' } as any,
            ]}
          />

          <View style={styles.actionsContainer}>
            <Pressable onPress={onCancel} style={[styles.actionButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}>
              <Text style={{ color: '#8E8E93', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={!canSubmit}
              onPress={() => onSubmit(parsed)}
              style={[styles.actionButton, { backgroundColor: canSubmit ? '#BF5AF2' : '#3A3A3C' }]}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>Complete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#111113',
    borderWidth: 1,
    borderColor: '#BF5AF2',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
    textAlign: 'center',
    color: '#BF5AF2',
  },
  message: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  actionsContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
