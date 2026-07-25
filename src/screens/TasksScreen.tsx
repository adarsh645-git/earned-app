import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTaskStore, Task } from '../store/taskStore';
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
import { useSummitStore, getChainTrail } from '../store/summitStore';
import { useCollectionStore } from '../store/collectionStore';
import { useEconomyStore } from '../store/economyStore';
import { useTimerStore } from '../store/timerStore';
import RewardToast from '../components/RewardToast';
import AnimatedTaskRow from '../components/AnimatedTaskRow';
import EditTaskModal from '../components/EditTaskModal';
import TimeSelectorModal from '../components/TimeSelectorModal';
import ConfirmModal from '../components/ConfirmModal';
import QuickAddBar from '../components/QuickAddBar';
import PillPicker from '../components/PillPicker';
import { getEligibleJourneys } from '../components/LinkProgressPicker';

// "Today's Focus List — Friday, July 25" / "Yesterday" / "Wed, Jul 23"
function formatDateLabel(dateStr: string, isToday: boolean): string {
  const d = new Date(`${dateStr}T00:00:00`); // local-time anchor — avoids the
                                              // UTC-midnight day-shift bug that
                                              // plain `new Date(dateStr)` has
  if (isToday) {
    return `Today's Focus List — ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function TasksScreen() {
  const { tasks, tags, pillars, addTask, updateTask, deleteTask, toggleTask, moveToIcebox, activateFromIcebox } = useTaskStore();
  const { summits } = useSummitStore();
  const { collections } = useCollectionStore();
  const { startTimer } = useTimerStore();

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
  const [quickAddOpenPill, setQuickAddOpenPill] = useState<'tag' | 'journey' | null>(null);
  const [quickAddTagId, setQuickAddTagId] = useState('');
  const [quickAddCollectionId, setQuickAddCollectionId] = useState('');
  const [quickAddSummitId, setQuickAddSummitId] = useState('');
  const [quickAddIsIcebox, setQuickAddIsIcebox] = useState(false);

  const quickAddTagType: 'earner' | 'burner' = quickAddTagId
    ? (tags.find(t => t.id === quickAddTagId)?.type ?? 'earner')
    : 'earner';
  const quickAddEligibleJourneys = getEligibleJourneys(collections, summits, quickAddTagType);

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
  const handleToggle = (id: string) => {
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
      setToastChainTrail(task.summitId ? getChainTrail(summits, task.summitId) : []);
      setToastVisible(true);
    }
    toggleTask(id);
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

  // Modals state
  const [editTask, setEditTask] = useState<Task | null>(null);

  const iceboxTasks = tasks.filter(t => t.isIcebox);

  // Bundle non-icebox tasks by the day they were created — today's group is
  // expanded by default, every other day collapses, and only the 5 most
  // recent distinct days are shown at all (older tasks simply don't render).
  const todayStr = new Date().toISOString().split('T')[0]; // matches dateCreated's own format exactly

  const tasksByDate: Record<string, Task[]> = {};
  tasks.filter(t => !t.isIcebox).forEach(t => {
    // dateCreated is now a full timestamp (for the time-of-day pill below);
    // grouping only cares about the calendar date. Backward-compatible with
    // pre-existing tasks whose dateCreated was already date-only (no 'T').
    const dateKey = t.dateCreated.split('T')[0];
    (tasksByDate[dateKey] ||= []).push(t);
  });
  // Active tasks first, completed ones after (faded) within each day's group.
  Object.values(tasksByDate).forEach(list =>
    list.sort((a, b) => Number(a.completed) - Number(b.completed))
  );

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
      collectionId: quickAddCollectionId || undefined,
      summitId: quickAddSummitId || undefined,
      isIcebox: quickAddIsIcebox,
    });

    feedback('taskComplete');
    setTitle('');
    setQuickAddTagId('');
    setQuickAddCollectionId('');
    setQuickAddSummitId('');
    setQuickAddIsIcebox(false);
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
        <Text className="text-white text-3xl font-extrabold tracking-tight mt-3 mb-4">Manage Focus</Text>

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
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 }}
              >
                <Ionicons name="time-outline" size={14} color="#A1A1AA" style={{ marginRight: 4 }} />
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>
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
                    label={quickAddTagId ? (tags.find(t => t.id === quickAddTagId)?.name || 'Tag') : 'Tag (last used)'}
                    options={tags.filter(t => !t.isArchived).map(t => ({ id: t.id, label: t.name }))}
                    selectedId={quickAddTagId}
                    onSelect={(id) => { feedback('select'); setQuickAddTagId(id); setQuickAddOpenPill(null); }}
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
                        setQuickAddSummitId(linked?.summitId || '');
                        setQuickAddOpenPill(null);
                      }}
                      open={quickAddOpenPill === 'journey'}
                      onToggle={() => setQuickAddOpenPill(p => (p === 'journey' ? null : 'journey'))}
                    />
                  )}

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
                </View>
              ),
            }}
          />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="flex-1">
          
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
                    <View style={CARD_STYLE} className="rounded-2xl overflow-hidden">
                      {dateTasks.map((task, index) => {
                        const tag = tags.find(t => t.id === task.tagId);
                        const isLast = index === dateTasks.length - 1;
                        return (
                          <AnimatedTaskRow
                            key={task.id}
                            task={task}
                            tagName={tag?.name}
                            tagType={tag?.type}
                            tags={tags}
                            onUpdate={updateTask}
                            isLast={isLast}
                            onToggle={handleToggle}
                            onMoveToIcebox={handleMoveToIcebox}
                            onEdit={setEditTask}
                            onDelete={deleteTask}
                            onStartTimer={task.completed ? undefined : handleStartTimer}
                            showStartButton={!task.completed}
                            showIceboxButton={!task.completed}
                          />
                        );
                      })}
                    </View>
                  )
                )}
              </View>
            );
          })}

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

      <EditTaskModal pillars={pillars} 
        task={editTask}
        visible={!!editTask}
        tags={tags}
        onClose={() => setEditTask(null)}
        onSave={(id, updates) => updateTask(id, updates)}
        onDelete={(id) => deleteTask(id)}
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
