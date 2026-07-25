import React, { useEffect, useState } from 'react';
import { Text, TextInput, View, TextStyle, ViewStyle, LayoutChangeEvent } from 'react-native';

interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  textStyle?: TextStyle;
  /** Applied to the outer wrapper only — e.g. { flex: 1 } to reserve a row's remaining width (Item rows). The visible text/input itself always hugs its own content, never stretches to fill this. */
  containerStyle?: ViewStyle;
  numberOfLines?: number;
}

/**
 * Tap the text to rename it in place — Enter or blur commits, empty/unchanged
 * reverts. Generalizes the InlineEditableText pattern already proven in
 * AnimatedSummitCard.tsx for reuse across Task/Journey/Waypoint/Item titles.
 * The clickable/editable box always hugs the text's own width (measured via
 * onLayout) rather than stretching to fill its container.
 */
export default function EditableText({ value, onSave, textStyle, containerStyle, numberOfLines = 1 }: EditableTextProps) {
  const [draft, setDraft] = useState(value);
  const [textWidth, setTextWidth] = useState<number | null>(null);

  // Sync local draft if the value changes externally (e.g. another surface edited it).
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
  };

  const inputWidth = textWidth != null ? textWidth + 16 : undefined;

  return (
    <View style={containerStyle}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={commit}
        onSubmitEditing={commit}
        style={[
          textStyle,
          { outlineStyle: 'none' } as any,
          {
            alignSelf: 'flex-start',
            maxWidth: '100%',
            minWidth: 40,
            width: inputWidth,
            padding: 0,
            margin: 0,
            backgroundColor: 'transparent',
          },
        ]}
        returnKeyType="done"
      />
      <Text
        style={[
          textStyle,
          { position: 'absolute', opacity: 0, pointerEvents: 'none' }
        ]}
        onLayout={(e: LayoutChangeEvent) => setTextWidth(e.nativeEvent.layout.width)}
        numberOfLines={numberOfLines}
      >
        {draft || ' '}
      </Text>
    </View>
  );
}
