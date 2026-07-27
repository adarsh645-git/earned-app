import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Task, Tag, Pillar } from '../store/taskStore';
import PillPicker from './PillPicker';
import EditableText from './EditableText';
import TimeSelectorModal from './TimeSelectorModal';
import ConfirmModal from './ConfirmModal';
import QuickAddBar from './QuickAddBar';
import AnimatedTaskRow from './AnimatedTaskRow';
import { useCollectionStore } from '../store/collectionStore';
import { useSummitStore } from '../store/summitStore';
import { getEligibleJourneys } from './LinkProgressPicker';
import { feedback } from '../utils/feedback';

interface TaskDetailModalProps {
  task: Task | null;
  visible: boolean;
  tasks: Task[]; // full list — subtasks are derived by filtering on parentId
  tags: Tag[];
  pillars: Pillar[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onStartTimer?: (id: string, mins: number) => void;
  onMoveToIcebox?: (id: string) => void;
  onActivateFromIcebox?: (id: string) => void;
  addTask: (task: { title: string; parentId?: string }) => string;
}

type OpenPill = 'pillar' | 'tag' | 'journey' | 'waypoint' | null;

/**
 * Full-screen task detail — replaces the old centered EditTaskModal popup.
 * Opened by tapping a row (AnimatedTaskRow's onPress) or its pencil action;
 * every field autosaves via onUpdate immediately, same as the row's inline
 * pills, so there's no separate "Save" step.
 */
export default function TaskDetailModal({
  task,
  visible,
  tasks,
  tags,
  pillars,
  onClose,
  onUpdate,
  onToggle,
  onDelete,
  onStartTimer,
  onMoveToIcebox,
  onActivateFromIcebox,
  addTask,
}: TaskDetailModalProps) {
  const { collections, waypoints } = useCollectionStore();
  const { summits } = useSummitStore();
  const [openPill, setOpenPill] = useState<OpenPill>(null);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metricProgressInput, setMetricProgressInput] = useState('');

  useEffect(() => {
    setDescription(task?.description || '');
    setMetricProgressInput(task?.metricProgress != null ? String(task.metricProgress) : '');
  }, [task?.id]);

  if (!task) return null;

  const tag = tags.find(t => t.id === task.tagId);
  const tagType: 'earner' | 'burner' = tag?.type === 'burner' ? 'burner' : 'earner';
  const accent = tagType === 'burner' ? '#5AC8FA' : '#30D158';
  const eligibleJourneys = getEligibleJourneys(collections, summits, tagType);
  const linkedJourney = task.collectionId ? collections.find(c => c.id === task.collectionId) : undefined;
  const activePillars = pillars.filter(p => !p.isArchived);
  const currentPillarId = tag?.pillarId || activePillars[0]?.id || '';
  const eligibleWaypoints = task.collectionId ? waypoints.filter(w => w.collectionId === task.collectionId) : [];
  // Progress quantity (e.g. "10 pages") only matters when the linked Summit
  // is a units-mode goal — hidden entirely for time-based/unlinked tasks.
  const linkedSummit = task.summitId ? summits.find(s => s.id === task.summitId) : undefined;
  const isUnitsGoal = linkedSummit?.metricType === 'units';
  const unitLabel = linkedSummit?.unitLabel || 'units';

  const subtasks = tasks.filter(t => t.parentId === task.id);
  const completedSubtasks = subtasks.filter(t => t.completed);

  const commitDescription = () => {
    if (description !== (task.description || '')) {
      onUpdate(task.id, { description: description.trim() || undefined });
    }
  };

