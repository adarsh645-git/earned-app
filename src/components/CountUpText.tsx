import React, { useEffect, useRef, useState } from 'react';
import { Text, TextProps, Animated } from 'react-native';

interface CountUpTextProps extends TextProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}

/**
 * Tweens the displayed number from its previous value to `value`.
 * Animated values can't live inside <Text>, so we drive a listener → state.
 */
export default function CountUpText({
  value,
  format = (n) => String(Math.round(n)),
  duration = 600,
  ...textProps
}: CountUpTextProps) {
  const anim = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    return () => anim.removeListener(id);
  }, [anim]);

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: value,
      duration,
      useNativeDriver: false, // driving JS state, not a transform
    });
    animation.start();
    return () => animation.stop();
  }, [value, duration, anim]);

  return <Text {...textProps}>{format(display)}</Text>;
}
