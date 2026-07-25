import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type ToastTone = 'earner' | 'burner' | 'neutral';

interface RewardToastProps {
  visible: boolean;
  message: string;
  subtext?: string;
  chainTrail?: string[]; // leaf-first, e.g. ["Elden Ring", "Games Backlog"] — shown as "Elden Ring → Games Backlog"
  onDismiss: () => void;
  /** Earner = green (time earned), burner = blue (time spent), neutral = brand purple. Defaults to neutral. */
  tone?: ToastTone;
}

const TONE_ACCENTS: Record<ToastTone, { color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  earner: { color: '#30D158', icon: 'logo-usd' },
  burner: { color: '#5AC8FA', icon: 'game-controller' },
  neutral: { color: '#BF5AF2', icon: 'sparkles' },
};

export default function RewardToast({ visible, message, subtext, chainTrail, onDismiss, tone = 'neutral' }: RewardToastProps) {
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(visible ? 0 : -16)).current;
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  // Keep the timeout/tap handler calling the latest onDismiss without making it
  // an effect dependency (which would restart the auto-dismiss clock on every
  // unrelated parent re-render, since inline arrow props change identity each time).
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => onDismissRef.current(), 3500);
      return () => clearTimeout(timer);
    }

    // Play the exit animation, then unmount.
    Animated.parallel([
      Animated.timing(translateY, { toValue: -16, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setMounted(false));
  }, [visible]);

  if (!mounted) return null;

  const accent = TONE_ACCENTS[tone].color;
  const iconName = TONE_ACCENTS[tone].icon;
  const hasChainTrail = !!chainTrail && chainTrail.length > 1;

  return (
    // Non-interactive full-width wrapper (box-none) so touches pass through
    // everywhere except the card itself — the card floats centered, content-width.
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 20, zIndex: 9999 }}>
      <Animated.View style={{ maxWidth: 440, width: '100%', opacity, transform: [{ translateY }] }}>
        <Pressable
          onPress={onDismiss}
          style={{
            backgroundColor: '#18181B',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: accent,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.35,
            shadowRadius: 20,
            elevation: 14,
          }}
        >
          {/* Nested concentric icon badge — the app's depth idiom for accent tints */}
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${accent}14`, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${accent}26`, borderWidth: 1, borderColor: `${accent}40`, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name={iconName} size={15} color={accent} />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }} numberOfLines={2}>
              {message}
            </Text>
            {subtext ? (
              <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '500', marginTop: 2 }} numberOfLines={2}>
                {subtext}
              </Text>
            ) : null}
            {hasChainTrail ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, alignSelf: 'flex-start', backgroundColor: `${accent}1A`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                <Ionicons name="arrow-forward" size={10} color={accent} style={{ marginRight: 5 }} />
                <Text style={{ color: accent, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                  {chainTrail!.slice(1).join(' → ')}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: `${accent}1A`, justifyContent: 'center', alignItems: 'center', marginLeft: 10 }}>
            <Ionicons name="checkmark" size={14} color={accent} />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
