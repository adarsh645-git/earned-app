import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedProgressRingProps {
  size: number;
  strokeWidth: number;
  progress: number; // 0-100
  color: string;
  trackColor?: string;
  isDesktop?: boolean;
  label?: string;
  sublabel?: string;
}

/**
 * SVG progress ring that sweeps to the new value instead of snapping.
 * strokeDashoffset is not a transform/opacity, so it cannot use the native
 * driver — animate on the JS thread.
 */
export default function AnimatedProgressRing({
  size,
  strokeWidth,
  progress,
  color,
  trackColor = '#1C1C1E',
  isDesktop = false,
  label,
  sublabel,
}: AnimatedProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const anim = useRef(new Animated.Value(progress)).current;
  const [displayPct, setDisplayPct] = useState(progress);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setDisplayPct(value));
    return () => anim.removeListener(id);
  }, [anim]);

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, anim]);

  const strokeDashoffset = anim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text className={`text-white font-black tracking-tighter ${isDesktop ? 'text-5xl' : 'text-3xl'}`}>
          {Math.round(displayPct)}%
        </Text>
        {label ? (
          <Text className={`text-[#8E8E93] font-bold tracking-[2px] mt-0.5 uppercase ${isDesktop ? 'text-xs' : 'text-[9px]'}`}>
            {label}
          </Text>
        ) : null}
        {sublabel ? (
          <Text className={`font-semibold mt-0.5 ${isDesktop ? 'text-sm' : 'text-xs'}`} style={{ color }}>
            {sublabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
