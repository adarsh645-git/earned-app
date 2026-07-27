import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, Animated, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Task, Tag } from '../store/taskStore';
import CheckboxBurst, { CheckboxBurstHandle } from './CheckboxBurst';
import PillPicker from './PillPicker';
import EditableText from './EditableText';
import TimeSelectorModal from './TimeSelectorModal';
import { useCollectionStore } from '../store/collectionStore';
import { useGoalStore } from '../store/goalStore';
import { getEligibleJourneys } from './LinkProgressPicker';
import useIsMobile from '../hooks/useIsMobile';

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
  /** Stable per-Pillar color (see src/utils/pillarColor.ts) — rendered as a
   * left-edge accent bar, structurally separate from the checkbox's
   * earner/burner accent so the two signals never compete. */
  pillarColor?: string;
  /** Fixes a single field in place (Tag/Duration/Journey pills) without opening the full edit modal. */
  onUpdate?: (id: string, updates: Partial<Task>) => void;
  isLast: boolean;
  onToggle: (id: string) => void;
  onEdit?: (task: Task) => void;
  onStartTimer?: (id: string, mins: number) => void;
  showStartButton?: boolean;
  subtaskCount?: number;
  completedSubtaskCount?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  /** Rendered at the start of the left cluster, before the checkbox — used
   * for the drag-reorder grip so its gesture claims the touch before the
   * row's own onPress (toggle-expand) or any other tap target reacts. */
  leadingAccessory?: React.ReactNode;
  /** 'subtask' renders a quieter, more compact row — smaller checkbox/title/
   * icons, plain-text metadata instead of pill-chips, no confetti/glow on
   * completion — so a parent's children don't compete visually with
   * top-level tasks. Purely cosmetic; behavior/props are unchanged. */
  variant?: 'default' | 'subtask';
}

