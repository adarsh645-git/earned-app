import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, AppState, AppStateStatus, Pressable, Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTimerStore, calculateDollarsEarned } from '../store/timerStore';
import { useTaskStore } from '../store/taskStore';
import MilestoneModal from './MilestoneModal';
import ConfirmModal from './ConfirmModal';
import { feedback } from '../utils/feedback';
import { useConfettiStore } from '../store/confettiStore';

export default function TimerOverlay() {
  const {
    activeTaskId,
    isActive,
    secondsRemaining,
    secondsElapsed,
    isBonus,
    recentCompletionResult,
    tick,
    completeSession,
    clearCompletionResult,
    cancelSession,
    syncTimerFromBackground,
  } = useTimerStore();

  const { tasks, tags } = useTaskStore();
  const [zenMode, setZenMode] = useState(false);
  const [abandonVisible, setAbandonVisible] = useState(false);

  const [appState, setAppState] = useState(AppState.currentState);

  // AppState Listener to fast-forward timer when returning from background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      setAppState(nextAppState);
      if (nextAppState === 'active') {
        syncTimerFromBackground();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [syncTimerFromBackground]);

  // Hook to handle the 1-second interval tick - ONLY when active and app is in foreground
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && appState === 'active') {
      interval = setInterval(() => {
        tick();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, appState, tick]);

  // Breathing Animation for Zen Mode using standard Animated API
  const breatheAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isActive && zenMode) {
      // Loop a sequence of growing and shrinking
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.15,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1.0,
            duration: 4000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      breatheAnim.setValue(1);
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [isActive, zenMode, breatheAnim]);

  const animatedBreathingStyle = {
    transform: [{ scale: breatheAnim }],
  };

  const currentTask = tasks.find((t) => t.id === activeTaskId);
  const currentTag = tags.find((tag) => tag.id === currentTask?.tagId);

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const timeDisplay = isBonus ? formatTime(secondsElapsed) : formatTime(secondsRemaining);
  const currentDollars = calculateDollarsEarned(secondsElapsed);

  // Determine current multiplier
  let currentMultiplier = '1.0x';
  if (secondsElapsed >= 3600) {
    currentMultiplier = '2.0x';
  } else if (secondsElapsed >= 1800) {
    currentMultiplier = '1.5x';
  }

  const handleAbandon = () => {
    setAbandonVisible(true);
  };


  const showMilestoneModal = !!recentCompletionResult && recentCompletionResult.unlockedMilestones.length > 0;

  if (!isActive || !activeTaskId) {
    return (
      <MilestoneModal
        visible={showMilestoneModal}
        milestones={recentCompletionResult?.unlockedMilestones || []}
        onClose={clearCompletionResult}
      />
    );
  }

  // Render Zen Mode Screen
  if (zenMode) {
    return (
      <Modal visible={isActive} animationType="fade" presentationStyle="fullScreen">
        <Pressable 
          onPress={() => {
            // Can double-tap or click exit at bottom
          }}
          style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}
        >
          {/* Breathing Ring Indicator */}
          <Animated.View
            style={[
              animatedBreathingStyle,
              {
                position: 'absolute',
                width: 290,
                height: 290,
                borderRadius: 145,
                borderWidth: 1.5,
                borderColor: isBonus ? 'rgba(48,209,88,0.25)' : 'rgba(175,82,222,0.25)',
                justifyContent: 'center',
                alignItems: 'center',
              }
            ]}
          />

          {/* Clean Zen Clock */}
          <View className="items-center z-10">
            <Text className="text-zinc-600 text-[10px] font-bold tracking-[4px] uppercase mb-1">
              {isBonus ? 'BONUS TIME' : 'STAY PRESENT'}
            </Text>
            
            <Text 
              style={{ fontSize: 76, fontWeight: '200', letterSpacing: -2 }} 
              className={isBonus ? 'text-[#30D158]' : 'text-white/90'}
            >
              {timeDisplay}
            </Text>

            {/* Glowing claims for Zen mode completion */}
            {isBonus ? (
              <Pressable
                onPress={() => {
                  setZenMode(false);
                  feedback('sessionComplete');
                  useConfettiStore.getState().triggerConfetti();
                  completeSession();
                }}
                style={{ backgroundColor: 'rgba(48,209,88,0.15)', borderColor: '#30D158', borderWidth: 1 }}
                className="mt-6 px-5 py-2.5 rounded-full flex-row items-center gap-1.5"
              >
                <Ionicons name="logo-usd" size={14} color="#30D158" />
                <Text className="text-[#30D158] font-bold text-xs uppercase tracking-wider">
                  Claim ${currentDollars.toFixed(2)}
                </Text>
              </Pressable>
            ) : (
              <Text className="text-zinc-500 text-[11px] font-medium mt-2 italic">
                {currentTask?.title}
              </Text>
            )}
          </View>

          {/* Subtly positioned Exit Button at Bottom */}
          <View className="absolute bottom-12 w-full items-center z-10">
            <Pressable 
              onPress={() => setZenMode(false)}
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
              className="px-5 py-3 rounded-full border border-white/5 active:bg-white/10"
            >
              <Text className="text-zinc-400 font-bold text-xs uppercase tracking-[2px]">
                Exit Zen Mode
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    );
  }

  // Render Standard Timer Interface
  return (
    <>
      <Modal visible={isActive} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.container}>
          {/* Top Status */}
          <View className="items-center mt-12">
            <Text style={{ color: currentTag?.type === 'burner' ? '#5AC8FA' : '#BF5AF2' }} className="font-bold text-xs tracking-[4px] uppercase">
              {currentTag?.type === 'burner' ? 'Entertainment Session Active' : 'Focus Lock Active'}
            </Text>
            <View className="flex-row items-center mt-2 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
              <Ionicons name={currentTag?.type === 'burner' ? "game-controller" : "flash"} size={12} color={currentTag?.type === 'burner' ? '#5AC8FA' : '#BF5AF2'} />
              <Text className="text-zinc-400 text-xs font-semibold uppercase ml-1">
                {currentTag?.name || 'Task'}
              </Text>
            </View>
          </View>

          {/* Center Clock and Stats */}
          <View className="flex-1 justify-center items-center">
            <View className="items-center">
              {/* Pulsing Timer Label */}
              <Text className="text-zinc-500 font-bold text-xs tracking-widest uppercase mb-2">
                {currentTag?.type === 'burner' ? 'LEISURE TIME COUNTDOWN' : isBonus ? 'BONUS TIME' : 'FOCUS COUNTDOWN'}
              </Text>

              {/* Huge Timer */}
              <Text
                className={`text-white text-7xl font-extrabold tracking-tighter ${
                  currentTag?.type === 'burner' ? 'text-[#5AC8FA]' : isBonus ? 'text-purple-400' : ''
                }`}
              >
                {timeDisplay}
              </Text>
            </View>

            {/* Core Info */}
            <Text className="text-zinc-300 text-center font-bold text-lg mt-12 px-6">
              {currentTask?.title}
            </Text>
          </View>

          {/* Footer Actions */}
          <View className="mb-16 px-6 space-y-4 gap-3 w-full">
            {/* Zen Mode Activation Button */}
            <TouchableOpacity
              onPress={() => setZenMode(true)}
              style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }}
              className="w-full py-4 rounded-xl items-center flex-row justify-center"
            >
              <Ionicons name="eye-off-outline" size={20} color={currentTag?.type === 'burner' ? '#5AC8FA' : '#BF5AF2'} />
              <Text style={{ color: currentTag?.type === 'burner' ? '#5AC8FA' : '#BF5AF2' }} className="font-extrabold text-base ml-2">
                Enter Zen Mode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                feedback('sessionComplete');
                useConfettiStore.getState().triggerConfetti();
                completeSession();
              }}
              style={{ backgroundColor: currentTag?.type === 'burner' ? '#0A84FF' : '#9333EA', borderColor: currentTag?.type === 'burner' ? '#5AC8FA' : '#A855F7' }}
              className="w-full py-4 rounded-xl items-center flex-row justify-center border shadow-lg"
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="white" />
              <Text className="text-white font-extrabold text-base ml-2">
                {currentTag?.type === 'burner' ? 'Finish Entertainment Session' : 'Complete Focus Session'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAbandon}
              className="w-full bg-zinc-900 border border-zinc-800 py-4 rounded-xl items-center justify-center"
            >
              <Text className="text-red-400 font-semibold text-base">
                Abandon Focus
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Celebration Modal for Milestone Unlocks */}
      <MilestoneModal
        visible={showMilestoneModal}
        milestones={recentCompletionResult?.unlockedMilestones || []}
        onClose={clearCompletionResult}
      />

      {/* Abandon Session Confirm */}
      <ConfirmModal
        visible={abandonVisible}
        onClose={() => setAbandonVisible(false)}
        icon="flame-outline"
        iconColor="#FF453A"
        accentColor="#FF453A"
        title="Abandon Session?"
        message="You will lose all earnings and the multiplier you've built up in this session. This cannot be undone."
        actions={[
          { label: 'Keep Focusing', onPress: () => {}, style: 'cancel' },
          {
            label: 'Abandon Focus',
            style: 'destructive',
            onPress: () => {
              setZenMode(false);
              cancelSession();
            },
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E10',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
