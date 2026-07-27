import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, TextInput, Pressable, ScrollView, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Summit, useSummitStore, getEligibleParents, getMilestoneDollars } from '../store/summitStore';
import { useCollectionStore } from '../store/collectionStore';
import EditableText from './EditableText';
import TimeSelectorModal from './TimeSelectorModal';
import ConfirmModal from './ConfirmModal';

interface GoalDetailModalProps {
  goal: Summit | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Summit>) => void;
  onDelete: (id: string) => void;
  onQuickStart?: (goal: Summit) => void;
  // Lets a sub-goal row (or the parent, from a sub-goal's own detail) reopen
  // this same modal for a different Summit — the pencil-on-subgoal pattern
  // AnimatedSummitCard already used against EditSummitModal, generalized.
  onNavigate?: (goal: Summit) => void;
}

/**
 * Full-screen goal detail — replaces the old centered EditSummitModal popup.
 * Opened by tapping a Summit card (or its pencil); fields autosave immediately
 * on change/blur, same convention as TaskDetailModal, so there's no separate
 * "Save" step.
 */
export default function GoalDetailModal({
  goal,
  visible,
  onClose,
  onSave,
  onDelete,
  onQuickStart,
  onNavigate,
}: GoalDetailModalProps) {
  const { summits: allGoals, setPayingLevel } = useSummitStore();
  const { collections } = useCollectionStore();

  const [horizon, setHorizon] = useState<'monthly' | 'yearly'>('monthly');
  const [targetMinutes, setTargetMinutes] = useState(0);
  const [targetMetric, setTargetMetric] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const [isOpenEnded, setIsOpenEnded] = useState(false);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [parentId, setParentId] = useState('');
  const [paysCurrency, setPaysCurrency] = useState(true);

  useEffect(() => {
    if (goal && visible) {
      setHorizon(goal.horizon);
      setTargetMinutes(goal.targetMinutes);
      setTargetMetric(String(goal.targetMetric || ''));
      setUnitLabel(goal.unitLabel || '');
      setIsOpenEnded((goal.targetMetric ?? goal.targetMinutes) === 0);
      setParentId(goal.parentId || '');
      setPaysCurrency(goal.paysCurrency !== false);
    }
  }, [goal?.id, visible]);

  const barAnim = useRef(new Animated.Value(0)).current;

  const isUnits = goal?.metricType === 'units';
  const isEntertainment = goal?.type === 'entertainment';
  const target = goal ? (isUnits ? (goal.targetMetric || 1) : goal.targetMinutes) : 0;
  const completed = goal ? (isUnits ? (goal.completedMetric || 0) : goal.completedMinutes) : 0;
  const goalIsOpenEnded = target === 0;
  const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;

  useEffect(() => {
    Animated.timing(barAnim, { toValue: pct, duration: 500, useNativeDriver: false }).start();
  }, [pct]);

  if (!goal) return null;

  const eligibleParents = getEligibleParents(allGoals, goal, goal.type || 'productive', goal.metricType || 'minutes', unitLabel);
  const subGoals = allGoals.filter(g => g.parentId === goal.id);
  const linkedJourneys = collections.filter(c => c.summitId === goal.id);
  const unlocked = goal.unlockedMilestones || [];
  const milestones = [25, 50, 75, 100];

  let completedLabel = '';
  if (goalIsOpenEnded) {
    completedLabel = `${(completed / 60).toFixed(1)}h Logged`;
  } else if (isUnits) {
    completedLabel = `${completed}/${target}${goal.unitLabel ? ` ${goal.unitLabel}` : ''}`;
  } else if (isEntertainment) {
    completedLabel = `${(completed / 60).toFixed(1)}/${(target / 60).toFixed(0)}h`;
  } else {
    completedLabel = `${completed}/${target}m`;
  }

  const barWidth = barAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

  const commitOpenEnded = (next: boolean) => {
    setIsOpenEnded(next);
    if (isUnits) {
      onSave(goal.id, { targetMetric: next ? 0 : (parseInt(targetMetric, 10) || 0) });
    } else {
      onSave(goal.id, { targetMinutes: next ? 0 : targetMinutes });
    }
  };

  const commitTargetMetric = () => {
    const parsed = parseInt(targetMetric, 10) || 0;
    if (!isOpenEnded && parsed !== (goal.targetMetric || 0)) {
      onSave(goal.id, { targetMetric: parsed });
    }
  };

  const commitUnitLabel = () => {
    const trimmed = unitLabel.trim();
    if (trimmed !== (goal.unitLabel || '')) {
      onSave(goal.id, { unitLabel: trimmed || undefined });
    }
  };

  const selectParent = (id: string) => {
    setParentId(id);
    onSave(goal.id, { parentId: id || undefined });
  };

  const selectHorizon = (h: 'monthly' | 'yearly') => {
    setHorizon(h);
    onSave(goal.id, { horizon: h });
  };

  const togglePaysCurrency = () => {
    const next = !paysCurrency;
    setPaysCurrency(next);
    if (next) {
      setPayingLevel(goal.id);
    } else {
      onSave(goal.id, { paysCurrency: false });
    }
  };

  const accentColor = isEntertainment ? '#5AC8FA' : '#BF5AF2';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}>
            <Pressable onPress={() => setConfirmDelete(true)} style={{ padding: 6 }} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color="#FF453A" />
            </Pressable>
            <Pressable onPress={onClose} style={{ padding: 6 }} hitSlop={8}>
              <Ionicons name="close" size={24} color="#A1A1AA" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <View style={{ marginBottom: 16 }}>
              <EditableText
                value={goal.title}
                onSave={(title) => onSave(goal.id, { title })}
                textStyle={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF' }}
              />
            </View>

            {/* Progress */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '500', marginBottom: 8 }}>
                {completedLabel} {!goalIsOpenEnded && `(${pct}%)`}
              </Text>
              {!goalIsOpenEnded && (
                <View style={{ backgroundColor: '#2C2C2E', width: '100%', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                  <Animated.View style={{ width: barWidth, height: '100%', backgroundColor: accentColor, borderRadius: 4 }} />
                </View>
              )}
            </View>

            {/* Milestones */}
            {!goalIsOpenEnded && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginBottom: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                {milestones.map((m) => {
                  const isUnlocked = unlocked.includes(m);
                  const dollars = getMilestoneDollars(goal.targetMinutes, m, goal.type || 'productive');
                  return (
                    <View
                      key={m}
                      style={{
                        backgroundColor: isUnlocked ? `${accentColor}26` : '#2C2C2E',
                        borderColor: isUnlocked ? `${accentColor}66` : 'rgba(255,255,255,0.05)',
                        borderWidth: 1, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4,
                        flexDirection: 'row', alignItems: 'center',
                      }}
                    >
                      <Ionicons name={isUnlocked ? 'checkmark-circle' : 'lock-closed'} size={10} color={isUnlocked ? accentColor : '#8E8E93'} />
                      <Text style={{ color: isUnlocked ? accentColor : '#8E8E93', fontSize: 9, fontWeight: '700', marginLeft: 4 }}>
                        {m}% (+${dollars.toFixed(2)})
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Contributes To */}
            {eligibleParents.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Contributes To
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Pressable
                    onPress={() => selectParent('')}
                    style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9999, borderWidth: 1, marginRight: 8, backgroundColor: !parentId ? '#FFFFFF' : '#2C2C2E', borderColor: !parentId ? '#FFFFFF' : '#3A3A3C' }}
                  >
                    <Text style={{ color: !parentId ? '#000000' : '#A1A1AA', fontSize: 13, fontWeight: !parentId ? '700' : '500' }}>None</Text>
                  </Pressable>
                  {eligibleParents.map((p) => {
                    const isSelected = parentId === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => selectParent(p.id)}
                        style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9999, borderWidth: 1, marginRight: 8, backgroundColor: isSelected ? '#FFFFFF' : '#2C2C2E', borderColor: isSelected ? '#FFFFFF' : '#3A3A3C' }}
                      >
                        <Text style={{ color: isSelected ? '#000000' : '#A1A1AA', fontSize: 13, fontWeight: isSelected ? '700' : '500' }}>{p.title}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Text style={{ color: '#5C5C5E', fontSize: 11, marginTop: 6 }}>
                  Progress here drips up automatically. {isUnits ? 'Finishing this contributes +1 up the chain.' : 'Minutes cascade up the chain.'}
                </Text>
              </View>
            )}

            {/* Rewards Paid Here */}
            <View style={{ marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1C1C1E', borderColor: '#2C2C2E', borderWidth: 1, borderRadius: 12, padding: 16 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Rewards Paid Here</Text>
                <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 2 }}>
                  Only one level per chain pays currency. Turning this on turns it off everywhere else in the chain.
                </Text>
              </View>
              <Pressable onPress={togglePaysCurrency}>
                <View style={{ width: 44, height: 26, borderRadius: 13, padding: 3, backgroundColor: paysCurrency ? '#30D158' : '#3A3A3C', alignItems: paysCurrency ? 'flex-end' : 'flex-start' }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' }} />
                </View>
              </Pressable>
            </View>

            {/* Horizon */}
            {!parentId && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Horizon
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['monthly', 'yearly'] as const).map((h) => (
                    <Pressable
                      key={h}
                      onPress={() => selectHorizon(h)}
                      style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9999, borderWidth: 1, backgroundColor: horizon === h ? '#FFFFFF' : '#2C2C2E', borderColor: horizon === h ? '#FFFFFF' : '#3A3A3C' }}
                    >
                      <Text style={{ color: horizon === h ? '#000000' : '#A1A1AA', fontSize: 13, fontWeight: horizon === h ? '700' : '500', textTransform: 'capitalize' }}>{h}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Target */}
            <View style={{ marginBottom: 28 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {isUnits ? 'Target Units' : 'Target Duration'}
                </Text>
                <Pressable onPress={() => commitOpenEnded(!isOpenEnded)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={isOpenEnded ? 'checkbox' : 'square-outline'} size={16} color={isOpenEnded ? '#BF5AF2' : '#8E8E93'} />
                  <Text style={{ color: isOpenEnded ? '#BF5AF2' : '#8E8E93', fontSize: 12, marginLeft: 4 }}>Open Ended</Text>
                </Pressable>
              </View>

              {isOpenEnded ? (
                <View style={{ backgroundColor: '#1C1C1E', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#2C2C2E', alignItems: 'center' }}>
                  <Text style={{ color: '#8E8E93', fontSize: 13, fontStyle: 'italic' }}>Will count up progress without a fixed target.</Text>
                </View>
              ) : isUnits ? (
                <>
                  <TextInput
                    value={targetMetric}
                    onChangeText={setTargetMetric}
                    onBlur={commitTargetMetric}
                    placeholder="e.g. 12"
                    placeholderTextColor="#5C5C5E"
                    keyboardType="numeric"
                    style={[{ backgroundColor: '#1C1C1E', color: '#FFFFFF', padding: 16, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#2C2C2E' }, { outlineStyle: 'none' } as any]}
                  />
                  <TextInput
                    value={unitLabel}
                    onChangeText={setUnitLabel}
                    onBlur={commitUnitLabel}
                    placeholder="Unit label (e.g. pages, reps, km)"
                    placeholderTextColor="#5C5C5E"
                    style={[{ backgroundColor: '#1C1C1E', color: '#FFFFFF', padding: 16, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#2C2C2E', marginTop: 8 }, { outlineStyle: 'none' } as any]}
                  />
                </>
              ) : (
                <Pressable
                  onPress={() => setShowTimeSelector(true)}
                  style={{ backgroundColor: '#1C1C1E', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#2C2C2E', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 16 }}>
                    {Math.floor(targetMinutes / 60)}h {targetMinutes % 60}m
                  </Text>
                  <Ionicons name="time-outline" size={20} color="#A1A1AA" />
                </Pressable>
              )}
            </View>

            {/* Sub-goals */}
            {subGoals.length > 0 && (
              <View style={{ marginBottom: 28 }}>
                <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Sub-Goals
                </Text>
                {subGoals.map((sg) => {
                  const sgIsUnits = sg.metricType === 'units';
                  const sgTarget = sgIsUnits ? (sg.targetMetric || 1) : sg.targetMinutes;
                  const sgCompleted = sgIsUnits ? (sg.completedMetric || 0) : sg.completedMinutes;
                  const sgOpenEnded = sgTarget === 0;
                  const sgPct = sgOpenEnded ? 0 : Math.min(100, Math.round((sgCompleted / sgTarget) * 100));
                  return (
                    <Pressable
                      key={sg.id}
                      onPress={() => onNavigate?.(sg)}
                      style={{ backgroundColor: '#1C1C1E', borderRadius: 12, borderWidth: 1, borderColor: '#2C2C2E', padding: 14, marginBottom: 8 }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sgOpenEnded ? 0 : 6 }}>
                        <Text style={{ color: '#EBEBF5', fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 }} numberOfLines={1}>{sg.title}</Text>
                        <Text style={{ color: '#8E8E93', fontSize: 12 }}>{sgOpenEnded ? `${(sgCompleted / 60).toFixed(1)}h` : `${sgPct}%`}</Text>
                      </View>
                      {!sgOpenEnded && (
                        <View style={{ backgroundColor: '#2C2C2E', width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' }}>
                          <View style={{ width: `${sgPct}%`, height: '100%', backgroundColor: accentColor, opacity: 0.8, borderRadius: 2 }} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Journeys (reverse lookup) */}
            {linkedJourneys.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Journeys
                </Text>
                {linkedJourneys.map((j) => (
                  <View key={j.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1C1C1E', borderRadius: 12, borderWidth: 1, borderColor: '#2C2C2E', padding: 14, marginBottom: 8 }}>
                    <Text style={{ color: '#EBEBF5', fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 }} numberOfLines={1}>{j.title}</Text>
                    <Text style={{ color: '#8E8E93', fontSize: 12 }}>{goalIsOpenEnded ? `${(completed / 60).toFixed(1)}h` : `${pct}%`}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Footer */}
            {onQuickStart && (
              <View style={{ marginTop: 16 }}>
                <Pressable
                  onPress={() => { onQuickStart(goal); onClose(); }}
                  style={({ pressed }: any) => ({
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isEntertainment ? '#5AC8FA' : '#BF5AF2', paddingVertical: 14, borderRadius: 12,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Ionicons name="play" size={16} color={isEntertainment ? '#000' : '#FFF'} style={{ marginRight: 6 }} />
                  <Text style={{ color: isEntertainment ? '#000' : '#FFF', fontWeight: '700', fontSize: 14 }}>
                    {isEntertainment ? 'Indulge' : 'Focus'}
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <TimeSelectorModal
        visible={showTimeSelector}
        initialMinutes={targetMinutes}
        title="Target Duration"
        onClose={() => setShowTimeSelector(false)}
        onConfirm={(mins) => {
          setTargetMinutes(mins);
          onSave(goal.id, { targetMinutes: mins });
          setShowTimeSelector(false);
        }}
      />

      <ConfirmModal
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        icon="trash-outline"
        iconColor="#FF453A"
        accentColor="#FF453A"
        title="Delete Summit?"
        message={`"${goal.title}" will be removed${goal.parentId ? '' : ', along with any of its sub-goals'}. Linked tasks and Journeys stay put — they just lose their link to this goal. This cannot be undone.`}
        actions={[
          { label: 'Keep It', onPress: () => {}, style: 'cancel' },
          { label: 'Delete Summit', style: 'destructive', onPress: () => { onDelete(goal.id); setConfirmDelete(false); onClose(); } },
        ]}
      />
    </Modal>
  );
}
