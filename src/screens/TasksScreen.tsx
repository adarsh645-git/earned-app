import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTaskStore, Task, sortKey } from '../store/taskStore';
import { feedback } from '../utils/feedback';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Shared section-card look (Today's Focus / Completed Today / Icebox) — a
// consistent border + subtle depth so the three groups read as one system.
const CARD_STYLE = {
  backgroundColor: '#1C1C1E',
  borderColor: 'rgba(255,255,255,0.08)',
  borderWidth: 1,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 12,
  elevation: 3,
} as const;
import { useGoalStore, getChainTrail } from '../store/goalStore';
import { useCollectionStore } from '../store/collectionStore';
import { useEconomyStore } from '../store/economyStore';
import { useTimerStore } from '../store/timerStore';
import RewardToast from '../components/RewardToast';
import AnimatedTaskRow from '../components/AnimatedTaskRow';
import SwipeableRow from '../components/SwipeableRow';
import ReorderableTaskGroup from '../components/ReorderableTaskGroup';
import TaskDetailModal from '../components/TaskDetailModal';
import TimeSelectorModal from '../components/TimeSelectorModal';
import ConfirmModal from '../components/ConfirmModal';
import ProgressPromptModal from '../components/ProgressPromptModal';
import QuickAddBar from '../components/QuickAddBar';
import WeeklyReviewSheet from '../components/WeeklyReviewSheet';
import PillPicker from '../components/PillPicker';
import { getEligibleJourneys } from '../components/LinkProgressPicker';
import { getPillarColor } from '../utils/pillarColor';
import { getRequiredUnitLabel } from '../utils/taskCompletionGate';
import { resolveWaypointUnit } from '../utils/waypointUnit';
import { localDateKey, parseLocalDateKey, yesterdayDateKey, localDayKeyFromTimestamp } from '../utils/date';
import useIsMobile from '../hooks/useIsMobile';

// "Today's Focus List — Friday, July 25" / "Yesterday" / "Wed, Jul 23"
function formatDateLabel(dateStr: string, isToday: boolean): string {
  const d = parseLocalDateKey(dateStr);
  if (isToday) {
    return `Today's Focus List — ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
  }
  if (dateStr === yesterdayDateKey()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function TasksScreen() {
  const { tasks, tags, pillars, lastUsedTagId, addTask, updateTask, deleteTask, toggleTask, moveToIcebox, activateFromIcebox, reorderTasks } = useTaskStore();
  const { goals } = useGoalStore();
  const { collections, waypoints, addCollection } = useCollectionStore();
  const { startTimer } = useTimerStore();
  const { isWeeklyReviewDue, completeWeeklyReview } = useEconomyStore();
  const [reviewSheetVisible, setReviewSheetVisible] = useState(false);
  const isMobile = useIsMobile();

  // Quick-add bar state — title + the one economy-critical field (Duration)
  // that stays visible in the bar itself; everything else (Tag, Journey)
  // defaults silently (see taskStore.addTask) and becomes a row pill after —
  // unless the chevron is expanded, in which case they can be set here too.
  const [title, setTitle] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(25);
  const [showAddTimeSelector, setShowAddTimeSelector] = useState(false);
  const [blockedModal, setBlockedModal] = useState<{ title: string; message: string } | null>(null);

  // Chevron-expand draft state for the quick-add bar. Empty/false means "let
  // the store apply its normal default" — only an explicit pick overrides it.
  const [quickAddExpanded, setQuickAddExpanded] = useState(false);
  const [quickAddOpenPill, setQuickAddOpenPill] = useState<'pillar' | 'tag' | 'journey' | 'waypoint' | null>(null);
  const [quickAddPillarId, setQuickAddPillarId] = useState('');
  const [quickAddTagId, setQuickAddTagId] = useState('');
  const [quickAddCollectionId, setQuickAddCollectionId] = useState('');
  const [quickAddGoalId, setQuickAddGoalId] = useState('');
  const [quickAddWaypointId, setQuickAddWaypointId] = useState('');
  const [quickAddIsIcebox, setQuickAddIsIcebox] = useState(false);
  // Explicit "leave untagged" capture — bypasses the last-used-tag default
  // entirely so the task lands in the Inbox instead. See
  // docs/sdd/026-gtd-inbox-clarify-review.md.
  const [quickAddSkipTag, setQuickAddSkipTag] = useState(false);

  // Blocks completing a Waypoint-linked task until its progress quantity is
  // entered — see src/utils/taskCompletionGate.ts.
  const [progressPrompt, setProgressPrompt] = useState<{ taskId: string; unitLabel: string; taskTitle: string } | null>(null);

  const activePillars = pillars.filter(p => !p.isArchived);
  // Which Pillar the Category dropdown is currently scoped to — an explicit
  // pick wins, otherwise fall back to the last-used tag's pillar (continuity
  // with the pre-existing "Tag (last used)" default) or the first Pillar.
  const currentPillarId = quickAddPillarId
    || tags.find(t => t.id === lastUsedTagId)?.pillarId
    || activePillars[0]?.id
    || '';

  const quickAddTagType: 'earner' | 'burner' = quickAddTagId
    ? (tags.find(t => t.id === quickAddTagId)?.type ?? 'earner')
    : 'earner';
  const quickAddEligibleJourneys = getEligibleJourneys(collections, goals, quickAddTagType);
  const quickAddEligibleWaypoints = quickAddCollectionId
    ? waypoints.filter(w => w.collectionId === quickAddCollectionId)
    : [];

  // Checked synchronously by AnimatedTaskRow before it plays the optimistic
  // completion animation — false skips the animation so a blocked
  // completion (handleToggle opens ProgressPromptModal instead) never shows
  // a false "done" state.
  const canCompleteTask = (task: Task) => !getRequiredUnitLabel(task, waypoints, collections, goals);

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

  // Reward toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSubtext, setToastSubtext] = useState('');
  const [toastChainTrail, setToastChainTrail] = useState<string[]>([]);
  const [toastTone, setToastTone] = useState<'earner' | 'burner'>('earner');

  // Show a reward toast when completing a task (was previously silent)
  const completeToggle = (id: string) => {
    const task = tasks.find(t => t.id === id);
    const tag = task ? tags.find(t => t.id === task.tagId) : null;
    if (task && !task.completed && tag) {
      setToastTone(tag.type);
      if (tag.type === 'earner') {
        const conversion = useEconomyStore.getState().getConversionRate();
        const hoursEarned = Math.round(task.estimatedMinutes * conversion.multiplier);
        setToastMessage(`+${(hoursEarned / 60).toFixed(1)}h entertainment earned`);
        setToastSubtext(`Focused ${task.estimatedMinutes}m on "${task.title}"`);
      } else {
        setToastMessage(`-${(task.estimatedMinutes / 60).toFixed(1)}h leisure spent`);
        setToastSubtext(`Enjoyed "${task.title}" guilt-free`);
      }
      setToastChainTrail(task.goalId ? getChainTrail(goals, task.goalId) : []);
      setToastVisible(true);
    }
    toggleTask(id);
  };

  // Gate: a task linked to a Waypoint with an enforced unit can't be
  // completed until its quantity is entered — opens ProgressPromptModal
  // instead of completing immediately. Un-completing is never gated.
  const handleToggle = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task && !task.completed) {
      const requiredUnit = getRequiredUnitLabel(task, waypoints, collections, goals);
      if (requiredUnit) {
        setProgressPrompt({ taskId: id, unitLabel: requiredUnit, taskTitle: task.title });
        return;
      }
    }
    completeToggle(id);
  };

  const handleMoveToIcebox = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    feedback('select');
    moveToIcebox(id);
  };

  const handleActivate = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    feedback('select');
    activateFromIcebox(id);
  };

  // Clarify decision: "this is actually a project, not a single next
  // action." Bare title-only Journey — everything else gets configured
  // later from the Journey itself, not asked for here. The original Inbox
  // task is discarded, not kept as the Journey's first Task. See
  // docs/sdd/026-gtd-inbox-clarify-review.md.
  const handleConvertToJourney = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    feedback('select');
    addCollection({ title: task.title });
    deleteTask(id);
  };

  // Modals state — id-based (not a snapshot) so the detail screen reflects
  // live edits (tag/duration/journey autosave) while it's still open.
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const detailTask = tasks.find(t => t.id === detailTaskId) || null;

  const iceboxTasks = tasks.filter(t => t.isIcebox);

  // Untagged top-level tasks are sitting in the Inbox (GTD Capture, not yet
  // Clarified) — not yet a trusted next action, so they're excluded from
  // Today's Focus List below and surfaced only in their own section. See
  // docs/sdd/026-gtd-inbox-clarify-review.md.
  const inboxTasks = tasks.filter(t => !t.tagId && !t.isIcebox && !t.parentId);

  // Bundle non-icebox, tagged tasks by the day they were created — today's
  // group is expanded by default, every other day collapses, and only the 5
  // most recent distinct days are shown at all (older tasks simply don't
  // render).
  const todayStr = localDateKey();

  const tasksByDate: Record<string, Task[]> = {};
  tasks.filter(t => !t.isIcebox && !t.parentId && t.tagId).forEach(t => {
    // dateCreated is a full UTC-instant timestamp (for the time-of-day pill
    // below); grouping keys off the device's LOCAL calendar date, not the
    // UTC one — otherwise tasks jump into "yesterday" every evening once
    // UTC's date rolls ahead of the local one (see utils/date.ts).
    const dateKey = localDayKeyFromTimestamp(t.dateCreated);
    (tasksByDate[dateKey] ||= []).push(t);
  });
  // Active tasks sort by the manual reorder key (default = creation time,
  // via sortKey's fallback); completed tasks stay in their existing natural
  // order, pinned below — they're never draggable, so nothing re-sorts them.
  Object.keys(tasksByDate).forEach(date => {
    const list = tasksByDate[date];
    const active = list.filter(t => !t.completed).sort((a, b) => sortKey(a) - sortKey(b));
    const completed = list.filter(t => t.completed);
    tasksByDate[date] = [...active, ...completed];
  });

  const distinctDates = Object.keys(tasksByDate).sort((a, b) => b.localeCompare(a)); // desc; lexicographic = chronological for YYYY-MM-DD
  const datesToShow = [todayStr, ...distinctDates.filter(d => d !== todayStr)].slice(0, 5);

  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const isDateExpanded = (date: string) =>
    date === todayStr ? (expandedDates[date] ?? true) : !!expandedDates[date];
  const toggleDate = (date: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    feedback('expand');
    setExpandedDates(prev => ({ ...prev, [date]: !isDateExpanded(date) }));
  };

  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const toggleParentExpanded = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    feedback('expand');
    setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // The add-subtask bar is always present under an expanded parent (not
  // gated behind a separate "start adding" tap), so its draft text is keyed
  // per-parent — several could be expanded at once, and a single shared
  // string would leak one parent's draft into another's input.
  const [subtaskTitleByParent, setSubtaskTitleByParent] = useState<Record<string, string>>({});

  // Which day's card currently has a live drag — disables outer scroll for
  // the duration and lets that card's overflow go visible so the lifted
  // row's shadow isn't clipped by the card's rounded-corner clipping.
  const [draggingDate, setDraggingDate] = useState<string | null>(null);

  const toggleQuickAddExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setQuickAddExpanded(prev => !prev);
    setQuickAddOpenPill(null);
  };

  // Quick-add: title + Duration always; Tag/Journey/Icebox default silently
  // unless the chevron was expanded and one was explicitly picked — either
  // way, anything left unset can still be fixed via the row pills afterward.
  const handleQuickAdd = () => {
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      estimatedMinutes,
      tagId: quickAddTagId || undefined,
      skipTag: quickAddSkipTag,
      collectionId: quickAddCollectionId || undefined,
      goalId: quickAddGoalId || undefined,
      waypointId: quickAddWaypointId || undefined,
      isIcebox: quickAddIsIcebox,
    });

    feedback('taskComplete');
    setTitle('');
    setQuickAddPillarId('');
    setQuickAddTagId('');
    setQuickAddCollectionId('');
    setQuickAddGoalId('');
    setQuickAddWaypointId('');
    setQuickAddIsIcebox(false);
    setQuickAddSkipTag(false);
    setQuickAddOpenPill(null);
    // Duration is intentionally NOT reset — the next quick-add inherits it,
    // matching the "remember" spirit of the Tag default.
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <RewardToast
        visible={toastVisible}
        message={toastMessage}
        subtext={toastSubtext}
        chainTrail={toastChainTrail}
        tone={toastTone}
        onDismiss={() => setToastVisible(false)}
      />

      <View style={{ maxWidth: 900, width: '100%', alignSelf: 'center' }} className="flex-1 px-5">
        
        {/* Header */}
        <View className="flex-row items-center justify-between mt-3 mb-4">
          <Text className="text-white text-3xl font-extrabold tracking-tight">Manage Focus</Text>
          <Pressable
            onPress={() => setReviewSheetVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isWeeklyReviewDue() ? 'rgba(90,200,250,0.2)' : '#1C1C1E',
              borderWidth: 1,
              borderColor: isWeeklyReviewDue() ? 'rgba(90,200,250,0.4)' : 'rgba(255,255,255,0.08)',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
            }}
          >
            <Ionicons name="refresh-circle-outline" size={14} color={isWeeklyReviewDue() ? '#5AC8FA' : '#8E8E93'} style={{ marginRight: 4 }} />
            <Text style={{ color: isWeeklyReviewDue() ? '#5AC8FA' : '#8E8E93', fontSize: 12, fontWeight: '700' }}>
              Review
            </Text>
          </Pressable>
        </View>

        {/* Quick-add — title + Enter to save; Duration is the one field that
            stays visible here (it scales the Hours payout). Tag/Journey
            default silently and become row pills below. */}
        <View className="mb-5">
          <QuickAddBar
            placeholder="Add a task..."
            value={title}
            onChangeText={setTitle}
            onSubmit={handleQuickAdd}
            trailingAccessory={
              <Pressable
                onPress={() => setShowAddTimeSelector(true)}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2E', paddingHorizontal: isMobile ? 8 : 10, paddingVertical: isMobile ? 4 : 6, borderRadius: 8, marginLeft: isMobile ? 4 : 8 }}
              >
                <Ionicons name="time-outline" size={isMobile ? 12 : 14} color="#A1A1AA" style={{ marginRight: isMobile ? 2 : 4 }} />
                <Text style={{ color: '#FFF', fontSize: isMobile ? 11 : 12, fontWeight: '600' }}>
                  {estimatedMinutes}m
                </Text>
              </Pressable>
            }
            expandable={{
              open: quickAddExpanded,
              onToggle: toggleQuickAddExpanded,
              content: (
                <View className="flex-row items-center" style={{ flexWrap: 'wrap', gap: 6 }}>
                  <PillPicker
                    label={activePillars.find(p => p.id === currentPillarId)?.name || 'Pillar'}
                    options={activePillars.map(p => ({ id: p.id, label: p.name }))}
                    selectedId={currentPillarId}
                    onSelect={(id) => {
                      feedback('select');
                      setQuickAddPillarId(id);
                      // Category must always resolve to a valid tag — jump to
                      // the newly-picked Pillar's first Category immediately.
                      const pillarTags = tags.filter(t => t.pillarId === id && !t.isArchived);
                      setQuickAddTagId(pillarTags[0]?.id || '');
                      setQuickAddOpenPill(null);
                      // An explicit Pillar pick is a Clarify decision — skip
                      // tagging (raw Inbox capture) and this are mutually
                      // exclusive, so picking one clears the other.
                      setQuickAddSkipTag(false);
                    }}
                    open={quickAddOpenPill === 'pillar'}
                    onToggle={() => setQuickAddOpenPill(p => (p === 'pillar' ? null : 'pillar'))}
                  />

                  <PillPicker
                    label={quickAddTagId ? (tags.find(t => t.id === quickAddTagId)?.name || 'Tag') : 'Tag (last used)'}
                    options={tags.filter(t => t.pillarId === currentPillarId && !t.isArchived).map(t => ({ id: t.id, label: t.name }))}
                    selectedId={quickAddTagId}
                    onSelect={(id) => { feedback('select'); setQuickAddTagId(id); setQuickAddOpenPill(null); setQuickAddSkipTag(false); }}
                    open={quickAddOpenPill === 'tag'}
                    onToggle={() => setQuickAddOpenPill(p => (p === 'tag' ? null : 'tag'))}
                  />

                  {quickAddEligibleJourneys.length > 0 && (
                    <PillPicker
                      label={quickAddCollectionId ? (quickAddEligibleJourneys.find(c => c.id === quickAddCollectionId)?.title || 'Journey') : 'No Journey'}
                      options={[{ id: '', label: 'No Journey' }, ...quickAddEligibleJourneys.map(c => ({ id: c.id, label: c.title }))]}
                      selectedId={quickAddCollectionId}
                      onSelect={(id) => {
                        feedback('select');
                        const linked = quickAddEligibleJourneys.find(c => c.id === id);
                        setQuickAddCollectionId(id);
                        setQuickAddGoalId(linked?.goalId || '');
                        // Waypoint belongs to the old Journey — clear it too.
                        setQuickAddWaypointId('');
                        setQuickAddOpenPill(null);
                        setQuickAddSkipTag(false);
                      }}
                      open={quickAddOpenPill === 'journey'}
                      onToggle={() => setQuickAddOpenPill(p => (p === 'journey' ? null : 'journey'))}
                    />
                  )}

                  {quickAddEligibleWaypoints.length > 0 && (
                    <PillPicker
                      label={quickAddWaypointId ? (quickAddEligibleWaypoints.find(w => w.id === quickAddWaypointId)?.title || 'Waypoint') : 'No Waypoint'}
                      options={[{ id: '', label: 'No Waypoint' }, ...quickAddEligibleWaypoints.map(w => ({ id: w.id, label: w.title }))]}
                      selectedId={quickAddWaypointId}
                      onSelect={(id) => { feedback('select'); setQuickAddWaypointId(id); setQuickAddOpenPill(null); setQuickAddSkipTag(false); }}
                      open={quickAddOpenPill === 'waypoint'}
                      onToggle={() => setQuickAddOpenPill(p => (p === 'waypoint' ? null : 'waypoint'))}
                      accentColor="#5AC8FA"
                    />
                  )}

                  {quickAddWaypointId && (() => {
                    const wp = quickAddEligibleWaypoints.find(w => w.id === quickAddWaypointId);
                    const collection = collections.find(c => c.id === quickAddCollectionId);
                    const unit = resolveWaypointUnit(wp, collection, goals);
                    return unit ? (
                      <Text style={{ color: '#5AC8FA', fontSize: 11, fontWeight: '600' }}>
                        Tracks in {unit.toLowerCase()} — you'll be asked for a quantity when you complete it
                      </Text>
                    ) : null;
                  })()}

                  <Pressable
                    onPress={() => setQuickAddIsIcebox(v => !v)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: quickAddIsIcebox ? 'rgba(191,90,242,0.2)' : '#2C2C2E',
                      borderWidth: 1,
                      borderColor: quickAddIsIcebox ? 'rgba(191,90,242,0.4)' : '#3A3A3C',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                    }}
                  >
                    <Ionicons name="snow-outline" size={13} color={quickAddIsIcebox ? '#BF5AF2' : '#8E8E93'} style={{ marginRight: 4 }} />
                    <Text style={{ color: quickAddIsIcebox ? '#BF5AF2' : '#FFF', fontSize: 12, fontWeight: '600' }}>
                      Icebox
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      const turningOn = !quickAddSkipTag;
                      setQuickAddSkipTag(turningOn);
                      if (turningOn) {
                        // Skip tagging (raw Inbox capture) and an explicit
                        // Pillar/Category/Journey/Waypoint pick are mutually
                        // exclusive — turning this on clears any of those,
                        // instead of silently leaving both "set" at once.
                        setQuickAddPillarId('');
                        setQuickAddTagId('');
                        setQuickAddCollectionId('');
                        setQuickAddGoalId('');
                        setQuickAddWaypointId('');
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: quickAddSkipTag ? 'rgba(90,200,250,0.2)' : '#2C2C2E',
                      borderWidth: 1,
                      borderColor: quickAddSkipTag ? 'rgba(90,200,250,0.4)' : '#3A3A3C',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                    }}
                  >
                    <Ionicons name="mail-outline" size={13} color={quickAddSkipTag ? '#5AC8FA' : '#8E8E93'} style={{ marginRight: 4 }} />
                    <Text style={{ color: quickAddSkipTag ? '#5AC8FA' : '#FFF', fontSize: 12, fontWeight: '600' }}>
                      Inbox (skip tagging)
                    </Text>
                  </Pressable>
                </View>
              ),
            }}
          />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="flex-1" scrollEnabled={!draggingDate}>

          {/* Tasks bundled by day — today expanded, older days collapsed,
              capped to the 5 most recent distinct days */}
          {datesToShow.map(date => {
            const dateTasks = tasksByDate[date] || [];
            const isToday = date === todayStr;
            const expanded = isDateExpanded(date);
            return (
              <View key={date} className="mb-5">
                <Pressable
                  onPress={() => toggleDate(date)}
                  className="flex-row items-center mb-3"
                >
                  <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px]" style={{ flex: 1 }}>
                    {formatDateLabel(date, isToday)}{dateTasks.length > 0 ? ` (${dateTasks.length})` : ''}
                  </Text>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#8E8E93" />
                </Pressable>

                {expanded && (
                  dateTasks.length === 0 ? (
                    <View style={CARD_STYLE} className="rounded-2xl p-6 items-center justify-center">
                      <Ionicons name="checkmark-done-circle-outline" size={28} color="#3A3A3C" style={{ marginBottom: 8 }} />
                      <Text className="text-white font-semibold text-center">Your focus list is clear.</Text>
                      <Text className="text-[#8E8E93] text-xs text-center mt-1">Type above and press Enter to schedule a focus session.</Text>
                    </View>
                  ) : (
                    <View
                      style={{ ...CARD_STYLE, overflow: draggingDate === date ? 'visible' : 'hidden' } as any}
                      className="rounded-2xl"
                    >
                      <ReorderableTaskGroup
                        tasks={dateTasks}
                        activeCount={dateTasks.filter(t => !t.completed).length}
                        onReorder={reorderTasks}
                        onDragActiveChange={(dragging) => setDraggingDate(dragging ? date : null)}
                        renderRow={(task, { dragAccessory }) => {
                          const tag = tags.find(t => t.id === task.tagId);
                          const isLast = task.id === dateTasks[dateTasks.length - 1]?.id;

                          // Exclude iceboxed subtasks — they're deferred and render
                          // flat in the Icebox section instead, avoiding a double-render.
                          const rawSubtasks = tasks.filter(t => t.parentId === task.id && !t.isIcebox);
                          // Same split-sort convention as the day groups: active
                          // subtasks order by the manual reorder key, completed
                          // ones stay pinned below in natural order.
                          const activeSubtasks = rawSubtasks.filter(t => !t.completed).sort((a, b) => sortKey(a) - sortKey(b));
                          const completedSubtasks = rawSubtasks.filter(t => t.completed);
                          const subtasks = [...activeSubtasks, ...completedSubtasks];
                          const isExpanded = expandedParents[task.id];

                          return (
                            <View key={task.id} style={{ borderBottomWidth: (isLast && !isExpanded) ? 0 : 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                              <SwipeableRow
                                taskId={task.id}
                                onMoveToIcebox={handleMoveToIcebox}
                                onDelete={deleteTask}
                                showIceboxButton={!task.completed}
                              >
                                <AnimatedTaskRow
                                  task={task}
                                  tagName={tag?.name}
                                  tagType={tag?.type}
                                  tags={tags}
                                  pillarColor={getPillarColor(tag?.pillarId, pillars)}
                                  onUpdate={updateTask}
                                  isLast={true} // Handle bottom border in the wrapper View
                                  onToggle={handleToggle}
                                  canComplete={canCompleteTask}
                                  onEdit={(t) => setDetailTaskId(t.id)}
                                  onStartTimer={task.completed ? undefined : handleStartTimer}
                                  showStartButton={!task.completed}
                                  subtaskCount={subtasks.length}
                                  completedSubtaskCount={completedSubtasks.length}
                                  isExpanded={isExpanded}
                                  onToggleExpand={() => toggleParentExpanded(task.id)}
                                  dragAccessory={dragAccessory}
                                />
                              </SwipeableRow>
                              {isExpanded && (
                                <View style={{ marginLeft: 32, paddingLeft: 16, paddingBottom: 16, paddingRight: 8 }}>
                                  {subtasks.map((subtask) => {
                                    const subTag = tags.find(t => t.id === subtask.tagId);
                                    return (
                                      <SwipeableRow
                                        key={subtask.id}
                                        taskId={subtask.id}
                                        onMoveToIcebox={handleMoveToIcebox}
                                        onDelete={deleteTask}
                                        showIceboxButton={false}
                                      >
                                        <AnimatedTaskRow
                                          task={subtask}
                                          tagName={subTag?.name}
                                          tagType={subTag?.type}
                                          tags={tags}
                                          pillarColor={getPillarColor(subTag?.pillarId, pillars)}
                                          onUpdate={updateTask}
                                          isLast={true} // no divider line between subtasks — spacing alone separates them
                                          onToggle={handleToggle}
                                  canComplete={canCompleteTask}
                                          onEdit={(t) => setDetailTaskId(t.id)}
                                          onStartTimer={subtask.completed ? undefined : handleStartTimer}
                                          showStartButton={!subtask.completed}
                                          variant="subtask"
                                          parentPillarId={tag?.pillarId}
                                        />
                                      </SwipeableRow>
                                    );
                                  })}
                                  <View style={{ marginTop: 8 }}>
                                    <QuickAddBar
                                      compact
                                      autoFocus
                                      placeholder="Add subtask..."
                                      value={subtaskTitleByParent[task.id] || ''}
                                      onChangeText={(t) => setSubtaskTitleByParent(prev => ({ ...prev, [task.id]: t }))}
                                      onSubmit={() => {
                                        const title = (subtaskTitleByParent[task.id] || '').trim();
                                        if (title) {
                                          addTask({ title, parentId: task.id });
                                          setSubtaskTitleByParent(prev => ({ ...prev, [task.id]: '' }));
                                          feedback('taskComplete');
                                        }
                                      }}
                                    />
                                  </View>
                                </View>
                              )}
                            </View>
                          );
                        }}
                      />
                    </View>
                  )
                )}
              </View>
            );
          })}

          {/* Inbox Section — GTD Capture landing zone: untagged tasks,
              waiting on a Clarify decision (tag it, or it's actually a
              Journey). Only rendered once there's something to clarify. */}
          {inboxTasks.length > 0 && (
            <View className="mt-5">
              <View className="flex-row items-center gap-1.5 mb-3">
                <Ionicons name="mail-outline" size={16} color="#5AC8FA" />
                <Text className="text-[#5AC8FA] font-bold text-xs uppercase tracking-[1.5px]">
                  Inbox ({inboxTasks.length})
                </Text>
              </View>

              <View style={{ ...CARD_STYLE, borderColor: 'rgba(90,200,250,0.2)' }} className="rounded-2xl overflow-hidden mb-3">
                {inboxTasks.map((task, index) => {
                  const isLast = index === inboxTasks.length - 1;
                  return (
                    <Pressable
                      key={task.id}
                      onPress={() => setDetailTaskId(task.id)}
                      style={{
                        borderBottomWidth: isLast ? 0 : 0.5,
                        borderBottomColor: 'rgba(255,255,255,0.05)',
                      }}
                      className="p-4 flex-row items-center justify-between"
                    >
                      <View className="flex-1 pr-4">
                        <Text className="text-white text-base font-semibold">{task.title}</Text>
                        <Text className="text-[#8E8E93] text-xs font-medium mt-0.5">Tap to tag</Text>
                      </View>

                      <Pressable
                        onPress={() => handleConvertToJourney(task.id)}
                        style={{ backgroundColor: 'rgba(191,90,242,0.2)', borderColor: 'rgba(191,90,242,0.4)', borderWidth: 1 }}
                        className="flex-row items-center px-3 py-1.5 rounded-xl"
                      >
                        <Ionicons name="flag-outline" size={13} color="#BF5AF2" />
                        <Text className="text-[#BF5AF2] font-bold text-xs ml-1">Journey</Text>
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Icebox Tasks Section */}
          <View className="mt-5">
            <View className="flex-row items-center gap-1.5 mb-3">
              <Ionicons name="snow-outline" size={16} color="#8E8E93" />
              <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px]">
                The Icebox
              </Text>
            </View>

            {iceboxTasks.length === 0 ? (
              <View style={CARD_STYLE} className="rounded-2xl p-6 items-center justify-center">
                <Ionicons name="snow-outline" size={28} color="#3A3A3C" style={{ marginBottom: 8 }} />
                <Text className="text-[#8E8E93] text-xs font-semibold text-center">The Icebox is empty.</Text>
                <Text className="text-[#8E8E93] text-[11px] text-center mt-0.5">Defer distractions here to protect today's focus.</Text>
              </View>
            ) : (
              <View style={{ ...CARD_STYLE, borderColor: 'rgba(255,255,255,0.05)' }} className="rounded-2xl overflow-hidden mb-3 opacity-65">
                {iceboxTasks.map((task, index) => {
                  const tag = tags.find(t => t.id === task.tagId);
                  const isLast = index === iceboxTasks.length - 1;
                  return (
                    <View
                      key={task.id}
                      style={{
                        borderBottomWidth: isLast ? 0 : 0.5,
                        borderBottomColor: 'rgba(255,255,255,0.05)',
                        borderLeftWidth: 3,
                        borderLeftColor: getPillarColor(tag?.pillarId, pillars),
                      }}
                      className="p-4 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center flex-1 pr-4">
                        {/* Frozen checkbox — visual parity with active/completed rows */}
                        <View
                          style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#8E8E93', backgroundColor: 'transparent', marginRight: 12 }}
                        />
                        <View className="flex-1">
                          <Text className="text-zinc-300 text-base font-semibold">
                            {task.title}
                          </Text>
                          <View className="flex-row items-center mt-1 gap-1.5">
                            <View style={{ backgroundColor: '#2C2C2E' }} className="px-2 py-0.5 rounded-full">
                              <Text className="text-[#8E8E93] text-[9px] font-bold uppercase tracking-wider">{tag?.name}</Text>
                            </View>
                            <Text className="text-[#8E8E93] text-xs font-medium">{task.estimatedMinutes} mins</Text>
                          </View>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => handleActivate(task.id)}
                        style={{ backgroundColor: 'rgba(191,90,242,0.2)', borderColor: 'rgba(191,90,242,0.4)', borderWidth: 1 }}
                        className="flex-row items-center px-3 py-1.5 rounded-xl"
                      >
                        <Ionicons name="arrow-up-circle-outline" size={13} color="#BF5AF2" />
                        <Text className="text-[#BF5AF2] font-bold text-xs ml-1">Move to Today</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <WeeklyReviewSheet
        visible={reviewSheetVisible}
        onClose={() => setReviewSheetVisible(false)}
        tasks={tasks}
        collections={collections}
        onComplete={completeWeeklyReview}
      />

      <TaskDetailModal
        task={detailTask}
        visible={!!detailTaskId}
        tasks={tasks}
        tags={tags}
        pillars={pillars}
        onClose={() => setDetailTaskId(null)}
        onUpdate={updateTask}
        onToggle={handleToggle}
        canComplete={canCompleteTask}
        onDelete={(id) => { deleteTask(id); setDetailTaskId(null); }}
        onStartTimer={handleStartTimer}
        onMoveToIcebox={handleMoveToIcebox}
        onActivateFromIcebox={handleActivate}
        addTask={addTask}
      />

      <ProgressPromptModal
        visible={!!progressPrompt}
        unitLabel={progressPrompt?.unitLabel || ''}
        taskTitle={progressPrompt?.taskTitle || ''}
        onCancel={() => setProgressPrompt(null)}
        onSubmit={(value) => {
          if (progressPrompt) {
            updateTask(progressPrompt.taskId, { metricProgress: value });
            completeToggle(progressPrompt.taskId);
          }
          setProgressPrompt(null);
        }}
      />

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

      <TimeSelectorModal
        visible={showAddTimeSelector}
        initialMinutes={estimatedMinutes}
        title="Estimate Duration"
        onClose={() => setShowAddTimeSelector(false)}
        onConfirm={(mins) => {
          setEstimatedMinutes(mins);
          setShowAddTimeSelector(false);
        }}
      />
    </SafeAreaView>
  );
}