export default function AnimatedTaskRow({
  task,
  tagName,
  tagType,
  tags = [],
  pillarColor,
  onUpdate,
  isLast,
  onToggle,
  onEdit,
  onStartTimer,
  showStartButton = false,
  subtaskCount = 0,
  completedSubtaskCount = 0,
  isExpanded = false,
  onToggleExpand,
  leadingAccessory,
  variant = 'default',
}: AnimatedTaskRowProps) {
  const accent = tagType === 'burner' ? '#5AC8FA' : '#30D158';
  const isSubtask = variant === 'subtask';
  const isMobile = useIsMobile();

  // Derived sizes — a subtask row is the same component, just quieter and
  // more compact, so top-level tasks (the default) are pixel-identical to
  // before.
  const CHECKBOX_SIZE = isSubtask ? 18 : 24;
  const CHECKBOX_RADIUS = isSubtask ? 6 : 7;
  const TITLE_FONT_SIZE = isSubtask ? 13 : 16;
  const TITLE_FONT_WEIGHT = isSubtask ? ('500' as const) : ('600' as const);
  const ROW_PADDING_V = isSubtask ? 8 : 16;
  const ACTION_ICON_SIZE = isSubtask ? 15 : 20;
  // A *static* Tailwind class, not a computed style prop — `paddingHorizontal`
  // passed through Pressable's function-style prop silently doesn't apply in
  // this codebase's NativeWind/RNW setup (confirmed via computed style: it
  // measured 0px regardless of value), which is what actually caused the
  // cramped look, for top-level rows too, not just subtasks. The original
  // `px-3` className (before this row grew a `variant` prop) is restored
  // here; subtasks get slightly more to offset their smaller icon glyph.
  const ACTION_PADDING_CLASS = isSubtask ? 'px-[15px]' : 'px-3';
  const ACTION_DIVIDER_HEIGHT = isSubtask ? 14 : 16;

  const { collections } = useCollectionStore();
  const { goals } = useGoalStore();
  const eligibleJourneys = onUpdate ? getEligibleJourneys(collections, goals, tagType === 'burner' ? 'burner' : 'earner') : [];
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

    // Completing: trigger multi-layered animation. Subtask rows keep the
    // satisfying checkbox bounce + checkmark pop + strikethrough, but skip
    // the confetti burst and glow-ring pulse — that celebration is reserved
    // for the parent's own auto-complete, so checking off several subtasks
    // in a row doesn't fire off a burst of fireworks.
    feedback('taskComplete');
    if (!isSubtask) burstRef.current?.fire(); // confetti burst radiating from the checkbox
    setLocalCompleted(true); // instantly show checkmark

    // 1. Checkbox spring bounce + glow ring pulse + checkmark pop + strikethrough
    Animated.parallel([
      Animated.sequence([
        Animated.spring(checkScale, { toValue: 1.5, useNativeDriver: true, speed: 80, bounciness: 16 }),
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }),
      ]),
      ...(isSubtask ? [] : [
        Animated.sequence([
          Animated.parallel([
            Animated.timing(glowOpacity, { toValue: 0.7, duration: 150, useNativeDriver: true }),
            Animated.timing(glowScale, { toValue: 2.0, duration: 300, useNativeDriver: true }),
          ]),
          Animated.timing(glowOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
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
        borderLeftWidth: 3,
        borderLeftColor: pillarColor ?? 'transparent',
        opacity: rowOpacity,
        transform: [{ translateX: rowTranslateX }],
      }}
    >
      <Pressable
        onPress={() => onEdit?.(task)}
        className="flex-row items-stretch justify-between hover:bg-[#1F1F22]"
        style={{ minHeight: isSubtask ? 44 : 72 }}
      >
        <View className="flex-row items-center flex-1" style={{ paddingVertical: ROW_PADDING_V, paddingLeft: isMobile ? 10 : 16, paddingRight: isMobile ? 4 : 8 }}>
          {leadingAccessory}
          {/* Checkbox with glow ring + confetti burst */}
          <Pressable onPress={subtaskCount > 0 ? undefined : handleToggle} style={{ position: 'relative' }}>
            {/* Accent glow ring (behind checkbox) — subtask rows never fire it (see handleToggle) */}
            <Animated.View
              style={{
                position: 'absolute',
                width: CHECKBOX_SIZE,
                height: CHECKBOX_SIZE,
                borderRadius: CHECKBOX_RADIUS,
                backgroundColor: accent,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
                left: 0,
                top: 0,
              }}
              pointerEvents="none"
            />
            {/* Confetti burst, centered on the checkbox — subtask rows never fire it */}
            <CheckboxBurst ref={burstRef} color={accent} size={CHECKBOX_SIZE} />
            {/* Checkbox — rounded square, TickTick-style */}
            <Animated.View
              style={[
                {
                  width: CHECKBOX_SIZE,
                  height: CHECKBOX_SIZE,
                  borderRadius: CHECKBOX_RADIUS,
                  borderWidth: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: isSubtask ? 8 : (isMobile ? 8 : 12),
                  transform: [{ scale: checkScale }],
                },
                localCompleted
                  ? { backgroundColor: accent, borderColor: accent }
                  : { borderColor: '#8E8E93', backgroundColor: 'transparent' },
              ]}
            >
              {localCompleted && (
                <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
                  <Ionicons name="checkmark" size={isSubtask ? 11 : 14} color="white" />
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
                  fontSize: TITLE_FONT_SIZE,
                  fontWeight: TITLE_FONT_WEIGHT,
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

            {onUpdate && isSubtask ? (
              // Quiet, chrome-free metadata line — just "Tag · Xm", still
              // tappable to edit (same pickers), no Journey/created-time
              // pills. The single biggest de-cluttering move for subtasks.
              <View className="flex-row items-center mt-1" style={{ flexWrap: 'wrap', gap: 4 }}>
                <PillPicker
                  variant="plain"
                  label={tagName || 'Tag'}
                  options={tags.filter(t => !t.isArchived).map(t => ({ id: t.id, label: t.name }))}
                  selectedId={task.tagId}
                  onSelect={(id) => { feedback('select'); onUpdate(task.id, { tagId: id }); setOpenPill(null); }}
                  open={openPill === 'tag'}
                  onToggle={() => setOpenPill(p => (p === 'tag' ? null : 'tag'))}
                  accentColor={accent}
                />
                <Text style={{ color: '#5C5C5E', fontSize: 12 }}>·</Text>
                <Pressable onPress={() => setShowDurationPicker(true)} hitSlop={6}>
                  <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '600' }}>
                    {task.estimatedMinutes}m
                  </Text>
                </Pressable>
              </View>
            ) : onUpdate && !isMobile ? (
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
                      onUpdate(task.id, { collectionId: id || undefined, goalId: linked?.goalId || undefined });
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
            ) : onUpdate ? (
              // Mobile: no interactive pills — a quiet, non-interactive caption
              // (same style as the subtask metadata line above) so the row stays
              // scannable without chip clutter. Tag/Duration/Journey/time are one
              // tap away in the Task Detail screen instead.
              <View className="flex-row items-center mt-1" style={{ flexWrap: 'wrap', gap: 4 }}>
                <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '600' }}>{tagName || 'Tag'}</Text>
                <Text style={{ color: '#5C5C5E', fontSize: 12 }}>·</Text>
                <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '600' }}>{task.estimatedMinutes}m</Text>
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
                {subtaskCount > 0 && (
                  <View style={{ backgroundColor: 'transparent', borderWidth: 1, borderColor: '#3A3A3C' }} className="px-2 py-0.5 rounded-full ml-1">
                    <Text className="text-[#8E8E93] text-[9px] font-bold uppercase tracking-wider">
                      {completedSubtaskCount}/{subtaskCount} Subtasks
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Actions - Shadcn-style ghost buttons. Built as an array + map (rather
            than each button conditionally rendering the *next* button's
            divider) so the separators are always correct regardless of which
            combination of actions is present. Icebox and Delete live in
            SwipeableRow now (swipe-reveal + right-click), not here. */}
        <View className="flex-row items-stretch">
          {([
            showStartButton && !localCompleted && onStartTimer ? {
              key: 'start',
              icon: 'play',
              color: '#BF5AF2',
              hoverClass: 'hover:bg-[#2C2C2E]',
              onPress: () => onStartTimer(task.id, task.estimatedMinutes),
            } : null,
            // Edit (pencil) and Add-subtask (+) buttons were retired — tapping
            // the row itself opens the Task Detail screen, which now owns
            // both editing and subtask creation. Icebox and Delete moved to
            // SwipeableRow (swipe-reveal + right-click) — see the wrapping
            // component at the call sites in TasksScreen.tsx.
            subtaskCount > 0 && onToggleExpand ? {
              key: 'expand',
              icon: isExpanded ? 'chevron-up' : 'chevron-down',
              color: '#8E8E93',
              hoverClass: 'hover:bg-[#2C2C2E]',
              onPress: onToggleExpand,
            } : null,
          ] as Array<{ key: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; hoverClass: string; onPress: () => void } | null>)
            .filter((btn): btn is NonNullable<typeof btn> => btn !== null)
            .map((btn, i) => (
              <React.Fragment key={btn.key}>
                {i > 0 && <View className="self-center" style={{ width: 1, height: ACTION_DIVIDER_HEIGHT, backgroundColor: '#3A3A3C' }} />}
                <Pressable
                  onPress={btn.onPress}
                  className={`${ACTION_PADDING_CLASS} justify-center items-center bg-transparent ${btn.hoverClass}`}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                >
                  <Ionicons name={btn.icon} size={ACTION_ICON_SIZE} color={btn.color} />
                </Pressable>
              </React.Fragment>
            ))}
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
