import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type ActionStyle = 'default' | 'destructive' | 'cancel';

export interface ConfirmAction {
  label: string;
  onPress: () => void;
  style?: ActionStyle;
}

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  icon?: string;
  iconColor?: string;
  accentColor?: string;
  title: string;
  message: string;
  actions: ConfirmAction[];
}

export default function ConfirmModal({
  visible,
  onClose,
  icon = 'alert-circle-outline',
  iconColor = '#BF5AF2',
  accentColor = '#BF5AF2',
  title,
  message,
  actions,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
      >
        {/* Prevent tap-through to backdrop closing unintentionally */}
        <Pressable onPress={(e) => e.stopPropagation()} style={[styles.card, { borderColor: accentColor }]}>

          {/* Icon Badge */}
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: `${accentColor}18`,
                borderColor: `${accentColor}55`,
              },
            ]}
          >
            <Ionicons name={icon as any} size={32} color={iconColor} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: accentColor }]}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {actions.map((action, idx) => {
              const isDestructive = action.style === 'destructive';
              const isCancel = action.style === 'cancel';

              const bgColor = isDestructive
                ? '#FF453A22'
                : isCancel
                ? 'transparent'
                : accentColor;

              const borderColor = isDestructive
                ? '#FF453A55'
                : isCancel
                ? 'rgba(255,255,255,0.1)'
                : 'transparent';

              const textColor = isDestructive
                ? '#FF453A'
                : isCancel
                ? '#8E8E93'
                : '#FFFFFF';

              const fontWeight = isCancel ? '600' : '800';

              return (
                <Pressable
                  key={idx}
                  onPress={() => {
                    onClose();
                    action.onPress();
                  }}
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: bgColor,
                      borderColor,
                      borderWidth: isDestructive || isCancel ? 1 : 0,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.actionLabel, { color: textColor, fontWeight }]}>
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
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
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
  },
  actionButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 15,
  },
});
