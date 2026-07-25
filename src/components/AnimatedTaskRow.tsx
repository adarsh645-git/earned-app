import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, Animated, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Task, Tag } from '../store/taskStore';
import CheckboxBurst, { CheckboxBurstHandle } from './CheckboxBurst';
import PillPicker from './PillPicker';
import EditableText from './EditableText';
import TimeSelectorModal from './TimeSelectorModal';
import { useCollectionStore } from '../store/collectionStore';
import { useSummitStore } from '../store/summitStore';
import { getEligibleJourneys } from './LinkProgressPicker';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { feedback } from '../utils/feedback';

// Completed rows settle at this opacity — a "transparent banner" rather than
// fully hidden, so the Completed Today group still reads at a glance.
const COMPLETED_OPACITY = 0.5;

// "9:41 AM" — null for legacy tasks whose dateCreated predates the switch
// from a date-only string to a full timestamp (nothing to show for those).
function formatCreatedTime(dateCreated: string): string | null {
  if (!dateCreated.includes('T')) return null;
  const d = new Date(dateCreated);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

type OpenPill = 'tag' | 'journey' | null;

interface AnimatedTaskRowProps {
  task: Task;
  tagName: string | undefined;
  /** Earner tasks accent green, burner tasks accent blue — mirrors the tag's economic type. */
  tagType?: 'earner' | 'burner';
  /** All non-archived tags — powers the row's Tag pill. */
  tags?: Tag[];
  /** Fixes a single field in place (Tag/Duration/Journey pills) without opening the full edit modal. */
  onUpdate?: (id: string, updates: Partial<Task>) => void;
  isLast: boolean;
  onToggle: (id: string) => void;
  onMoveToIcebox?: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onStartTimer?: (id: string, mins: number) => void;
  showStartButton?: boolean;
  showIceboxButton?: boolean;
}

export default function AnimatedTaskRow({
  task,
  tagName,
  tagType,
  tags = [],
  onUpdate,
  isLast,
  onToggle,
  onMoveToIcebox,
  onEdit,
  onDelete,
  onStartTimer,
  showStartButton = false,
  showIceboxButton = true,
}: AnimatedTaskRowProps) {
  const accent = tagType === 'burner' ? '#5AC8FA' : '#30D158';

  const { collections } = useCollectionStore();
  const { summits } = useSummitStore();
  const eligibleJourneys = onUpdate ? getEligibleJourneys(collections, summits, tagType === 'burner' ? 'burner' : 'earner') : [];
  const linkedJourney = task.collectionId ? collections.find(c => c.id === task.collectionId) : undefined;
  const createdTime = formatCreatedTime(task.dateCreated);

  const [openPill, setOpenPill] = useState<OpenPill>(null);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  const checkScale = useRef(new Animated.Value(1)).current;
  const checkmarkScale = useRef(new Animated.Value(task.completed ? 1 : 0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.6)).current;
  const rowOpacity = useRef(new Animated.Value(task.completed ? COMPLETED_OPACITY : 1)).current;
  const rowTranslateX = useRef(new Animated.Value(0)).current;
  const strikethrough = useRef(new Animated.Value(task.completed ? 1 : 0)).current;
  const burstRef = useRef<CheckboxBurstHandle>(null);

  const [localCompleted, setLocalCompleted] = useState(task.completed);

  // Sync local state if prop changes (e.g. un-checked from Completed list)
  useEffect(() => {
    setLocalCompleted(task.completed);
    if (!task.completed) {
      strikethrough.setValue(0);
      rowOpacity.setValue(1);
      rowTranslateX.setValue(0);
      checkmarkScale.setValue(0);
    } else {
      strikethrough.setValue(1);
      rowOpacity.setValue(COMPLETED_OPACITY);
      rowTranslateX.setValue(0);
      checkmarkScale.setValue(1);
    }
  }, [task.completed]);

  const handleToggle = useCallback(() => {
    if (task.completed) {
      // Un-completing: just toggle, LayoutAnimation handles the list change
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onToggle(task.id);
      return;
    }

    // Completing: trigger multi-layered animation
    feedback('taskComplete');
    burstRef.current?.fire(); // confetti burst radiating from the checkbox
    setLocalCompleted(true); // instantly show checkmark

    // 1. Checkbox spring bounce + glow ring pulse + checkmark pop + strikethrough
    Animated.parallel([
      Animated.sequence([
        Animated.spring(checkScale, { toValue: 1.5, useNativeDriver: true, speed: 80, bounciness: 16 }),
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }),
      ]),
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowOpacity, { toValue: 0.7, duration: 150, useNativeDriver: true }),
          Animated.timing(glowScale, { toValue: 2.0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.timing(glowOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.spring(checkmarkScale, { toValue: 1.3, useNativeDriver: true, speed: 90, bounciness: 14 }),
        Animated.spring(checkmarkScale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }),
      ]),
      Animated.timing(strikethrough, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // 2. After 600ms delay, fade the row down to a "transparent banner" in place
    setTimeout(() => {
      Animated.timing(rowOpacity, { toValue: COMPLETED_OPACITY, duration: 400, useNativeDriver: true }).start();

      // 3. Once faded, tell parent to move it into the Completed group
      setTimeout(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onToggle(task.id);
      }, 400);
    }, 600);
  }, [task.id, task.completed, onToggle, checkScale, checkmarkScale, glowOpacity, glowScale, rowOpacity, strikethrough]);

  // Reset glow after animation
  useEffect(() => {
    glowScale.setValue(0.6);
    glowOpacity.setValue(0);
  }, []);

  const isStrikethrough = localCompleted;

  return (
    <>
    <Animated.View
      style={{
        borderBottomWidth: isLast ? 0 : 0.5,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        opacity: rowOpacity,
        transform: [{ translateX: rowTranslateX }],
      }}
    >
      <Pressable className="flex-row items-stretch justify-between min-h-[72px] hover:bg-[#1F1F22]">
        <View className="flex-row items-center flex-1 py-4 pl-4 pr-2">
          {/* Checkbox with glow ring + confetti burst */}
          <Pressable onPress={handleToggle} style={{ position: 'relative' }}>
            {/* Accent glow ring (behind checkbox) */}
            <Animated.View
              style={{
                position: 'absolute',
                width: 24,
                height: 24,
                borderRadius: 7,
                backgroundColor: accent,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
                left: 0,
                top: 0,
              }}
              pointerEvents="none"
            />
            {/* Confetti burst, centered on the checkbox */}
            <CheckboxBurst ref={burstRef} color={accent} size={24} />
            {/* Checkbox — rounded square, TickTick-style */}
            <Animated.View
              style={[
                {
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  borderWidth: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  transform: [{ scale: checkScale }],
                },
                localCompleted
                  ? { backgroundColor: accent, borderColor: accent }
                  : { borderColor: '#8E8E93', backgroundColor: 'transparent' },
              ]}
            >
              {localCompleted && (
                <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
                  <Ionicons name="checkmark" size={14} color="white" />
                </Animated.View>
              )}
            </Animated.View>
          </Pressable>

          {/* Task Text + row pills */}
          <View className="flex-1">
            {onUpdate ? (
              <EditableText
                value={task.title}
                onSave={(title) => onUpdate(task.id, { title })}
                textStyle={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: isStrikethrough ? '#8E8E93' : '#FFFFFF',
                  textDecorationLine: isStrikethrough ? 'line-through' : 'none',
                }}
              />
            ) : (
              <Text
                className={`text-base font-semibold ${
                  isStrikethrough ? 'line-through text-[#8E8E93]' : 'text-white'
                }`}
              >
                {task.title}
              </Text>
            )}

            {onUpdate ? (
              <View className="flex-row items-center mt-1.5" style={{ flexWrap: 'wrap', gap: 6 }}>
                <PillPicker
                  label={tagName || 'Tag'}
                  options={tags.filter(t => !t.isArchived).map(t => ({ id: t.id, label: t.name }))}
                  selectedId={task.tagId}
                  onSelect={(id) => { feedback('select'); onUpdate(task.id, { tagId: id }); setOpenPill(null); }}
                  open={openPill === 'tag'}
                  onToggle={() => setOpenPill(p => (p === 'tag' ? null : 'tag'))}
                  accentColor={accent}
                />

                <Pressable
                  onPress={() => setShowDurationPicker(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#3A3A3C' }}
                >
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>
                    {task.estimatedMinutes}m
                  </Text>
                </Pressable>

                {eligibleJourneys.length > 0 && (
                  <PillPicker
                    label={linkedJourney ? linkedJourney.title : 'No Journey'}
                    options={[{ id: '', label: 'No Journey' }, ...eligibleJourneys.map(c => ({ id: c.id, label: c.title }))]}
                    selectedId={task.collectionId || ''}
                    onSelect={(id) => {
                      feedback('select');
                      const linked = eligibleJourneys.find(c => c.id === id);
                      onUpdate(task.id, { collectionId: id || undefined, summitId: linked?.summitId || undefined });
                      setOpenPill(null);
                    }}
                    open={openPill === 'journey'}
                    onToggle={() => setOpenPill(p => (p === 'journey' ? null : 'journey'))}
                    accentColor={accent}
                  />
                )}

                {createdTime && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#3A3A3C' }}>
                    <Ionicons name="time-outline" size={11} color="#8E8E93" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '600' }}>{createdTime}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View className="flex-row items-center mt-1 gap-1.5">
                <View style={{ backgroundColor: '#2C2C2E' }} className="px-2 py-0.5 rounded-full">
                  <Text className="text-[#8E8E93] text-[9px] font-bold uppercase tracking-wider">
                    {tagName}
                  </Text>
                </View>
                <Text className="text-[#8E8E93] text-xs font-medium">
                  {task.estimatedMinutes} mins
                </Text>
                {createdTime && (
                  <Text className="text-[#8E8E93] text-xs font-medium">
                    · {createdTime}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Actions - Shadcn-style ghost buttons */}
        <View className="flex-row items-stretch">
          {showStartButton && !localCompleted && onStartTimer && (
            <>
              <Pressable
                onPress={() => onStartTimer(task.id, task.estimatedMinutes)}
                className="px-3 justify-center items-center bg-transparent hover:bg-[#2C2C2E]"
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <Ionicons name="play" size={20} color="#BF5AF2" />
              </Pressable>
              {onEdit && <View className="self-center" style={{ width: 1, height: 16, backgroundColor: '#3A3A3C' }} />}
            </>
          )}

          {onEdit && (
            <>
              <Pressable
                onPress={() => onEdit(task)}
                className="px-3 justify-center items-center bg-transparent hover:bg-[#2C2C2E]"
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <Ionicons name="pencil" size={20} color="#8E8E93" />
              </Pressable>
              {showIceboxButton && onMoveToIcebox && <View className="self-center" style={{ width: 1, height: 16, backgroundColor: '#3A3A3C' }} />}
            </>
          )}

          {showIceboxButton && onMoveToIcebox && (
            <>
              <Pressable
                onPress={() => onMoveToIcebox(task.id)}
                className="px-3 justify-center items-center bg-transparent hover:bg-[#2C2C2E]"
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <Ionicons name="snow-outline" size={20} color="#8E8E93" />
              </Pressable>
              {onDelete && <View className="self-center" style={{ width: 1, height: 16, backgroundColor: '#3A3A3C' }} />}
            </>
          )}

          {onDelete && (
            <Pressable
              onPress={() => onDelete(task.id)}
              className="px-3 justify-center items-center bg-transparent hover:bg-[rgba(255,69,58,0.1)]"
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Ionicons name="trash-outline" size={20} color="#FF453A" />
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
    {onUpdate && (
      <TimeSelectorModal
        visible={showDurationPicker}
        initialMinutes={task.estimatedMinutes}
        title="Estimate Duration"
        onClose={() => setShowDurationPicker(false)}
        onConfirm={(mins) => {
          onUpdate(task.id, { estimatedMinutes: mins });
          setShowDurationPicker(false);
        }}
      />
    )}
    </>
  );
}
