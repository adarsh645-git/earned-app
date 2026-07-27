import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEconomyStore, IOU_CAP } from '../store/economyStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { feedback } from '../utils/feedback';
import { useTaskStore } from '../store/taskStore';
import { useGoalStore, Goal, getMilestoneDollars } from '../store/goalStore';
import { useAuthStore } from '../store/authStore';
import { useSyncStatusStore, isSyncUnhealthy } from '../store/syncStatusStore';
import GoalDetailModal from '../components/GoalDetailModal';

const PremiumInput = (props: React.ComponentProps<typeof TextInput>) => (
  <TextInput
    {...props}
    style={[props.style, { outlineStyle: 'none' } as any]}
  />
);

export default function ProfileScreen() {
  const { user, openModal } = useAuthStore();
  const syncUnhealthy = useSyncStatusStore((s) => isSyncUnhealthy(s.channels));
  const {
    dollarBalance,
    streak,
    debt,
    getDisciplineScore,
    clearDebtForTesting
  } = useEconomyStore();
  const { tasks, pillars, tags, addPillar, archivePillar, addTag, archiveTag } = useTaskStore();
  const { goals: allGoals, updateGoal, deleteGoal } = useGoalStore();
  // Goals shown here are productive goals only — entertainment projects live in the Store.
  const goals = allGoals.filter(g => !g.type || g.type === 'productive');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const { soundEnabled, toggleSound } = usePreferencesStore();

  // Pillars & Categories state
  const [newPillarName, setNewPillarName] = useState('');
  const [expandedPillarId, setExpandedPillarId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagType, setNewTagType] = useState<'earner' | 'burner'>('earner');
  const activePillars = pillars.filter(p => !p.isArchived);

  // Total focused time calculations
  const totalCompletedMinutes = tasks
    .filter(t => t.completed)
    .reduce((acc, t) => acc + t.estimatedMinutes, 0);

  const totalHours = (totalCompletedMinutes / 60).toFixed(1);

  const handleResetData = () => {
    Alert.alert(
      'Reset app data?',
      'This will erase all of your banked cash, streaks, goals, and tasks permanently. Are you sure you want to do this?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Reset Successful', 'Restart the app to see your clean slate.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40, maxWidth: 900, width: '100%', alignSelf: 'center' }} className="flex-1 px-5">

        {/* Header */}
        <View className="flex-row justify-between items-center mt-3 mb-5">
          <Text className="text-white text-3xl font-extrabold tracking-tight">Profile & Stats</Text>
          <Pressable onPress={handleResetData} style={{ backgroundColor: 'rgba(255,69,58,0.15)', borderColor: 'rgba(255,69,58,0.4)', borderWidth: 1 }} className="p-2 rounded-xl">
            <Ionicons name="trash-outline" size={17} color="#FF453A" />
          </Pressable>
        </View>

        {/* Stats Grid - Apple Widget Cards */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          {/* Streak */}
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="flex-1 min-w-[45%] p-4 rounded-2xl">
            <View style={{ backgroundColor: 'rgba(255,149,0,0.15)', width: 32, height: 32, borderRadius: 8 }} className="items-center justify-center mb-3">
              <Ionicons name="flame" size={18} color="#FF9500" />
            </View>
            <Text className="text-white text-2xl font-bold tracking-tight">{streak} Days</Text>
            <Text className="text-[#8E8E93] text-[10px] font-bold mt-1 uppercase tracking-wider">
              Daily Streak
            </Text>
          </View>

          {/* Total Focus */}
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="flex-1 min-w-[45%] p-4 rounded-2xl">
            <View style={{ backgroundColor: 'rgba(191,90,242,0.15)', width: 32, height: 32, borderRadius: 8 }} className="items-center justify-center mb-3">
              <Ionicons name="time" size={18} color="#BF5AF2" />
            </View>
            <Text className="text-white text-2xl font-bold tracking-tight">{totalHours} hrs</Text>
            <Text className="text-[#8E8E93] text-[10px] font-bold mt-1 uppercase tracking-wider">
              Deep Work
            </Text>
          </View>

          {/* Keys Balance */}
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="flex-1 min-w-[45%] p-4 rounded-2xl">
            <View style={{ backgroundColor: 'rgba(48,209,88,0.15)', width: 32, height: 32, borderRadius: 8 }} className="items-center justify-center mb-3">
              <Ionicons name="logo-usd" size={15} color="#30D158" />
            </View>
            <Text className="text-white text-2xl font-bold tracking-tight">{dollarBalance.toFixed(2)}</Text>
            <Text className="text-[#8E8E93] text-[10px] font-bold mt-1 uppercase tracking-wider">
              Banked Cash
            </Text>
          </View>

          {/* Completed Tasks */}
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="flex-1 min-w-[45%] p-4 rounded-2xl">
            <View style={{ backgroundColor: 'rgba(48,209,88,0.15)', width: 32, height: 32, borderRadius: 8 }} className="items-center justify-center mb-3">
              <Ionicons name="checkmark-done" size={18} color="#30D158" />
            </View>
            <Text className="text-white text-2xl font-bold tracking-tight">
              {tasks.filter(t => t.completed).length}
            </Text>
            <Text className="text-[#8E8E93] text-[10px] font-bold mt-1 uppercase tracking-wider">
              Tasks Completed
            </Text>
          </View>
        </View>

        {/* Cloud Sync & Account Status Card */}
        <View className="mb-6">
          <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px] mb-3">
            Account Status
          </Text>
          <Pressable
            onPress={openModal}
            style={{
              backgroundColor: '#1C1C1E',
              borderColor: user && syncUnhealthy ? 'rgba(255,159,10,0.4)' : user ? 'rgba(48,209,88,0.3)' : 'rgba(191,90,242,0.3)',
              borderWidth: 1,
            }}
            className="p-4 rounded-2xl flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1 pr-3">
              <View
                style={{
                  backgroundColor: user && syncUnhealthy ? 'rgba(255,159,10,0.15)' : user ? 'rgba(48,209,88,0.15)' : 'rgba(191,90,242,0.15)',
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                }}
                className="items-center justify-center mr-3"
              >
                <Ionicons
                  name={user && syncUnhealthy ? 'cloud-offline-outline' : user ? 'person-circle' : 'log-in-outline'}
                  size={24}
                  color={user && syncUnhealthy ? '#FF9F0A' : user ? '#30D158' : '#BF5AF2'}
                />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">
                  {user ? user.user_metadata?.name || user.user_metadata?.full_name || 'Logged In' : 'Login'}
                </Text>
                <Text style={user && syncUnhealthy ? { color: '#FF9F0A' } : undefined} className="text-[#8E8E93] text-xs font-medium mt-0.5" numberOfLines={1}>
                  {user && syncUnhealthy ? 'Sync paused — tap for details' : user ? user.email : 'Tap to sign in with Google'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </Pressable>
        </View>

        {/* Preferences */}
        <View className="mb-6">
          <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px] mb-3">
            Preferences
          </Text>
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl overflow-hidden">
            <Pressable
              onPress={() => {
                const next = !soundEnabled;
                toggleSound();
                if (next) feedback('select'); // preview the sound when enabling
              }}
              className="p-3.5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center gap-2.5">
                <View style={{ backgroundColor: 'rgba(191,90,242,0.15)', width: 28, height: 28, borderRadius: 8 }} className="items-center justify-center">
                  <Ionicons name={soundEnabled ? 'volume-high' : 'volume-mute'} size={15} color="#BF5AF2" />
                </View>
                <View>
                  <Text className="text-white font-semibold text-xs">Sound Effects</Text>
                  <Text className="text-[#8E8E93] text-[9px]">Subtle sound cues on web</Text>
                </View>
              </View>
              <View
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  padding: 3,
                  backgroundColor: soundEnabled ? '#30D158' : '#3A3A3C',
                  alignItems: soundEnabled ? 'flex-end' : 'flex-start',
                }}
              >
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' }} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Discipline Score & Tab Dashboard - Apple Widget */}
        <View className="mb-6">
          <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px] mb-3">
            Discipline Score & Tab
          </Text>
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="p-5 rounded-2xl">
            {/* Score Ring / Bar - pure positive signal, never gates anything */}
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-white text-3xl font-black tracking-tight">{getDisciplineScore()}</Text>
                <Text className="text-[#8E8E93] text-[10px] font-bold uppercase tracking-wider mt-0.5">
                  Discipline Score
                </Text>
              </View>
              {/* Rating Badge */}
              <View
                style={{
                  backgroundColor: getDisciplineScore() >= 800 ? 'rgba(48,209,88,0.15)' : getDisciplineScore() >= 700 ? 'rgba(10,132,255,0.15)' : 'rgba(191,90,242,0.15)',
                  borderColor: getDisciplineScore() >= 800 ? '#30D158' : getDisciplineScore() >= 700 ? '#0A84FF' : '#BF5AF2',
                  borderWidth: 1
                }}
                className="px-3.5 py-1.5 rounded-full"
              >
                <Text
                  style={{
                    color: getDisciplineScore() >= 800 ? '#30D158' : getDisciplineScore() >= 700 ? '#0A84FF' : '#BF5AF2'
                  }}
                  className="text-xs font-black uppercase tracking-wider"
                >
                  {getDisciplineScore() >= 800 ? 'Excellent' : getDisciplineScore() >= 700 ? 'Great' : 'Good'}
                </Text>
              </View>
            </View>

            {/* Tab indicator */}
            <View style={{ borderTopWidth: 0.5, borderTopColor: '#2C2C2E' }} className="pt-4 flex-row justify-between items-center">
              <View>
                <Text className="text-white text-lg font-bold">${debt.toFixed(2)}</Text>
                <Text className="text-[#8E8E93] text-[9px] uppercase font-bold tracking-wider mt-0.5">On Tab</Text>
              </View>
              <View className="items-end">
                <Text className="text-white text-sm font-semibold">${IOU_CAP.toFixed(2)}</Text>
                <Text className="text-[#8E8E93] text-[9px] uppercase font-bold tracking-wider mt-0.5">Tab Limit</Text>
              </View>
            </View>

            {/* Neutral reminder - no interest, no default, just a reminder to close the loop */}
            {debt > 0 && (
              <View style={{ backgroundColor: 'rgba(10,132,255,0.1)', borderColor: 'rgba(10,132,255,0.3)', borderWidth: 1 }} className="mt-4 p-3 rounded-xl flex-row items-center gap-2">
                <Ionicons name="information-circle" size={16} color="#0A84FF" />
                <Text className="text-xs flex-1" style={{ color: '#0A84FF', fontWeight: '600' }}>
                  You owe ${debt.toFixed(2)} — future earnings go here first until you're square. No interest, no penalty.
                </Text>
              </View>
            )}

            {/* Clear Tab testing utility */}
            {__DEV__ && debt > 0 && (
              <Pressable
                onPress={clearDebtForTesting}
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', alignSelf: 'flex-start' }}
                className="mt-3 px-3 py-1.5 rounded-lg"
              >
                <Text className="text-[#8E8E93] text-[10px] font-bold">Clear Tab (Dev Tool)</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Pillars & Categories Section */}
        <View className="flex-row justify-between items-center mb-3 mt-6">
          <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px]">
            Pillars & Categories
          </Text>
        </View>
        <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl overflow-hidden mb-8 p-4">
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <PremiumInput
              value={newPillarName}
              onChangeText={setNewPillarName}
              placeholder="New Pillar Name"
              placeholderTextColor="#8E8E93"
              style={{ flex: 1, color: '#FFF', backgroundColor: '#000', padding: 12, borderRadius: 8, fontSize: 14 }}
            />
            <Pressable
              onPress={() => {
                if (newPillarName.trim() && activePillars.length < 5) {
                  addPillar(newPillarName.trim());
                  setNewPillarName('');
                }
              }}
              disabled={activePillars.length >= 5 || !newPillarName.trim()}
              style={{
                backgroundColor: activePillars.length >= 5 ? '#2C2C2E' : '#BF5AF2',
                marginLeft: 8,
                padding: 12,
                borderRadius: 8,
                opacity: (activePillars.length >= 5 || !newPillarName.trim()) ? 0.5 : 1
              }}
            >
              <Ionicons name="add" size={18} color="#FFF" />
            </Pressable>
          </View>
          {activePillars.length >= 5 && (
            <Text style={{ color: '#FF453A', fontSize: 10, marginBottom: 12, fontWeight: '600' }}>Max limit of 5 Pillars reached.</Text>
          )}

          {activePillars.map((pillar, index) => {
            const isExpanded = expandedPillarId === pillar.id;
            const pillarTags = tags.filter(t => t.pillarId === pillar.id && !t.isArchived);
            const isLast = index === activePillars.length - 1;

            return (
              <View key={pillar.id} style={{ borderBottomWidth: isLast && !isExpanded ? 0 : 0.5, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                <Pressable
                  onPress={() => setExpandedPillarId(isExpanded ? null : pillar.id)}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }}
                >
                  <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' }}>{pillar.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ color: '#8E8E93', fontSize: 12 }}>{pillarTags.length} Categories</Text>
                    <Pressable onPress={() => {
                        Alert.alert('Archive Pillar', 'This will hide this Pillar and its Categories from active selection. Historical data remains intact.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Archive', style: 'destructive', onPress: () => archivePillar(pillar.id) }
                        ]);
                      }}>
                      <Ionicons name="archive-outline" size={16} color="#FF453A" />
                    </Pressable>
                  </View>
                </Pressable>

                {isExpanded && (
                  <View style={{ backgroundColor: '#09090B', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#27272A' }}>
                    {pillarTags.map(tag => (
                      <View key={tag.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#27272A' }}>
                        <Text style={{ color: '#E4E4E7', fontSize: 13 }}>{tag.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ color: tag.type === 'earner' ? '#30D158' : '#FF453A', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                            {tag.type}
                          </Text>
                          <Pressable onPress={() => archiveTag(tag.id)}>
                            <Ionicons name="close-circle" size={16} color="#52525B" />
                          </Pressable>
                        </View>
                      </View>
                    ))}

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                      <PremiumInput
                        value={newTagName}
                        onChangeText={setNewTagName}
                        placeholder="New Category"
                        placeholderTextColor="#52525B"
                        style={{ flex: 1, color: '#FFF', backgroundColor: '#000', padding: 8, borderRadius: 6, fontSize: 12, borderWidth: 1, borderColor: '#27272A' }}
                      />
                      <Pressable
                        onPress={() => setNewTagType(newTagType === 'earner' ? 'burner' : 'earner')}
                        style={{
                          backgroundColor: newTagType === 'earner' ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)',
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          borderRadius: 6,
                          marginLeft: 8,
                          borderWidth: 1,
                          borderColor: newTagType === 'earner' ? 'rgba(48,209,88,0.3)' : 'rgba(255,69,58,0.3)'
                        }}
                      >
                        <Text style={{ color: newTagType === 'earner' ? '#30D158' : '#FF453A', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                          {newTagType}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          if (newTagName.trim()) {
                            addTag({ name: newTagName.trim(), type: newTagType, pillarId: pillar.id });
                            setNewTagName('');
                          }
                        }}
                        disabled={!newTagName.trim()}
                        style={{ backgroundColor: newTagName.trim() ? '#E4E4E7' : '#27272A', marginLeft: 8, padding: 8, borderRadius: 6 }}
                      >
                        <Ionicons name="add" size={14} color={newTagName.trim() ? '#000' : '#52525B'} />
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Goals Section — created from the Journeys tab; this is a read/edit/delete view */}
        <View className="flex-row justify-between items-center mb-3 mt-1">
          <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px]">
            Goals
          </Text>
        </View>

        {goals.length === 0 ? (
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl p-8 items-center justify-center border-dashed">
            <Ionicons name="shapes-outline" size={32} color="#8E8E93" />
            <Text className="text-white text-center font-semibold mt-3">No Goals yet</Text>
            <Text className="text-[#8E8E93] text-xs text-center mt-1">Create a Journey to start tracking a long-term goal — Journeys are where Goals get created.</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl overflow-hidden mb-3">
            {goals.map((goal, index) => {
              // Units-mode goals (e.g. "pages", "reps") track completedMetric/
              // targetMetric, not minutes — this used to always show hours
              // regardless of metricType, which was meaningless for a Count goal.
              const isUnits = goal.metricType === 'units';
              const completed = isUnits ? (goal.completedMetric || 0) : goal.completedMinutes;
              const target = isUnits ? (goal.targetMetric || 0) : goal.targetMinutes;
              // target is 0 for open-ended goals — without this guard,
              // completed / 0 produces NaN/Infinity, which renders as an
              // invalid width and shows the bar as already fully filled.
              const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
              const progressLabel = isUnits
                ? `${completed} / ${target}${goal.unitLabel ? ` ${goal.unitLabel}` : ''} (${pct}%)`
                : `${(goal.completedMinutes / 60).toFixed(1)} / ${(goal.targetMinutes / 60).toFixed(1)} hrs (${pct}%)`;
              const unlocked = goal.unlockedMilestones || [];
              const milestones = [25, 50, 75, 100];
              const isLast = index === goals.length - 1;
              return (
                <Pressable
                  key={goal.id}
                  onPress={() => setEditingGoal(goal)}
                  style={{
                    borderBottomWidth: isLast ? 0 : 0.5,
                    borderBottomColor: 'rgba(255,255,255,0.08)',
                  }}
                  className="p-4"
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <View className="flex-row items-center flex-1 pr-2">
                      <View>
                        <Text className="text-white font-semibold text-sm">{goal.title}</Text>
                        <Text className="text-[#8E8E93] text-[9px] font-bold uppercase mt-0.5 tracking-wider">
                          {goal.horizon} Target
                        </Text>
                      </View>
                      <Pressable onPress={() => setEditingGoal(goal)} style={{ padding: 6, marginLeft: 4 }}>
                        <Ionicons name="pencil" size={13} color="#8E8E93" />
                      </Pressable>
                    </View>
                    <Text className="text-[#8E8E93] text-xs font-medium">
                      {progressLabel}
                    </Text>
                  </View>
                  {/* Progress Bar */}
                  <View style={{ backgroundColor: '#2C2C2E' }} className="w-full h-2 rounded-full overflow-hidden mb-3">
                    <View
                      style={{ width: `${pct}%`, backgroundColor: '#BF5AF2' }}
                      className="h-full rounded-full"
                    />
                  </View>
                  {/* Milestone Rewards Row */}
                  <View style={{ borderTopColor: 'rgba(255,255,255,0.08)' }} className="flex-row justify-between items-center pt-2 border-t">
                    {milestones.map((m) => {
                      const isUnlocked = unlocked.includes(m);
                      const dollars = getMilestoneDollars(goal.targetMinutes, m, goal.type || 'productive');
                      return (
                        <View
                          key={m}
                          style={{
                            backgroundColor: isUnlocked ? 'rgba(191,90,242,0.15)' : '#2C2C2E',
                            borderColor: isUnlocked ? 'rgba(191,90,242,0.4)' : 'rgba(255,255,255,0.05)',
                          }}
                          className="flex-row items-center px-2 py-1 rounded-full border"
                        >
                          <Ionicons
                            name={isUnlocked ? 'checkmark-circle' : 'lock-closed'}
                            size={10}
                            color={isUnlocked ? '#BF5AF2' : '#8E8E93'}
                          />
                          <Text
                            style={{ color: isUnlocked ? '#BF5AF2' : '#8E8E93' }}
                            className="text-[9px] font-bold ml-1"
                          >
                            {m}% (+${dollars.toFixed(2)})
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

      </ScrollView>

      <GoalDetailModal
        goal={editingGoal}
        visible={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        onSave={(id, updates) => updateGoal(id, updates)}
        onDelete={(id) => deleteGoal(id)}
        onNavigate={(g) => setEditingGoal(g)}
      />
    </SafeAreaView>
  );
}