  const commitMetricProgress = () => {
    const parsed = parseFloat(metricProgressInput);
    const next = isNaN(parsed) ? undefined : parsed;
    if (next !== task.metricProgress) {
      onUpdate(task.id, { metricProgress: next });
    }
  };

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
            {/* Title + completion checkbox */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 }}>
              <Pressable onPress={() => onToggle(task.id)} style={{ marginRight: 12, marginTop: 4 }} hitSlop={8}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    borderWidth: 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: task.completed ? accent : 'transparent',
                    borderColor: task.completed ? accent : '#8E8E93',
                  }}
                >
                  {task.completed && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </View>
              </Pressable>
              <EditableText
                value={task.title}
                onSave={(title) => onUpdate(task.id, { title })}
                containerStyle={{ flex: 1 }}
                textStyle={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  textDecorationLine: task.completed ? 'line-through' : 'none',
                }}
              />
            </View>

            {/* Metadata pills */}
            <View className="flex-row items-center" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              <PillPicker
                label={activePillars.find(p => p.id === currentPillarId)?.name || 'Pillar'}
                options={activePillars.map(p => ({ id: p.id, label: p.name }))}
                selectedId={currentPillarId}
                onSelect={(id) => {
                  feedback('select');
                  // Category must always resolve to a valid tag — jump to
                  // the newly-picked Pillar's first Category immediately.
                  const pillarTags = tags.filter(t => t.pillarId === id && !t.isArchived);
                  onUpdate(task.id, { tagId: pillarTags[0]?.id || '' });
                  setOpenPill(null);
                }}
                open={openPill === 'pillar'}
                onToggle={() => setOpenPill(p => (p === 'pillar' ? null : 'pillar'))}
              />

              <PillPicker
                label={tag?.name || 'Tag'}
                options={tags.filter(t => t.pillarId === currentPillarId && !t.isArchived).map(t => ({ id: t.id, label: t.name }))}
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
                <Ionicons name="time-outline" size={12} color="#A1A1AA" style={{ marginRight: 4 }} />
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{task.estimatedMinutes}m</Text>
              </Pressable>

              {eligibleJourneys.length > 0 && (
                <PillPicker
                  label={linkedJourney ? linkedJourney.title : 'No Journey'}
                  options={[{ id: '', label: 'No Journey' }, ...eligibleJourneys.map(c => ({ id: c.id, label: c.title }))]}
                  selectedId={task.collectionId || ''}
                  onSelect={(id) => {
                    feedback('select');
                    const linked = eligibleJourneys.find(c => c.id === id);
                    // Waypoint belongs to the old Journey — clear it whenever
                    // the Journey changes (including clearing to "No Journey").
                    onUpdate(task.id, { collectionId: id || undefined, summitId: linked?.summitId || undefined, waypointId: undefined });
                    setOpenPill(null);
                  }}
                  open={openPill === 'journey'}
                  onToggle={() => setOpenPill(p => (p === 'journey' ? null : 'journey'))}
                  accentColor={accent}
                />
              )}

              {eligibleWaypoints.length > 0 && (
                <PillPicker
                  label={task.waypointId ? (eligibleWaypoints.find(w => w.id === task.waypointId)?.title || 'Waypoint') : 'No Waypoint'}
                  options={[{ id: '', label: 'No Waypoint' }, ...eligibleWaypoints.map(w => ({ id: w.id, label: w.title }))]}
                  selectedId={task.waypointId || ''}
                  onSelect={(id) => { feedback('select'); onUpdate(task.id, { waypointId: id || undefined }); setOpenPill(null); }}
                  open={openPill === 'waypoint'}
                  onToggle={() => setOpenPill(p => (p === 'waypoint' ? null : 'waypoint'))}
                  accentColor="#5AC8FA"
                />
              )}
            </View>

            {/* Progress toward goal — only for a units-mode linked Summit */}
            {isUnitsGoal && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Progress ({unitLabel})
                </Text>
                <TextInput
                  value={metricProgressInput}
                  onChangeText={setMetricProgressInput}
                  onBlur={commitMetricProgress}
                  placeholder={`e.g. 10 ${unitLabel}`}
                  placeholderTextColor="#5C5C5E"
                  keyboardType="numeric"
                  style={[
                    { backgroundColor: '#18181B', color: '#FFFFFF', padding: 16, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#2C2C2E' },
                    { outlineStyle: 'none' } as any,
                  ]}
                />
                <Text style={{ color: '#5C5C5E', fontSize: 11, marginTop: 6 }}>
                  How much of the goal this task completes — separate from its time estimate above, which still drives what you earn.
                </Text>
              </View>
            )}

            {/* Description */}
            <View style={{ marginBottom: 28 }}>
              <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Description
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                onBlur={commitDescription}
                placeholder="Add notes, links, or context..."
                placeholderTextColor="#5C5C5E"
                multiline
                textAlignVertical="top"
                style={[
                  {
                    backgroundColor: '#18181B',
                    color: '#FFFFFF',
                    padding: 16,
                    borderRadius: 12,
                    fontSize: 15,
                    borderWidth: 1,
                    borderColor: '#2C2C2E',
                    minHeight: 100,
                  },
                  { outlineStyle: 'none' } as any,
                ]}
              />
            </View>

            {/* Subtasks */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Subtasks{subtasks.length > 0 ? ` (${completedSubtasks.length}/${subtasks.length})` : ''}
              </Text>
              {subtasks.map((subtask, i) => {
                const subTag = tags.find(t => t.id === subtask.tagId);
                return (
                  <AnimatedTaskRow
                    key={subtask.id}
                    task={subtask}
                    tagName={subTag?.name}
                    tagType={subTag?.type}
                    tags={tags}
                    onUpdate={onUpdate}
                    isLast={i === subtasks.length - 1}
                    onToggle={onToggle}
                    onStartTimer={subtask.completed ? undefined : onStartTimer}
                    showStartButton={!subtask.completed}
                    variant="subtask"
                  />
                );
              })}
              <View style={{ marginTop: 8 }}>
                <QuickAddBar
                  compact
                  placeholder="Add subtask..."
                  value={subtaskTitle}
                  onChangeText={setSubtaskTitle}
                  onSubmit={() => {
                    const title = subtaskTitle.trim();
                    if (title) {
                      addTask({ title, parentId: task.id });
                      setSubtaskTitle('');
                      feedback('taskComplete');
                    }
                  }}
                />
              </View>
            </View>

            {/* Footer actions */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              {!task.completed && onStartTimer && (
                <Pressable
                  onPress={() => { onStartTimer(task.id, task.estimatedMinutes); onClose(); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1, backgroundColor: '#BF5AF2', paddingVertical: 14, borderRadius: 12 }}
                >
                  <Ionicons name="play" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Start Timer</Text>
                </Pressable>
              )}

              {(onMoveToIcebox || onActivateFromIcebox) && (
                <Pressable
                  onPress={() => {
                    if (task.isIcebox) onActivateFromIcebox?.(task.id);
                    else onMoveToIcebox?.(task.id);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: '#2C2C2E', borderWidth: 1, borderColor: '#3A3A3C' }}
                >
                  <Ionicons name="snow-outline" size={18} color={task.isIcebox ? '#BF5AF2' : '#8E8E93'} />
                </Pressable>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

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

      <ConfirmModal
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        icon="trash-outline"
        iconColor="#FF453A"
        accentColor="#FF453A"
        title="Delete Task"
        message={`Delete "${task.title}"? This can't be undone.`}
        actions={[
          { label: 'Cancel', onPress: () => setConfirmDelete(false), style: 'cancel' },
          { label: 'Delete', onPress: () => { onDelete(task.id); onClose(); }, style: 'destructive' },
        ]}
      />
    </Modal>
  );
}
