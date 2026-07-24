import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CountUpText from './CountUpText';

interface CurrencyPillProps {
  value: number;
  format?: (n: number) => string; // include any prefix here, e.g. n => `Tab: $${n.toFixed(2)}`
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  style?: ViewStyle;
}

/**
 * Header pill that count-ups its value and gives a quick scale pulse whenever
 * the value increases — so earning currency actually feels like something.
 */
export default function CurrencyPill({ value, format, icon, color, style }: CurrencyPillProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const prev = useRef(value);

  useEffect(() => {
    if (value > prev.current) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.18, useNativeDriver: true, speed: 60, bounciness: 14 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
      ]).start();
    }
    prev.current = value;
  }, [value, scale]);

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#1C1C1E',
          borderColor: `${color}4D`,
          borderWidth: 1,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 9999,
          transform: [{ scale }],
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={13} color={color} />
      <CountUpText
        value={value}
        format={format}
        style={{ color, fontWeight: '700', marginLeft: 4, fontSize: 12 }}
      />
    </Animated.View>
  );
}
