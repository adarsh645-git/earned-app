import React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useIsMobile from '../hooks/useIsMobile';

interface QuickAddBarProps {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  onSubmit: () => void; // called on Enter and the send button; parent clears the title
  accentColor?: string;
  disabled?: boolean;
  /** Only Tasks uses this — a single Duration pill, the one field that's economy-critical enough to set at creation time rather than fully deferring to the row. */
  trailingAccessory?: React.ReactNode;
  /**
   * Optional pre-submit expand — a chevron that reveals a secondary pill row
   * below the input for anyone who wants to set everything at creation time
   * instead of fixing it via row pills afterward. Parent owns the open state
   * (and should fire LayoutAnimation before toggling it, matching the
   * expand/collapse idiom already used elsewhere in this app).
   */
  expandable?: {
    open: boolean;
    onToggle: () => void;
    content: React.ReactNode;
  };
  /** Smaller everything (icon/font/padding/send-button) — for nested contexts
   * like a subtask's own add-bar, which shouldn't read as large as the
   * top-level "Add a task..." bar it sits underneath. */
  compact?: boolean;
}

/**
 * TickTick-style quick-add: a bare title input + Enter-to-submit, replacing
 * the old "+ X" button -> full Modal flow. Secondary fields live as pills on
 * the created row by default (see PillPicker) — `expandable` is the opt-in
 * escape hatch for setting them before saving instead.
 */
export default function QuickAddBar({
  placeholder,
  value,
  onChangeText,
  onSubmit,
  accentColor = '#BF5AF2',
  disabled,
  trailingAccessory,
  expandable,
  compact = false,
}: QuickAddBarProps) {
  const canSubmit = !disabled && value.trim().length > 0;
  const isMobile = useIsMobile();
  // Top-level bars always pass compact=false; folding isMobile in here means
  // they self-tighten on narrow viewports without every call site having to
  // pass viewport state, and subtask bars (already compact) are unaffected.
  const tight = compact || isMobile;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit();
  };

  const sendSize = tight ? 24 : 32;

  return (
    <View
      style={{
        backgroundColor: '#1C1C1E',
        borderWidth: 1,
        borderColor: '#2C2C2E',
        borderRadius: tight ? 10 : 16,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          paddingLeft: tight ? 10 : 16,
          paddingRight: tight ? 6 : 8,
          paddingVertical: tight ? 4 : 8,
        }}
      >
        <Ionicons name="add" size={tight ? 14 : 18} color="#8E8E93" style={{ marginRight: tight ? 6 : 8 }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#5C5C5E"
          style={[{ flex: 1, color: '#FFF', fontSize: tight ? 13 : 15, paddingVertical: tight ? 3 : 6 }, { outlineStyle: 'none' } as any]}
          onSubmitEditing={handleSubmit}
          blurOnSubmit={false}
          returnKeyType="done"
        />
        {trailingAccessory}
        {expandable && (
          <Pressable
            onPress={expandable.onToggle}
            style={{ marginLeft: tight ? 4 : 6, padding: tight ? 4 : 6 }}
          >
            <Ionicons name={expandable.open ? 'chevron-up' : 'chevron-down'} size={16} color="#8E8E93" />
          </Pressable>
        )}
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{
            marginLeft: tight ? 6 : 8,
            width: sendSize,
            height: sendSize,
            borderRadius: sendSize / 2,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: canSubmit ? accentColor : '#2C2C2E',
          }}
        >
          <Ionicons name="arrow-up" size={compact ? 13 : 16} color={canSubmit ? '#FFF' : '#5C5C5E'} />
        </Pressable>
      </View>

      {expandable?.open && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#2C2C2E' }}>
          {expandable.content}
        </View>
      )}
    </View>
  );
}
