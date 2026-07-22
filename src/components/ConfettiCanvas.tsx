import React, { useEffect, useRef, useCallback } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';
import { useConfettiStore } from '../store/confettiStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PARTICLE_COUNT = 55;
const COLORS = [
  '#BF5AF2', // Purple
  '#30D158', // Green
  '#FFD60A', // Yellow
  '#FF375F', // Red/Pink
  '#0A84FF', // Blue
  '#FF9F0A', // Orange
  '#FFFFFF', // White
];

const randomBetween = (min: number, max: number) =>
  Math.random() * (max - min) + min;

interface Particle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  rotate: Animated.Value;
  scale: Animated.Value;
  color: string;
  shape: 'rect' | 'circle' | 'ribbon';
  width: number;
  height: number;
}

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const shape = (['rect', 'circle', 'ribbon'] as const)[Math.floor(Math.random() * 3)];
    return {
      id: i,
      x: new Animated.Value(randomBetween(0.1, 0.9) * SCREEN_WIDTH),
      y: new Animated.Value(-20),
      opacity: new Animated.Value(1),
      rotate: new Animated.Value(0),
      scale: new Animated.Value(randomBetween(0.6, 1.2)),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape,
      width: shape === 'ribbon' ? randomBetween(4, 8) : randomBetween(7, 13),
      height: shape === 'circle' ? randomBetween(7, 13) : randomBetween(10, 22),
    };
  });
}

function ParticleView({ particle }: { particle: Particle }) {
  const rotateInterpolate = particle.rotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const shapeStyle =
    particle.shape === 'circle'
      ? { borderRadius: particle.width }
      : particle.shape === 'ribbon'
      ? { borderRadius: 2 }
      : { borderRadius: 3 };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: particle.width,
          height: particle.height,
          backgroundColor: particle.color,
          transform: [
            { translateX: particle.x },
            { translateY: particle.y },
            { rotate: rotateInterpolate },
            { scale: particle.scale },
          ],
          opacity: particle.opacity,
        },
        shapeStyle,
      ]}
    />
  );
}

export default function ConfettiCanvas() {
  const isPlaying = useConfettiStore((s) => s.isPlaying);
  const particlesRef = useRef<Particle[]>(createParticles());
  const animationsRef = useRef<Animated.CompositeAnimation | null>(null);

  const launchParticles = useCallback(() => {
    // Reset all particle values
    particlesRef.current.forEach((p) => {
      p.x.setValue(randomBetween(0.05, 0.95) * SCREEN_WIDTH);
      p.y.setValue(randomBetween(-60, -10));
      p.opacity.setValue(1);
      p.rotate.setValue(0);
      p.scale.setValue(randomBetween(0.6, 1.2));
    });

    // Build individual animations for each particle
    const particleAnimations = particlesRef.current.map((p) => {
      const duration = randomBetween(2200, 3800);
      const drift = randomBetween(-80, 80); // horizontal wobble
      const finalY = SCREEN_HEIGHT + 40;

      return Animated.parallel([
        Animated.timing(p.y, {
          toValue: finalY,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(p.x, {
          toValue: (p.x as any)._value + drift,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(p.rotate, {
          toValue: randomBetween(180, 720),
          duration,
          useNativeDriver: true,
        }),
        // Fade out in the final 25% of flight
        Animated.sequence([
          Animated.delay(duration * 0.75),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: duration * 0.25,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    animationsRef.current = Animated.parallel(particleAnimations);
    animationsRef.current.start();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      launchParticles();
    } else {
      if (animationsRef.current) {
        animationsRef.current.stop();
      }
      // Quickly fade out any remaining visible particles
      particlesRef.current.forEach((p) => p.opacity.setValue(0));
    }

    return () => {
      if (animationsRef.current) {
        animationsRef.current.stop();
      }
    };
  }, [isPlaying, launchParticles]);

  if (!isPlaying) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particlesRef.current.map((p) => (
        <ParticleView key={p.id} particle={p} />
      ))}
    </View>
  );
}
