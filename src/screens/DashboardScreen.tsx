import React, { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Animated, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle } from 'react-native-svg';
import { useEconomyStore } from '../store/economyStore';
import { useTaskStore, Task } from '../store/taskStore';
import { useMacroGoalStore } from '../store/macroGoalStore';
import { useTimerStore } from '../store/timerStore';
import { hapticSelection, hapticSuccess } from '../utils/haptics';
import ConfirmModal from '../components/ConfirmModal';
import AnimatedTaskRow from '../components/AnimatedTaskRow';
import AnimatedMacroGoalCard from '../components/AnimatedMacroGoalCard';
import { useConfettiStore } from '../store/confettiStore';

// ─── Animated Task Row & Macro Goal Card imported from components ─────────────



export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const ringSize = isDesktop ? 280 : Math.min(220, Math.max(170, width * 0.48));
  const strokeWidth = isDesktop ? 14 : 11;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const [activePillarId, setActivePillarId] = useState<string>('');
  const [blockedModal, setBlockedModal] = useState<{ title: string; message: string } | null>(null);
  
  const { dollarBalance, hoursBalanceMinutes, debt, streak, lastCheckInDate } = useEconomyStore();
  const { tasks, tags, pillars, toggleTask, moveToIcebox } = useTaskStore();
  const activePillars = pillars.filter(p => !p.isArchived);
  const currentPillarId = activePillarId || activePillars[0]?.id;
  const { macroGoals } = useMacroGoalStore();
  const { startTimer } = useTimerStore();

  const hoursDisplay = (hoursBalanceMinutes / 60).toFixed(1);

  const today = new Date().toISOString().split('T')[0];
  const isCheckedInToday = lastCheckInDate === today;

  // Filter tasks for the active pillar that are NOT in the icebox
  const activeBucketTasks = tasks.filter(t => {
    const tag = tags.find(tag => tag.id === t.tagId);
    return tag?.pillarId === currentPillarId && !t.isIcebox;
  });

  const incompleteTasks = activeBucketTasks.filter(t => !t.completed);
  const completedTasks = activeBucketTasks.filter(t => t.completed);

  // Calculate progress
  const totalMinutes = activeBucketTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
  const completedMinutes = activeBucketTasks.reduce((acc, t) => acc + (t.completed ? t.estimatedMinutes : 0), 0);
  const progressPercent = totalMinutes > 0 ? Math.min(100, Math.round((completedMinutes / totalMinutes) * 100)) : 0;

  // Split macro goals into productive vs entertainment
  const productiveGoals = macroGoals.filter(g => !g.type || g.type === 'productive');
  const entertainmentGoals = macroGoals.filter(g => g.type === 'entertainment');

  // Format today's date: "TUESDAY, OCT 26"
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).toUpperCase();

  const handleStartTimer = (taskId: string, mins: number) => {
    const res = startTimer(taskId, mins);
    if (res && res.success === false && res.reason === 'insufficient_hours') {
      const missingHours = ((res.missingMinutes || 0) / 60).toFixed(1);
      setBlockedModal({
        title: 'Not Enough Time Earned',
        message: `You need ${missingHours} more hours of focus to earn this entertainment session. Focus on productive tasks to earn leisure time!`,
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40, maxWidth: 900, width: '100%', alignSelf: 'center' }} className="flex-1 px-5">
        
        {/* Header Section */}
        <View className="flex-row justify-between items-center mt-3 mb-2">
          <View>
            <Text className="text-[#8E8E93] text-[10px] font-bold tracking-[1.5px] uppercase">{formattedDate}</Text>
            <Text className="text-white text-3xl font-extrabold tracking-tight mt-0.5">Summary</Text>
          </View>
          
          {/* Economy Badges - Apple Pill Style (Streak, Hours, Dollars) */}
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center bg-[#1C1C1E] border border-white/10 px-3 py-1.5 rounded-full">
              <Ionicons name="flame" size={15} color="#FF9500" />
              <Text className="text-white font-bold ml-1 text-xs">{streak}d</Text>
            </View>

            {/* Hours Pill (Cyan) */}
            <View className="flex-row items-center bg-[#1C1C1E] border border-[#5AC8FA]/30 px-3 py-1.5 rounded-full">
              <Ionicons name="time" size={13} color="#5AC8FA" />
              <Text className="text-[#5AC8FA] font-bold ml-1 text-xs">{hoursDisplay}h</Text>
            </View>

            {/* Dollars Pill (Green) */}
            <View className="flex-row items-center bg-[#1C1C1E] border border-[#30D158]/30 px-3 py-1.5 rounded-full">
              <Ionicons name="logo-usd" size={13} color="#30D158" />
              <Text className="text-[#30D158] font-bold ml-0.5 text-xs">{dollarBalance.toFixed(2)}</Text>
            </View>

            {debt > 0 && (
              <View className="flex-row items-center bg-[#1C1C1E] border border-red-500/20 px-3 py-1.5 rounded-full">
                <Ionicons name="trending-down" size={14} color="#FF453A" />
                <Text className="text-[#FF453A] font-bold ml-1 text-xs">${debt.toFixed(2)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Daily Discipline Section - iOS Inset Group */}
        <View className="mt-2">
          <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px] mb-2.5">
            Daily Discipline
          </Text>
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl overflow-hidden">
            {/* Check-In Row */}
            <View style={{ borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)' }} className="p-3.5 flex-row justify-between items-center">
              <View className="flex-row items-center gap-2.5">
                <View style={{ backgroundColor: 'rgba(255,149,0,0.15)', width: 28, height: 28, borderRadius: 8 }} className="items-center justify-center">
                  <Ionicons name="calendar-outline" size={15} color="#FF9500" />
                </View>
                <View>
                  <Text className="text-white font-semibold text-xs">Daily Check-In</Text>
                  <Text className="text-[#8E8E93] text-[9px]">Streak preservation & daily check</Text>
                </View>
              </View>
              
              {/* Check-in Badge */}
              <Pressable 
                onPress={() => {
                  if (!isCheckedInToday) {
                    const result = useEconomyStore.getState().checkInDaily();
                    if (result.rewarded) {
                      useConfettiStore.getState().triggerConfetti();
                      hapticSuccess();
                    }
                  }
                }}
                style={({ pressed }) => ({ 
                  backgroundColor: isCheckedInToday ? 'rgba(48,209,88,0.15)' : '#2C2C2E', 
                  borderColor: isCheckedInToday ? 'rgba(48,209,88,0.4)' : 'rgba(255,255,255,0.05)', 
                  borderWidth: 1,
                  opacity: pressed ? 0.7 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 9999
                })} 
              >
                <Ionicons name={isCheckedInToday ? "checkmark-circle" : "ellipse-outline"} size={11} color={isCheckedInToday ? '#30D158' : '#8E8E93'} />
                <Text style={{ color: isCheckedInToday ? '#30D158' : '#8E8E93' }} className="text-[10px] font-bold ml-1">
                  {isCheckedInToday ? 'Claimed' : 'Claim'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Dynamic Pillar Segmented Control Picker */}
        <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 12, marginVertical: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 4 }}>
            {activePillars.map((pillar) => {
              const isActive = currentPillarId === pillar.id;
              return (
                <Pressable
                  key={pillar.id}
                  onPress={() => setActivePillarId(pillar.id)}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: isActive ? '#2C2C2E' : 'transparent',
                    borderWidth: isActive ? 1 : 0,
                    borderColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontWeight: isActive ? '700' : '500',
                      fontSize: 13,
                      color: isActive ? '#FFFFFF' : '#8E8E93',
                    }}
                  >
                    {pillar.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Apple Activity Progress Ring Badge */}
        <View className="items-center my-5 relative">
          <View style={{ width: ringSize, height: ringSize }} className="items-center justify-center">
            <Svg width={ringSize} height={ringSize}>
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                stroke="#1C1C1E"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                stroke="#BF5AF2"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (progressPercent / 100) * circumference}
                strokeLinecap="round"
                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              />
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center' }}>
              <Text className={`text-white font-black tracking-tighter ${isDesktop ? 'text-5xl' : 'text-3xl'}`}>
                {progressPercent}%
              </Text>
              <Text className={`text-[#8E8E93] font-bold tracking-[2px] mt-0.5 uppercase ${isDesktop ? 'text-xs' : 'text-[9px]'}`}>
                DAILY GOAL
              </Text>
              <Text className={`text-[#BF5AF2] font-semibold mt-0.5 ${isDesktop ? 'text-sm' : 'text-xs'}`}>
                {completedMinutes} / {totalMinutes}m
              </Text>
            </View>
          </View>
        </View>

        {/* Task List Header */}
        <View className="flex-row justify-between items-center mt-3 mb-3">
          <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px]">
            Today's Focus
          </Text>
          {activeBucketTasks.length > 0 && (
            <Text className="text-[#8E8E93] text-xs font-medium">
              {completedTasks.length} of {activeBucketTasks.length} Completed
            </Text>
          )}
        </View>

        {/* Task List Rendering - Apple Card List */}
        {incompleteTasks.length === 0 ? (
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl p-8 items-center justify-center my-1 border-dashed">
            <Ionicons name="sparkles" size={32} color="#8E8E93" />
            <Text className="text-white text-center font-semibold mt-3">No active tasks in this context</Text>
            <Text className="text-[#8E8E93] text-xs text-center mt-1">Schedule a focus chunk to earn key rewards</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl overflow-hidden mb-3">
            {incompleteTasks.map((task, index) => {
              const tag = tags.find(tag => tag.id === task.tagId);
              const isLast = index === incompleteTasks.length - 1;
              return (
                <AnimatedTaskRow
                  key={task.id}
                  task={task}
                  tagName={tag?.name}
                  isLast={isLast}
                  onToggle={toggleTask}
                  onStartTimer={handleStartTimer}
                  onMoveToIcebox={moveToIcebox}
                  showStartButton
                  showIceboxButton
                />
              );
            })}
          </View>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <View className="mt-5 mb-3">
            <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px] mb-3">
              Completed Today
            </Text>
            <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl overflow-hidden">
              {completedTasks.map((task, index) => {
                const tag = tags.find(tag => tag.id === task.tagId);
                const isLast = index === completedTasks.length - 1;
                return (
                  <AnimatedTaskRow
                    key={task.id}
                    task={task}
                    tagName={tag?.name}
                    isLast={isLast}
                    onToggle={toggleTask}
                    showStartButton={false}
                    showIceboxButton={false}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Pyramid Progress (Productive Macro Goals) */}
        {productiveGoals.length > 0 && (
          <View className="mt-5">
            <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px] mb-3">
              Pyramid Targets
            </Text>
            {productiveGoals.map((goal) => (
              <AnimatedMacroGoalCard
                key={goal.id}
                goal={goal}
                accentColor="#BF5AF2"
              />
            ))}
          </View>
        )}

        {/* Entertainment Projects (Burner Macro Goals) */}
        {entertainmentGoals.length > 0 && (
          <View className="mt-5">
            <Text className="text-[#5AC8FA] font-bold text-xs uppercase tracking-[1.5px] mb-3">
              Entertainment Projects
            </Text>
            {entertainmentGoals.map((goal) => (
              <AnimatedMacroGoalCard
                key={goal.id}
                goal={goal}
                accentColor="#5AC8FA"
                showIcon
                iconName="game-controller"
              />
            ))}
          </View>
        )}
        
      </ScrollView>

      {/* Blocked Timer Modal */}
      {blockedModal && (
        <ConfirmModal
          visible={!!blockedModal}
          onClose={() => setBlockedModal(null)}
          icon="time-outline"
          iconColor="#FF9F0A"
          accentColor="#FF9F0A"
          title={blockedModal.title}
          message={blockedModal.message}
          actions={[
            { label: 'Got It', onPress: () => setBlockedModal(null), style: 'default' },
          ]}
        />
      )}
    </SafeAreaView>
  );
}
