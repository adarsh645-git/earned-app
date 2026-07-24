import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, Animated, Dimensions, Pressable, TextInput } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MacroGoal, getMilestoneDollars, useMacroGoalStore } from '../store/macroGoalStore';
import { hapticHeavyImpact, hapticMediumImpact } from '../utils/haptics';
import { useConfettiStore } from '../store/confettiStore';
import EditMacroGoalModal from './EditMacroGoalModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnimatedMacroGoalCardProps {
  goal: MacroGoal;
  subGoals?: MacroGoal[];
  accentColor: string; // '#BF5AF2' for productive, '#5AC8FA' for entertainment
  showIcon?: boolean;
  iconName?: string;
  onQuickStart?: (goal: MacroGoal) => void;
  onAddSubGoal?: (parentId: string) => void;
}

// ─── Mini Confetti Burst (localized to a milestone badge) ────────────────────
const BURST_PARTICLE_COUNT = 12;

function MiniBurst({ color, trigger }: { color: string; trigger: boolean }) {
  const particles = useRef(
    Array.from({ length: BURST_PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!trigger) return;

    particles.forEach((p) => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(1);
      p.scale.setValue(0.8 + Math.random() * 0.4);

      const angle = (Math.PI * 2 * p.id) / BURST_PARTICLE_COUNT + (Math.random() - 0.5) * 0.3;
      const distance = 18 + Math.random() * 16;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;

      Animated.parallel([
        Animated.timing(p.x, { toValue: tx, duration: 400, useNativeDriver: true }),
        Animated.timing(p.y, { toValue: ty, duration: 400, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(p.opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
      ]).start();
    });
  }, [trigger]);

  if (!trigger) return null;

  return (
    <View style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0, zIndex: 10 }} pointerEvents="none">
      {particles.map((p) => (
        <Animated.View
          key={p.id}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: color,
            opacity: p.opacity,
            transform: [
              { translateX: p.x },
              { translateY: p.y },
              { scale: p.scale },
            ],
          }}
        />
      ))}
    </View>
  );
}

// ─── Animated Milestone Badge ────────────────────────────────────────────────
function MilestoneBadge({
  milestone,
  isUnlocked,
  justUnlocked,
  dollars,
  accentColor,
}: {
  milestone: number;
  isUnlocked: boolean;
  justUnlocked: boolean;
  dollars: number;
  accentColor: string;
}) {
  const badgeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (justUnlocked) {
      hapticMediumImpact();
      Animated.sequence([
        Animated.spring(badgeScale, {
          toValue: 1.4,
          useNativeDriver: true,
          speed: 60,
          bounciness: 18,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 30,
          bounciness: 8,
        }),
      ]).start();
    }
  }, [justUnlocked]);

  const bgColor = isUnlocked ? `${accentColor}26` : '#2C2C2E'; // 26 = ~15% opacity hex
  const borderColor = isUnlocked ? `${accentColor}66` : 'rgba(255,255,255,0.05)'; // 66 = ~40% opacity hex

  return (
    <Animated.View
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderWidth: 1,
        borderRadius: 99,
        paddingHorizontal: 8,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        transform: [{ scale: badgeScale }],
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <MiniBurst color={accentColor} trigger={justUnlocked} />
      <Ionicons
        name={isUnlocked ? 'checkmark-circle' : 'lock-closed'}
        size={10}
        color={isUnlocked ? accentColor : '#8E8E93'}
      />
      <Text
        style={{ color: isUnlocked ? accentColor : '#8E8E93', fontSize: 9, fontWeight: '700', marginLeft: 4 }}
      >
        {milestone}% (+${dollars.toFixed(2)})
      </Text>
    </Animated.View>
  );
}

// ─── Counting Percentage Text ────────────────────────────────────────────────
function CountingPercentage({
  targetPct,
  completedLabel,
  accentColor,
}: {
  targetPct: number;
  completedLabel: string;
  accentColor: string;
}) {
  const animValue = useRef(new Animated.Value(targetPct)).current;
  const [displayPct, setDisplayPct] = React.useState(targetPct);

  useEffect(() => {
    const listenerId = animValue.addListener(({ value }) => {
      setDisplayPct(Math.round(value));
    });

    Animated.timing(animValue, {
      toValue: targetPct,
      duration: 800,
      useNativeDriver: false, // Must be false for listener-based approach
    }).start();

    return () => animValue.removeListener(listenerId);
  }, [targetPct]);

  return (
    <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '500' }}>
      {completedLabel} ({displayPct}%)
    </Text>
  );
}

