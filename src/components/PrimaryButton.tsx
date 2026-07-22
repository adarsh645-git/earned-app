import React from 'react';
import { Pressable, Text, PressableProps, ViewStyle, TextStyle, View } from 'react-native';

interface PrimaryButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  size?: 'sm' | 'lg';
}

export function PrimaryButton({ title, style, textStyle, icon, size = 'lg', ...props }: PrimaryButtonProps) {
  const isSm = size === 'sm';
  return (
    <Pressable
      {...props}
      style={({ pressed, hovered }: any) => [
        {
          backgroundColor: hovered ? '#3A2053' : '#2C183E',
          borderColor: hovered ? '#5A3382' : '#4D2A6B',
          borderWidth: 1,
          paddingVertical: isSm ? 10 : 16,
          paddingHorizontal: isSm ? 16 : 24,
          borderRadius: isSm ? 14 : 16,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: [{ scale: pressed ? 0.97 : 1 }],
          opacity: props.disabled ? 0.5 : 1,
        } as any,
        style
      ]}
    >
      {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
      <Text style={[{ color: '#FFFFFF', fontSize: isSm ? 14 : 16, fontWeight: isSm ? '700' : '800' }, textStyle]}>
        {title}
      </Text>
    </Pressable>
  );
}
