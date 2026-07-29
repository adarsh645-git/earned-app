import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEconomyStore } from '../store/economyStore';
import { useTaskStore } from '../store/taskStore';
import { feedback } from '../utils/feedback';
import { useConfettiStore } from '../store/confettiStore';
import AnimatedTaskRow from '../components/AnimatedTaskRow';
import SwipeableRow from '../components/SwipeableRow';
import AnimatedProgressRing from '../components/AnimatedProgressRing';
import CurrencyPill from '../components/CurrencyPill';
import TaskDetailModal from '../components/TaskDetailModal';
import { getPillarColor } from '../utils/pillarColor';
import useTimerLauncher from '../hooks/useTimerLauncher';

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const ringSize = isDesktop ? 280 : Math.min(220, Math.max(170, width * 0.48));
  const strokeWidth = isDesktop ? 14 : 11;

  const [activePillarId, setActivePillarId] = useState<string>('');
  // Id-based (not a snapshot) so the detail screen reflects live edits while open.
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const { dollarBalance, hoursBalanceMinutes, debt, streak, lastCheckInDate } = useEconomyStore();
  const { tasks, tags, pillars, toggleTask, moveToIcebox, deleteTask, updateTask, addTask } = useTaskStore();
  const detailTask = tasks.find(t => t.id === detailTaskId) || null;
  const activePillars = pillars.filter(p => !p.isArchived);
  const currentPillarId = activePillarId || activePillars[0]?.id;
  const { launchTimer, blockedTimerModal } = useTimerLauncher();

  const today = new Date().toISOString().split('T')[0];
  const isCheckedInToday = lastCheckInDate === today;

  // Today's Focus / Daily Goal only ever means tasks created today (same
  // creation-date convention TasksScreen's day-grouping uses) — without this,
  // every completed task ever created for the pillar kept inflating the ring
  // and leaking into "Completed Today". Subtasks are excluded too, matching
  // TasksScreen's top-level day buckets (they're not independent daily items).
  const activeBucketTasks = tasks.filter(t => {
    const tag = tags.find(tag => tag.id === t.tagId);
    return tag?.pillarId === currentPillarId && !t.isIcebox && !t.parentId && t.dateCreated.split('T')[0] === today;
  });

  const incompleteTasks = activeBucketTasks.filter(t => !t.completed);
  const completedTasks = activeBucketTasks.filter(t => t.completed);

  const totalMinutes = activeBucketTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
  const completedMinutes = activeBucketTasks.reduce((acc, t) => acc + (t.completed ? t.estimatedMinutes : 0), 0);
  const progressPercent = totalMinutes > 0 ? Math.min(100, Math.round((completedMinutes / totalMinutes) * 100)) : 0;

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40, maxWidth: 900, width: '100%', alignSelf: 'center' }} className="flex-1 px-5">
        
        <View className="flex-row justify-between items-center mt-3 mb-2">
          <View>
            <Text className="text-[#8E8E93] text-[10px] font-bold tracking-[1.5px] uppercase">{formattedDate}</Text>
            <Text className="text-white text-3xl font-extrabold tracking-tight mt-0.5">Summary</Text>
          </View>
          
          <View className="flex-row items-center gap-2">
            <CurrencyPill
              value={streak}
              format={(n) => `${Math.round(n)}d`}
              icon="flame"
              color="#FF9500"
            />
            <CurrencyPill
              value={hoursBalanceMinutes / 60}
              format={(n) => `${n.toFixed(1)}h`}
              icon="time"
              color="#5AC8FA"
            />
            <CurrencyPill
              value={dollarBalance}
              format={(n) => `$${n.toFixed(2)}`}
              icon="logo-usd"
              color="#30D158"
            />
            {debt > 0 && (
              <CurrencyPill
                value={debt}
                format={(n) => `Tab: $${n.toFixed(2)}`}
                icon="receipt-outline"
                color="#0A84FF"
              />
            )}
          </View>
        </View>

        <View className="mt-2">
          <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px] mb-2.5">
            Daily Discipline
          </Text>
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl overflow-hidden">
            <View style={{ borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)' }} className="p-3.5 flex-row justify-between items-center">
              <View className="flex-row items-center gap-2.5">
                <View style={{ backgroundColor: 'rgba(255,149,0,0.15)', width: 28, height: 28, borderRadius: 8 }} className="items-center justify-center">
                  <Ionicons name="calendar-outline" size={15} color="#FF9500" />
                </View>
                <View>
                  <Text className="text-white font-semibold text-xs">Daily Check-In</Text>
                  <Text className="text-[#8E8E93] text-[9px]">Preserve your streak with a daily check-in</Text>
                </View>
              </View>
              
              <Pressable 
                onPress={() => {
                  if (!isCheckedInToday) {
                    const result = useEconomyStore.getState().checkInDaily();
                    if (result.rewarded) {
                      useConfettiStore.getState().triggerConfetti();
                      feedback('currency');
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
                  {isCheckedInToday ? 'Checked in' : 'Check in'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 12, marginVertical: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 4 }}>
            {activePillars.map((pillar) => {
              const isActive = currentPillarId === pillar.id;
              const pillarColor = getPillarColor(pillar.id, pillars);
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
                    borderColor: isActive ? pillarColor : 'transparent',
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

        <View className="items-center my-5 relative">
          <AnimatedProgressRing
            size={ringSize}
            strokeWidth={strokeWidth}
            progress={progressPercent}
            color="#BF5AF2"
            isDesktop={isDesktop}
            label="DAILY GOAL"
            sublabel={`${completedMinutes} / ${totalMinutes}m`}
          />
        </View>

        <View className="flex-row justify-between items-center mt-5 mb-3">
          <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px]">
            Today's Focus
          </Text>
          {activeBucketTasks.length > 0 && (
            <Text className="text-[#8E8E93] text-xs font-medium">
              {completedTasks.length} of {activeBucketTasks.length} Completed
            </Text>
          )}
        </View>

        {incompleteTasks.length === 0 ? (
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl p-8 items-center justify-center my-1 border-dashed">
            <Ionicons name="sparkles" size={32} color="#8E8E93" />
            <Text className="text-white text-center font-semibold mt-3">No active tasks yet</Text>
            <Text className="text-[#8E8E93] text-xs text-center mt-1">Schedule a focus session to start earning</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl overflow-hidden mb-3">
            {incompleteTasks.map((task, index) => {
              const tag = tags.find(tag => tag.id === task.tagId);
              const isLast = index === incompleteTasks.length - 1;
              return (
                <SwipeableRow key={task.id} taskId={task.id} onMoveToIcebox={moveToIcebox} onDelete={deleteTask} showIceboxButton>
                  <AnimatedTaskRow
                    task={task}
                    tagName={tag?.name}
                    pillarColor={getPillarColor(tag?.pillarId, pillars)}
                    isLast={isLast}
                    onToggle={toggleTask}
                    onStartTimer={launchTimer}
                    onEdit={(t) => setDetailTaskId(t.id)}
                    showStartButton
                  />
                </SwipeableRow>
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
                  <SwipeableRow key={task.id} taskId={task.id} onDelete={deleteTask} showIceboxButton={false}>
                    <AnimatedTaskRow
                      task={task}
                      tagName={tag?.name}
                      pillarColor={getPillarColor(tag?.pillarId, pillars)}
                      isLast={isLast}
                      onToggle={toggleTask}
                      onEdit={(t) => setDetailTaskId(t.id)}
                      showStartButton={false}
                    />
                  </SwipeableRow>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>

      {blockedTimerModal}

      <TaskDetailModal
        task={detailTask}
        visible={!!detailTaskId}
        tasks={tasks}
        tags={tags}
        pillars={pillars}
        onClose={() => setDetailTaskId(null)}
        onUpdate={updateTask}
        onToggle={toggleTask}
        onDelete={(id) => { deleteTask(id); setDetailTaskId(null); }}
        onStartTimer={launchTimer}
        onMoveToIcebox={moveToIcebox}
        addTask={addTask}
      />
    </SafeAreaView>
  );
}
