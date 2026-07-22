import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, NativeSyntheticEvent, NativeScrollEvent, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { hapticSelection } from '../utils/haptics';

// Use basic Animated from react-native instead of reanimated since we don't have reanimated installed.
import { Animated as RNAnimated } from 'react-native';

interface DialPickerProps {
  value: number;
  onChange: (val: number) => void;
  options: number[];
  itemHeight?: number;
}

export default function DialPicker({ value, onChange, options, itemHeight = 44 }: DialPickerProps) {
  const scrollY = useRef(new RNAnimated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);
  const [activeIndex, setActiveIndex] = useState(() => {
    const idx = options.indexOf(value);
    return Math.max(0, idx);
  });

  const lastHapticIndex = useRef(activeIndex);

  // We add 1 empty item at the top and 1 at the bottom so the first/last items can be centered
  const paddedOptions = useMemo(() => [null, ...options, null], [options]);

  const handleScroll = useMemo(
    () =>
      RNAnimated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = event.nativeEvent.contentOffset.y;
          const index = Math.round(y / itemHeight);
          const clampedIndex = Math.max(0, Math.min(index, options.length - 1));

          if (clampedIndex !== lastHapticIndex.current) {
            lastHapticIndex.current = clampedIndex;
            if (Platform.OS !== 'web') {
              hapticSelection();
            }
          }
        },
      }),
    [scrollY, itemHeight, options.length]
  );

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, options.length - 1));
    setActiveIndex(clampedIndex);
    onChange(options[clampedIndex]);
  };

  // Allow clicking an item to scroll to it
  const handleItemPress = (index: number) => {
    scrollViewRef.current?.scrollTo({ y: index * itemHeight, animated: true });
    // The momentum end won't fire for programmatic scroll on some platforms, so set state directly
    setActiveIndex(index);
    onChange(options[index]);
  };

  // Initialize scroll position
  useEffect(() => {
    const idx = options.indexOf(value);
    if (idx >= 0 && idx !== activeIndex) {
      scrollViewRef.current?.scrollTo({ y: idx * itemHeight, animated: false });
      setActiveIndex(idx);
      lastHapticIndex.current = idx;
    }
  }, [value, options, itemHeight]);

  return (
    <View style={{ height: itemHeight * 3, overflow: 'hidden', position: 'relative', width: 100 }}>
      {/* Highlight overlay (the grey background behind the center item) */}
      <View 
        style={{ 
          position: 'absolute', 
          top: itemHeight, 
          height: itemHeight, 
          width: '100%',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 8,
          zIndex: 0
        }} 
        pointerEvents="none" 
      />

      <RNAnimated.ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        // onScrollEndDrag is a fallback if user drags and releases without momentum
        onScrollEndDrag={(e) => {
          if (e.nativeEvent.velocity?.y === 0) {
            handleMomentumScrollEnd(e);
          }
        }}
        scrollEventThrottle={1}
        contentContainerStyle={{ paddingHorizontal: 8 }}
        style={{ zIndex: 1 }}
      >
        {paddedOptions.map((opt, i) => {
          if (opt === null) {
            return <View key={`pad-${i}`} style={{ height: itemHeight }} />;
          }
          
          const actualIndex = i - 1; // because of the top pad

          // Calculate scale and opacity based on scroll position
          const inputRange = [
            (actualIndex - 1) * itemHeight,
            actualIndex * itemHeight,
            (actualIndex + 1) * itemHeight
          ];
          
          const scale = scrollY.interpolate({
            inputRange,
            outputRange: [0.8, 1.1, 0.8],
            extrapolate: 'clamp',
          });

          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <View 
              key={`opt-${opt}`} 
              style={{ height: itemHeight, justifyContent: 'center', alignItems: 'center' }}
            >
              <RNAnimated.Text 
                onPress={() => handleItemPress(actualIndex)}
                style={{ 
                  color: '#FFFFFF', 
                  fontSize: 18, 
                  fontWeight: '600',
                  opacity,
                  transform: [{ scale }]
                }}
              >
                {opt}
              </RNAnimated.Text>
            </View>
          );
        })}
      </RNAnimated.ScrollView>
    </View>
  );
}
