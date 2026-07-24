import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Animated, View } from 'react-native';

const PALETTE = ['#BF5AF2', '#30D158', '#FFD60A', '#FF375F', '#0A84FF', '#FF9F0A', '#FFFFFF'];
const PARTICLE_COUNT = 10;

export interface CheckboxBurstHandle {
  fire: () => void;
}

interface CheckboxBurstProps {
  /** Accent color biased toward for most particles (e.g. the row's earner/burner color). */
  color?: string;
  /** Size of the checkbox this burst is centered on. */
  size?: number;
}

interface ParticleSpec {
  progress: Animated.Value;
  dx: number;
  dy: number;
  rotateDeg: number;
  color: string;
  isSquare: boolean;
  sizePx: number;
  duration: number;
  delay: number;
}

function buildParticles(accent: string): ParticleSpec[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const distance = 26 + Math.random() * 20;
    return {
      progress: new Animated.Value(0),
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance + 8, // slight downward drift for a "confetti" feel
      rotateDeg: (Math.random() - 0.5) * 300,
      color: Math.random() < 0.45 ? accent : PALETTE[Math.floor(Math.random() * PALETTE.length)],
      isSquare: i % 2 === 0,
      sizePx: 4 + Math.random() * 3,
      duration: 480 + Math.random() * 160,
      delay: Math.random() * 40,
    };
  });
}

/**
 * Small radial particle burst anchored to a checkbox — fired imperatively via
 * ref.fire(). Built on plain Animated (no confetti/particle library is
 * installed in this project) so it can live inline on a task row without the
 * cost of mounting the full-screen ConfettiCanvas rain for a local moment.
 */
const CheckboxBurst = forwardRef<CheckboxBurstHandle, CheckboxBurstProps>(
  ({ color = '#30D158', size = 24 }, ref) => {
    const particles = useRef<ParticleSpec[]>(buildParticles(color)).current;

    useImperativeHandle(ref, () => ({
      fire: () => {
        particles.forEach(p => p.progress.setValue(0));
        Animated.parallel(
          particles.map(p =>
            Animated.timing(p.progress, {
              toValue: 1,
              duration: p.duration,
              delay: p.delay,
              useNativeDriver: true,
            })
          )
        ).start();
      },
    }));

    const center = size / 2;

    return (
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size }}>
        {particles.map((p, i) => {
          const translateX = p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] });
          const translateY = p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] });
          const opacity = p.progress.interpolate({ inputRange: [0, 0.05, 0.7, 1], outputRange: [0, 1, 1, 0] });
          const scale = p.progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.4, 1, 0.5] });
          const rotate = p.progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rotateDeg}deg`] });
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: center - p.sizePx / 2,
                top: center - p.sizePx / 2,
                width: p.sizePx,
                height: p.sizePx,
                borderRadius: p.isSquare ? 1.5 : p.sizePx / 2,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }, { rotate }],
              }}
            />
          );
        })}
      </View>
    );
  }
);

CheckboxBurst.displayName = 'CheckboxBurst';

export default CheckboxBurst;