// ─── Inline Editable Text ────────────────────────────────────────────────────
function InlineEditableText({
  initialValue,
  textStyle,
  onSave,
  numberOfLines = 1,
}: {
  initialValue: string;
  textStyle: any;
  onSave: (val: string) => void;
  numberOfLines?: number;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [value, setValue] = React.useState(initialValue);

  // Sync internal state if initialValue changes externally
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSave = () => {
    setIsEditing(false);
    if (value.trim() && value.trim() !== initialValue) {
      onSave(value.trim());
    } else {
      setValue(initialValue);
    }
  };

  if (isEditing) {
    return (
      <TextInput
        value={value}
        onChangeText={setValue}
        onBlur={handleSave}
        onSubmitEditing={handleSave}
        autoFocus
        style={[textStyle, { padding: 0, margin: 0, minWidth: 100, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, paddingHorizontal: 4 }]}
        returnKeyType="done"
      />
    );
  }

  return (
    <Pressable onPress={() => setIsEditing(true)}>
      <Text style={textStyle} numberOfLines={numberOfLines}>
        {initialValue}
      </Text>
    </Pressable>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AnimatedMacroGoalCard({
  goal,
  subGoals = [],
  accentColor,
  showIcon = false,
  iconName,
  onQuickStart,
  onAddSubGoal,
}: AnimatedMacroGoalCardProps) {
  const { updateMacroGoal, deleteMacroGoal } = useMacroGoalStore();
  const [editingGoal, setEditingGoal] = useState<MacroGoal | null>(null);
  const isUnits = goal.metricType === 'units';
  const isEntertainment = goal.type === 'entertainment';
  const target = isUnits ? (goal.targetMetric || 1) : goal.targetMinutes;
  const completed = isUnits ? (goal.completedMetric || 0) : goal.completedMinutes;
  
  const isOpenEnded = target === 0;
  const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
  const unlocked = goal.unlockedMilestones || [];
  const milestones = [25, 50, 75, 100];

  let displayCategory = '';
  let displayIcon = iconName;
  if (goal.category === 'video-game') { displayCategory = 'Video Game'; displayIcon = 'game-controller'; }
  else if (goal.category === 'movie') { displayCategory = 'Movie'; displayIcon = 'film'; }
  else if (goal.category === 'tv-show') { displayCategory = 'TV Show'; displayIcon = 'tv'; }
  else if (goal.category === 'youtube') { displayCategory = 'YouTube'; displayIcon = 'logo-youtube'; }
  else if (goal.category === 'custom') { displayCategory = 'Entertainment'; displayIcon = 'star'; }

  // Animated progress bar width
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false, // width animation requires layout
    }).start();
  }, [pct]);

  // Track newly unlocked milestones for burst animation
  const prevUnlocked = useRef<number[]>(unlocked);
  const justUnlockedSet = new Set<number>();

  unlocked.forEach((m) => {
    if (!prevUnlocked.current.includes(m)) {
      justUnlockedSet.add(m);
    }
  });

  // If 100% just unlocked, trigger full-screen confetti + heavy haptic
  useEffect(() => {
    if (justUnlockedSet.has(100)) {
      hapticHeavyImpact();
      useConfettiStore.getState().triggerConfetti();
    }
    // Update ref after rendering
    prevUnlocked.current = [...unlocked];
  }, [unlocked.length]);

  // Format labels based on goal type
  
  let completedLabel = '';
  if (isOpenEnded) {
    completedLabel = `${(completed / 60).toFixed(1)}h Logged`;
  } else if (isUnits) {
    completedLabel = `${completed}/${target}`;
  } else if (isEntertainment) {
    completedLabel = `${(completed / 60).toFixed(1)}/${(target / 60).toFixed(0)}h`;
  } else {
    completedLabel = `${completed}/${target}m`;
  }

  const barWidth = barAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  // Determine border color based on accent
  const borderColorCard = isEntertainment ? 'rgba(90,200,250,0.15)' : 'rgba(255,255,255,0.08)';

  return (
    <View
      style={{
        backgroundColor: '#1C1C1E',
        borderColor: borderColorCard,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {/* Header Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          {(showIcon || displayIcon) && (
            <Ionicons name={(displayIcon || iconName) as any} size={16} color={accentColor} />
          )}
          <InlineEditableText
            initialValue={goal.title}
            textStyle={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}
            onSave={(newTitle) => updateMacroGoal(goal.id, { title: newTitle })}
          />
          {displayCategory !== '' && (
            <View style={{ backgroundColor: '#2C2C2E', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 4 }}>
              <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '600' }}>{displayCategory}</Text>
            </View>
          )}
          <Pressable onPress={() => setEditingGoal(goal)} style={{ padding: 4, marginLeft: 2 }}>
            <Ionicons name="pencil" size={13} color="#8E8E93" />
          </Pressable>
        </View>
        {isOpenEnded ? (
          <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '500' }}>
            {completedLabel}
          </Text>
        ) : (
          <CountingPercentage
            targetPct={pct}
            completedLabel={completedLabel}
            accentColor={accentColor}
          />
        )}
      </View>

      {/* Animated Progress Bar (Hide if open ended) */}
      {!isOpenEnded && (
        <View style={{ backgroundColor: '#2C2C2E', width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
          <Animated.View
            style={{
              width: barWidth,
              height: '100%',
              backgroundColor: accentColor,
              borderRadius: 4,
            }}
          />
        </View>
      )}

      {/* Milestone Badges Row (Hide if open ended) */}
      {!isOpenEnded && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
        {milestones.map((m) => {
          const isUnlocked = unlocked.includes(m);
          const justNowUnlocked = justUnlockedSet.has(m);
          const dollars = getMilestoneDollars(goal.targetMinutes, m, goal.type || 'productive');
          return (
            <MilestoneBadge
              key={m}
              milestone={m}
              isUnlocked={isUnlocked}
              justUnlocked={justNowUnlocked}
              dollars={dollars}
              accentColor={accentColor}
            />
          );
        })}
        </View>
      )}

      {/* Header for Sub-Projects (shown if we have subgoals OR if we can add them) */}
      {(subGoals && subGoals.length > 0 || onAddSubGoal) && (
        <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#8E8E93', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Milestones & Quests</Text>
            {onAddSubGoal && (
              <Pressable
                onPress={() => onAddSubGoal(goal.id)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center' })}
              >
                <Ionicons name="add" size={14} color={accentColor} />
                <Text style={{ color: accentColor, fontSize: 12, fontWeight: '600', marginLeft: 2 }}>Add</Text>
              </Pressable>
            )}
          </View>
          
          {subGoals && subGoals.length === 0 && (
            <Text style={{ color: '#52525B', fontSize: 13, fontStyle: 'italic', marginBottom: 12 }}>No sub-projects yet.</Text>
          )}

          {subGoals && subGoals.map((subGoal) => {
            const subIsUnits = subGoal.metricType === 'units';
            const subTarget = subIsUnits ? (subGoal.targetMetric || 1) : subGoal.targetMinutes;
            const subCompleted = subIsUnits ? (subGoal.completedMetric || 0) : subGoal.completedMinutes;
            const subIsOpenEnded = subTarget === 0;
            const subPct = subIsOpenEnded ? 0 : Math.min(100, Math.round((subCompleted / subTarget) * 100));
            
            let subLabel = '';
            if (subIsOpenEnded) {
              subLabel = `${(subCompleted / 60).toFixed(1)}h`;
            } else if (subIsUnits) {
              subLabel = `${subCompleted}/${subTarget}`;
            } else if (isEntertainment) {
              subLabel = `${(subCompleted / 60).toFixed(1)}/${(subTarget / 60).toFixed(0)}h`;
            } else {
              subLabel = `${subCompleted}/${subTarget}m`;
            }

            return (
              <View key={subGoal.id} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                    <Text style={{ color: '#EBEBF5', fontSize: 13, fontWeight: '500', marginRight: 4 }}>↳</Text>
                    <InlineEditableText
                      initialValue={subGoal.title}
                      textStyle={{ color: '#EBEBF5', fontSize: 13, fontWeight: '500' }}
                      onSave={(newTitle) => updateMacroGoal(subGoal.id, { title: newTitle })}
                      numberOfLines={1}
                    />
                    <Pressable onPress={() => setEditingGoal(subGoal)} style={{ padding: 4 }}>
                      <Ionicons name="pencil" size={11} color="#8E8E93" />
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: '#8E8E93', fontSize: 12 }}>
                      {subLabel} {!subIsOpenEnded && `(${subPct}%)`}
                    </Text>
                    {onQuickStart && (
                      <Pressable 
                        onPress={() => onQuickStart(subGoal)}
                        style={({ pressed }) => ({
                          backgroundColor: pressed ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          justifyContent: 'center',
                          alignItems: 'center'
                        })}
                      >
                        <Ionicons name="play" size={12} color={accentColor} style={{ marginLeft: 2 }} />
                      </Pressable>
                    )}
                  </View>
                </View>
                {!subIsOpenEnded && (
                  <View style={{ backgroundColor: '#2C2C2E', width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ width: `${subPct}%`, height: '100%', backgroundColor: accentColor, opacity: 0.8, borderRadius: 2 }} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Quick Start Button (Only show if no subGoals) */}
      {onQuickStart && (!subGoals || subGoals.length === 0) && (
        <View style={{ marginTop: 16 }}>
          <Pressable
            onPress={() => onQuickStart(goal)}
            style={({ pressed, hovered }: any) => ({
              backgroundColor: hovered ? (isEntertainment ? '#47A3D1' : '#A442D6') : (isEntertainment ? '#5AC8FA' : '#BF5AF2'),
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: 'center',
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ color: isEntertainment ? '#000000' : '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
              {isEntertainment ? 'Indulge' : 'Focus'}
            </Text>
          </Pressable>
        </View>
      )}

      <EditMacroGoalModal
        goal={editingGoal}
        visible={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        onSave={(id, updates) => updateMacroGoal(id, updates)}
        onDelete={(id) => deleteMacroGoal(id)}
      />
    </View>
  );
}
