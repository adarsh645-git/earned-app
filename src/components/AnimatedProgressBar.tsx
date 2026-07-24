import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle } from 'react-native';

interface AnimatedProgressBarProps {
  progress: number; // 0-100
  color: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle;
  duration?: number;
}

/**
 * Horizontal bar whose fill width animates to the new value.
 * Width animation runs on the JS thread (not native-driver eligible).
 */
export default function AnimatedProgressBar({
  progress,
  color,
  trackColor = '#2C2C2E',
  height = 8,
  style,
  duration = 700,
}: AnimatedProgressBarProps) {
  const anim = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: progress,
      duration,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, duration, anim]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[{ height, backgroundColor: trackColor, borderRadius: height / 2, overflow: 'hidden' }, style]}>
      <Animated.View style={{ height, width, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}
