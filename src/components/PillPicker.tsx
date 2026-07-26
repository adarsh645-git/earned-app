import React, { useRef, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export interface PillOption {
  id: string; // '' conventionally means "None"
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

interface PillPickerProps {
  label: string; // current display text on the pill face
  icon?: React.ReactNode; // leading icon on the pill face
  options: PillOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  open: boolean; // controlled — the parent row owns which pill (if any) is open
  onToggle: () => void;
  accentColor?: string;
  footerAction?: { label: string; onPress: () => void }; // e.g. "+ Create New Goal..."
  /** 'chip' (default) is the bordered pill face used everywhere today.
   * 'plain' renders the trigger as bare text — no background/border, just a
   * hit-slop for touch target — for contexts (subtask rows) that want the
   * same tap-to-edit popover without the visual weight of a chip. The
   * popover itself is identical either way. */
  variant?: 'chip' | 'plain';
}

const DROPDOWN_MAX_HEIGHT = 280;
const DROPDOWN_MIN_WIDTH = 200;
const DROPDOWN_MAX_WIDTH = 280;
const EDGE_MARGIN = 12;
const ROW_HEIGHT_ESTIMATE = 45;

/**
 * A small pill that shows the current value and, tapped, opens its option
 * list as a floating popover anchored just below it — the industry-standard
 * pattern for a field-picker like this (shadcn Popover+Command, Notion
 * property pickers, native <select>), as opposed to an in-flow expansion
 * that would push surrounding content around. Implemented via a measured
 * anchor + transparent Modal, since bare React Native has no true portal
 * primitive; RN's Modal already escapes ancestor `overflow:'hidden'`
 * clipping in this app (confirmed by every other Modal already in use).
 */
export default function PillPicker({
  label,
  icon,
  options,
  selectedId,
  onSelect,
  open,
  onToggle,
  accentColor = '#BF5AF2',
  footerAction,
  variant = 'chip',
}: PillPickerProps) {
  const anchorRef = useRef<View>(null);
  const [anchorRect, setAnchorRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const handleTogglePress = () => {
    if (!open) {
      anchorRef.current?.measureInWindow((x, y, width, height) => {
        setAnchorRect({ x, y, width, height });
        onToggle();
      });
    } else {
      onToggle();
    }
  };

  let popoverStyle: { position: 'absolute'; top: number; left: number; width: number } | null = null;
  if (open && anchorRect) {
    const naturalWidth = Math.max(anchorRect.width, DROPDOWN_MIN_WIDTH);
    const width = Math.min(naturalWidth, DROPDOWN_MAX_WIDTH, screenWidth - EDGE_MARGIN * 2);

    let left = anchorRect.x;
    if (left + width > screenWidth - EDGE_MARGIN) left = screenWidth - EDGE_MARGIN - width;
    if (left < EDGE_MARGIN) left = EDGE_MARGIN;

    const estimatedHeight = Math.min(
      DROPDOWN_MAX_HEIGHT,
      options.length * ROW_HEIGHT_ESTIMATE + (footerAction ? ROW_HEIGHT_ESTIMATE : 0) + 2
    );
    let top = anchorRect.y + anchorRect.height + 4;
    const overflowsBelow = top + estimatedHeight > screenHeight - EDGE_MARGIN;
    const roomAbove = anchorRect.y - estimatedHeight - 4 > EDGE_MARGIN;
    if (overflowsBelow && roomAbove) {
      top = anchorRect.y - estimatedHeight - 4;
    }

    popoverStyle = { position: 'absolute', top, left, width };
  }

  return (
    <View ref={anchorRef} collapsable={false}>
      <Pressable
        onPress={handleTogglePress}
        hitSlop={variant === 'plain' ? 6 : undefined}
        style={
          variant === 'plain'
            ? { flexDirection: 'row', alignItems: 'center' }
            : {
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#2C2C2E',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: open ? accentColor : '#3A3A3C',
                flexShrink: 1,
              }
        }
      >
        {icon && variant === 'chip' && <View style={{ marginRight: 5 }}>{icon}</View>}
        <Text
          style={
            variant === 'plain'
              ? { color: open ? accentColor : '#8E8E93', fontSize: 12, fontWeight: '600', maxWidth: 130, flexShrink: 1 }
              : { color: '#FFF', fontSize: 12, fontWeight: '600', marginRight: 4, maxWidth: 130, flexShrink: 1 }
          }
          numberOfLines={1}
        >
          {label}
        </Text>
        {variant === 'chip' && <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color="#8E8E93" />}
      </Pressable>

      {open && anchorRect && (
        <Modal visible transparent animationType="fade" onRequestClose={onToggle}>
          <View style={{ flex: 1 }}>
            {/* Backdrop — sibling to the popover, not a parent, so taps inside
                the popover never also trigger this close handler. */}
            <Pressable
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              onPress={onToggle}
            />

            <View
              style={[
                {
                  backgroundColor: 'rgba(9,9,11,0.96)',
                  borderWidth: 1,
                  borderColor: '#27272A',
                  borderRadius: 10,
                  overflow: 'hidden',
                  maxHeight: DROPDOWN_MAX_HEIGHT,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                  elevation: 12,
                },
                popoverStyle,
              ]}
            >
              <ScrollView bounces={false}>
                {options.map((opt, i) => {
                  const isSelected = opt.id === selectedId;
                  const isLast = i === options.length - 1;
                  return (
                    <Pressable
                      key={opt.id || `option-${i}`}
                      onPress={() => onSelect(opt.id)}
                      style={{
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottomWidth: !isLast || footerAction ? 1 : 0,
                        borderBottomColor: '#18181B',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        {opt.icon}
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: isSelected ? '#FFF' : '#A1A1AA', fontSize: 14, fontWeight: isSelected ? '700' : '500' }} numberOfLines={1}>
                            {opt.label}
                          </Text>
                          {opt.sublabel ? (
                            <Text style={{ color: isSelected ? accentColor : '#5C5C5E', fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                              {opt.sublabel}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={16} color={accentColor} />}
                    </Pressable>
                  );
                })}

                {footerAction && (
                  <Pressable
                    onPress={footerAction.onPress}
                    style={{ padding: 12, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={accentColor} style={{ marginRight: 6 }} />
                    <Text style={{ color: accentColor, fontSize: 13, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
                      {footerAction.label}
                    </Text>
                  </Pressable>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
