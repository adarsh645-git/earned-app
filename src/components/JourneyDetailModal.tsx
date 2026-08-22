import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Collection, CollectionCategory, useCollectionStore } from '../store/collectionStore';
import { useGoalStore } from '../store/goalStore';
import { useTaskStore } from '../store/taskStore';
import EditableText from './EditableText';
import PillPicker from './PillPicker';
import QuickAddBar from './QuickAddBar';
import AnimatedProgressBar from './AnimatedProgressBar';
import ConfirmModal from './ConfirmModal';
import { CategoryVectorIcon } from '../utils/categoryIcons';
import { getPillarColor } from '../utils/pillarColor';
import { feedback } from '../utils/feedback';
import { resolveWaypointUnit, WAYPOINT_UNIT_TYPES } from '../utils/waypointUnit';
import useProgress from '../hooks/useProgress';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CATEGORIES: CollectionCategory[] = ['books', 'games', 'stocks', 'fitness', 'courses', 'travel', 'general'];

interface JourneyDetailModalProps {
  collection: Collection | null;
  visible: boolean;
  onClose: () => void;
  // Toggling an item can trigger celebration/toast feedback that lives at the
  // screen level (confetti modal, chain-legibility toast) — routed through
  // the same handler CollectionsScreen already used, so that behavior is
  // preserved unchanged rather than duplicated here.
  onToggleItem: (itemId: string, collectionId: string, waypointId?: string) => void;
}

/**
 * Full-screen Journey detail — replaces the old duplicate edit-Journey popup
 * and the card's inline expand-in-place Waypoints area. Fields autosave
 * immediately on change, same convention as Task/Goal Detail.
 */
export default function JourneyDetailModal({ collection, visible, onClose, onToggleItem }: JourneyDetailModalProps) {
  const {
    waypoints, items,
    updateCollection, deleteCollection,
    addWaypoint, updateWaypoint,
    addItem, updateItem, deleteItem,
  } = useCollectionStore();
  const { goals, deleteGoal } = useGoalStore();
  const { tasks, tags, pillars, addTask } = useTaskStore();
  const progressSelectors = useProgress();

  const [categoryPillOpen, setCategoryPillOpen] = useState(false);
  const [goalPillOpen, setGoalPillOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandedWaypoints, setExpandedWaypoints] = useState<Record<string, boolean>>({});
  const [waypointRowOpenField, setWaypointRowOpenField] = useState<Record<string, 'unit' | 'year' | 'month' | null>>({});
  const [waypointQuickAddTitle, setWaypointQuickAddTitle] = useState('');
  const [itemQuickAddTitleByWaypoint, setItemQuickAddTitleByWaypoint] = useState<Record<string, string>>({});
  const [itemQuickAddTitleByJourney, setItemQuickAddTitleByJourney] = useState('');
  // Target is a free numeric field (not a fixed preset — a page count like
  // 1125 easily exceeds any reasonable preset list), so it needs its own
  // per-waypoint draft buffer, same commit-on-blur convention as
  // GoalDetailModal's targetMetric field.
  const [waypointTargetDraft, setWaypointTargetDraft] = useState<Record<string, string>>({});
  // Draft buffer for the free-text label entered after picking "Custom…" in
  // the Unit picker — only rendered while a waypoint's unitType is 'custom'.
  const [waypointCustomUnitDraft, setWaypointCustomUnitDraft] = useState<Record<string, string>>({});
  // Same pattern as the Waypoint target/unit drafts above, but for the
  // Journey's own optional progress node (Collection.targetMetric/unitLabel
  // — see docs/sdd/025-unified-trickle-up-progress.md).
  const [journeyUnitPillOpen, setJourneyUnitPillOpen] = useState(false);
  const [journeyTargetDraft, setJourneyTargetDraft] = useState<string | undefined>(undefined);

  if (!collection) return null;

  const currentYear = new Date().getFullYear();
  const linkedGoal = goals.find(s => s.id === collection.goalId);
  const collectionWaypoints = waypoints.filter(w => w.collectionId === collection.id);
  const collectionItems = items.filter(i => i.collectionId === collection.id);
  const completedCount = collectionItems.filter(i => i.completed).length;
  const progress = collectionItems.length > 0 ? Math.round((completedCount / collectionItems.length) * 100) : 0;
  const linkedTasks = tasks.filter(t => t.collectionId === collection.id);
  const generalTasks = linkedTasks.filter(t => !t.waypointId);

  const journeyProgressNode = progressSelectors.journeyProgress(collection.id);
  const journeyUnitLabel = collection.unitLabel || (journeyProgressNode?.unit !== 'minutes' ? journeyProgressNode?.unit : undefined);

  const isGoalUnits = linkedGoal?.metricType === 'units';
  const goalCompleted = linkedGoal ? (isGoalUnits ? (linkedGoal.completedMetric || 0) : linkedGoal.completedMinutes) : 0;
  const goalTarget = linkedGoal ? (isGoalUnits ? (linkedGoal.targetMetric || 0) : linkedGoal.targetMinutes) : 0;
  const goalPct = goalTarget > 0 ? Math.min(100, Math.round((goalCompleted / goalTarget) * 100)) : 0;
  const goalProgressLabel = isGoalUnits
    ? `${goalCompleted}/${goalTarget}${linkedGoal?.unitLabel ? ` ${linkedGoal.unitLabel}` : ''}`
    : `${(goalCompleted / 60).toFixed(1)}/${(goalTarget / 60).toFixed(1)}h`;

  const toggleWaypoint = (id: string) => {
    feedback('expand');
    setExpandedWaypoints(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleQuickAddWaypoint = () => {
    const title = waypointQuickAddTitle.trim();
    if (!title) return;
    addWaypoint({ collectionId: collection.id, title });
    setWaypointQuickAddTitle('');
    feedback('select');
  };

  const handleQuickAddItem = (waypointId: string | undefined, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    addItem({ collectionId: collection.id, waypointId, title: trimmed, isAddedLater: true });
    feedback('select');
  };

  // Waypoint-scoped "Add a task" creates a real Task (not a CollectionItem)
  // so it actually appears on the Tasks page — the Journey-root "Add a
  // task" box above (no waypointId) is unaffected and still creates a
  // CollectionItem, unchanged.
  const handleQuickAddWaypointTask = (waypointId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    addTask({ title: trimmed, collectionId: collection.id, waypointId, goalId: collection.goalId });
    feedback('select');
  };

  const commitWaypointTarget = (waypointId: string) => {
    const draft = waypointTargetDraft[waypointId];
    if (draft === undefined) return;
    const parsed = parseInt(draft, 10);
    const wp = waypoints.find(w => w.id === waypointId);
    const next = isNaN(parsed) || parsed <= 0 ? undefined : parsed;
    if (wp && next !== wp.targetMetric) {
      updateWaypoint(waypointId, { targetMetric: next });
    }
  };

  const commitWaypointCustomUnit = (waypointId: string) => {
    const draft = waypointCustomUnitDraft[waypointId];
    if (draft === undefined) return;
    const wp = waypoints.find(w => w.id === waypointId);
    const trimmed = draft.trim();
    if (wp && trimmed && trimmed !== wp.unitLabel) {
      updateWaypoint(waypointId, { unitLabel: trimmed });
    }
  };

  const commitJourneyTarget = () => {
    if (journeyTargetDraft === undefined) return;
    const parsed = parseInt(journeyTargetDraft, 10);
    const next = isNaN(parsed) || parsed <= 0 ? undefined : parsed;
    if (next !== collection.targetMetric) {
      updateCollection(collection.id, { targetMetric: next });
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
            {/* Title */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ marginRight: 10 }}>
                <CategoryVectorIcon category={collection.category} size={22} color="#BF5AF2" />
              </View>
              <EditableText
                value={collection.title}
                onSave={(title) => updateCollection(collection.id, { title })}
                containerStyle={{ flex: 1 }}
                textStyle={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF' }}
              />
            </View>

            {/* Category / Goal pills */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              <PillPicker
                label={`${collection.category.charAt(0).toUpperCase()}${collection.category.slice(1)}`}
                options={CATEGORIES.map(c => ({ id: c, label: `${c.charAt(0).toUpperCase()}${c.slice(1)}` }))}
                selectedId={collection.category}
                onSelect={(id) => { feedback('select'); updateCollection(collection.id, { category: id as CollectionCategory }); setCategoryPillOpen(false); }}
                open={categoryPillOpen}
                onToggle={() => setCategoryPillOpen(p => !p)}
              />
              <PillPicker
                // Prefixed — a Goal's title is free text and can collide
                // with a Category name (e.g. a "Books" reading Goal next to
                // the "Books" Category), which otherwise renders as two
                // identical-looking pills with no way to tell them apart.
                label={linkedGoal ? `Goal: ${linkedGoal.title}` : 'No Goal'}
                options={[{ id: '', label: 'No Goal' }, ...goals.map(s => ({ id: s.id, label: s.title }))]}
                selectedId={collection.goalId || ''}
                onSelect={(id) => { feedback('select'); updateCollection(collection.id, { goalId: id || undefined }); setGoalPillOpen(false); }}
                open={goalPillOpen}
                onToggle={() => setGoalPillOpen(p => !p)}
                accentColor="#5AC8FA"
              />
            </View>

            {/* Progress — either the Journey's own target+unit node (when set),
                or the plain item-checklist bar (unchanged cosmetic default
                for a passive Journey) — plus, separately, the mirrored
                linked-Goal progress below. */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                This Journey
              </Text>
              {journeyProgressNode?.hasTarget ? (
                <>
                  <AnimatedProgressBar progress={journeyProgressNode.pctRounded} color="#BF5AF2" height={8} />
                  <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 6 }}>
                    {journeyProgressNode.completed}/{journeyProgressNode.target}{journeyUnitLabel ? ` ${journeyUnitLabel}` : ''} ({journeyProgressNode.pctRounded}%)
                  </Text>
                </>
              ) : (
                <>
                  <AnimatedProgressBar progress={progress} color="#BF5AF2" height={8} />
                  <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 6 }}>{completedCount}/{collectionItems.length} tasks ({progress}%)</Text>
                </>
              )}

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <TextInput
                  value={journeyTargetDraft ?? (collection.targetMetric ? String(collection.targetMetric) : '')}
                  onChangeText={setJourneyTargetDraft}
                  onBlur={commitJourneyTarget}
                  placeholder="No Target"
                  placeholderTextColor="#5C5C5E"
                  keyboardType="numeric"
                  style={[
                    { backgroundColor: '#2C2C2E', color: '#FFF', fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#3A3A3C', width: 90 },
                    { outlineStyle: 'none' } as any,
                  ]}
                />
                <PillPicker
                  label={collection.unitLabel || 'No Unit'}
                  options={[{ id: '', label: 'No Unit' }, ...WAYPOINT_UNIT_TYPES.filter(u => u.id !== 'custom')]}
                  selectedId={collection.unitLabel || ''}
                  onSelect={(id) => {
                    feedback('select');
                    const preset = WAYPOINT_UNIT_TYPES.find(u => u.id === id);
                    updateCollection(collection.id, { unitLabel: id ? (preset?.label || id) : undefined });
                    setJourneyUnitPillOpen(false);
                  }}
                  open={journeyUnitPillOpen}
                  onToggle={() => setJourneyUnitPillOpen(p => !p)}
                  accentColor="#BF5AF2"
                />
              </View>
            </View>

            {linkedGoal && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Linked Goal
                </Text>
                <AnimatedProgressBar progress={goalPct} color="#5AC8FA" height={8} />
                <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 6 }}>{goalProgressLabel} toward "{linkedGoal.title}" ({goalPct}%)</Text>
              </View>
            )}

            {/* Waypoints Area */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Waypoints
              </Text>
              {collectionWaypoints.map(wp => {
                const wpItems = collectionItems.filter(i => i.waypointId === wp.id);
                const wpTasks = linkedTasks.filter(t => t.waypointId === wp.id);
                
                const unitLabel = resolveWaypointUnit(wp, collection, goals) || 'min';
                const wpProgressNode = progressSelectors.waypointProgress(wp.id);
                const hasTarget = wp.targetMetric != null;
                const targetMetric = wp.targetMetric || 1;
                const wpCompleted = wpProgressNode?.completed || 0;
                const wpPct = hasTarget ? (wpProgressNode?.pctRounded ?? 0) : 0;
                const isWpComplete = hasTarget && wpPct === 100;
                
                const timeframeLabel = wp.month && wp.year
                  ? `${MONTH_NAMES[wp.month - 1]} ${wp.year}`
                  : wp.year ? `${wp.year}` : 'Ongoing';
                const isExpanded = !!expandedWaypoints[wp.id];

                return (
                  <View key={wp.id} style={{ marginBottom: 8, backgroundColor: '#1C1C1E', borderRadius: 12, borderWidth: 1, borderColor: isWpComplete ? '#30D15844' : '#2C2C2E', overflow: 'hidden' }}>
                    <Pressable onPress={() => toggleWaypoint(wp.id)} style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name={isWpComplete ? 'checkmark-circle' : 'flag'} size={16} color={isWpComplete ? '#30D158' : '#5AC8FA'} style={{ marginRight: 7 }} />
                          <EditableText value={wp.title} onSave={(title) => updateWaypoint(wp.id, { title })} textStyle={{ color: '#FFF', fontSize: 14, fontWeight: '600' }} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ color: '#8E8E93', fontSize: 11, fontWeight: '500', marginRight: 10 }}>
                            {hasTarget ? `${wpCompleted} / ${targetMetric} ${unitLabel} (${wpPct}%)` : `${wpCompleted} ${unitLabel}`}
                          </Text>
                          <View style={{ backgroundColor: '#2C2C2E', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: '#5AC8FA', fontSize: 10, fontWeight: '600' }}>{timeframeLabel}</Text>
                          </View>
                        </View>
                      </View>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#8E8E93" />
                    </Pressable>

                    {isExpanded && (
                      <View style={{ paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#2C2C2E' }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 4 }}>
                          <TextInput
                            value={waypointTargetDraft[wp.id] ?? (wp.targetMetric ? String(wp.targetMetric) : '')}
                            onChangeText={(text) => setWaypointTargetDraft(prev => ({ ...prev, [wp.id]: text }))}
                            onBlur={() => commitWaypointTarget(wp.id)}
                            placeholder="No Target"
                            placeholderTextColor="#5C5C5E"
                            keyboardType="numeric"
                            style={[
                              { backgroundColor: '#2C2C2E', color: '#FFF', fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#3A3A3C', width: 90 },
                              { outlineStyle: 'none' } as any,
                            ]}
                          />

                          <PillPicker
                            label={wp.unitType ? (WAYPOINT_UNIT_TYPES.find(u => u.id === wp.unitType)?.label || wp.unitLabel || 'Unit') : 'No Unit'}
                            options={[{ id: '', label: 'No Unit' }, ...WAYPOINT_UNIT_TYPES]}
                            selectedId={wp.unitType || ''}
                            onSelect={(id) => {
                              feedback('select');
                              if (id === 'custom') {
                                updateWaypoint(wp.id, { unitType: 'custom' });
                              } else if (id === '') {
                                updateWaypoint(wp.id, { unitType: undefined, unitLabel: undefined });
                              } else {
                                const preset = WAYPOINT_UNIT_TYPES.find(u => u.id === id);
                                updateWaypoint(wp.id, { unitType: id, unitLabel: preset?.label });
                              }
                              setWaypointRowOpenField(prev => ({ ...prev, [wp.id]: null }));
                            }}
                            open={waypointRowOpenField[wp.id] === 'unit'}
                            onToggle={() => setWaypointRowOpenField(prev => ({ ...prev, [wp.id]: prev[wp.id] === 'unit' ? null : 'unit' }))}
                            accentColor="#5AC8FA"
                          />
                          <PillPicker
                            label={wp.year ? String(wp.year) : 'Ongoing'}
                            options={[{ id: '', label: 'Ongoing' }, ...[currentYear, currentYear + 1, currentYear + 2].map(y => ({ id: String(y), label: String(y) }))]}
                            selectedId={wp.year ? String(wp.year) : ''}
                            onSelect={(id) => { updateWaypoint(wp.id, { year: id ? parseInt(id, 10) : undefined }); setWaypointRowOpenField(prev => ({ ...prev, [wp.id]: null })); }}
                            open={waypointRowOpenField[wp.id] === 'year'}
                            onToggle={() => setWaypointRowOpenField(prev => ({ ...prev, [wp.id]: prev[wp.id] === 'year' ? null : 'year' }))}
                            accentColor="#5AC8FA"
                          />
                          <PillPicker
                            label={wp.month ? MONTH_NAMES[wp.month - 1].slice(0, 3) : 'All Year'}
                            options={[{ id: '', label: 'All Year' }, ...MONTH_NAMES.map((m, i) => ({ id: String(i + 1), label: m }))]}
                            selectedId={wp.month ? String(wp.month) : ''}
                            onSelect={(id) => { updateWaypoint(wp.id, { month: id ? parseInt(id, 10) : undefined }); setWaypointRowOpenField(prev => ({ ...prev, [wp.id]: null })); }}
                            open={waypointRowOpenField[wp.id] === 'month'}
                            onToggle={() => setWaypointRowOpenField(prev => ({ ...prev, [wp.id]: prev[wp.id] === 'month' ? null : 'month' }))}
                            accentColor="#5AC8FA"
                          />
                        </View>

                        {wp.unitType === 'custom' && (
                          <TextInput
                            value={waypointCustomUnitDraft[wp.id] ?? (wp.unitLabel || '')}
                            onChangeText={(text) => setWaypointCustomUnitDraft(prev => ({ ...prev, [wp.id]: text }))}
                            onBlur={() => commitWaypointCustomUnit(wp.id)}
                            placeholder="Unit label (e.g. laps, episodes)"
                            placeholderTextColor="#5C5C5E"
                            style={[
                              { backgroundColor: '#2C2C2E', color: '#FFF', fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#3A3A3C', marginBottom: 4 },
                              { outlineStyle: 'none' } as any,
                            ]}
                          />
                        )}

                        {wpItems.length > 0 ? (
                          wpItems.map(item => (
                            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                              <Pressable onPress={() => onToggleItem(item.id, collection.id, item.waypointId)} style={{ marginRight: 10 }}>
                                <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: item.completed ? '#BF5AF2' : '#8E8E93', backgroundColor: item.completed ? '#BF5AF2' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                                  {item.completed && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                </View>
                              </Pressable>
                              <EditableText
                                value={item.title}
                                onSave={(title) => updateItem(item.id, { title })}
                                containerStyle={{ flex: 1 }}
                                textStyle={{ color: item.completed ? '#8E8E93' : '#FFF', fontSize: 14, textDecorationLine: item.completed ? 'line-through' : 'none' }}
                              />
                              <Pressable onPress={() => deleteItem(item.id)} style={{ padding: 4 }}>
                                <Ionicons name="trash-outline" size={15} color="#FF453A" />
                              </Pressable>
                            </View>
                          ))
                        ) : wpTasks.length === 0 ? (
                          <Text style={{ color: '#8E8E93', fontSize: 12, marginTop: 10, fontStyle: 'italic' }}>No tasks added yet.</Text>
                        ) : null}

                        {wpTasks.length > 0 && (
                          <View style={{ marginTop: wpItems.length > 0 ? 4 : 10 }}>
                            {wpTasks.map(t => (
                              <View
                                key={t.id}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  paddingVertical: 6,
                                  paddingLeft: 8,
                                  borderLeftWidth: 3,
                                  borderLeftColor: getPillarColor(tags.find(tag => tag.id === t.tagId)?.pillarId, pillars),
                                }}
                              >
                                <Ionicons name={t.completed ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={t.completed ? '#30D158' : '#8E8E93'} style={{ marginRight: 8 }} />
                                <Text style={{ color: t.completed ? '#8E8E93' : '#EBEBF5', fontSize: 13, flex: 1, textDecorationLine: t.completed ? 'line-through' : 'none' }} numberOfLines={1}>
                                  {t.title}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        <View style={{ marginTop: 10 }}>
                          <QuickAddBar
                            placeholder="Add a task..."
                            value={itemQuickAddTitleByWaypoint[wp.id] || ''}
                            onChangeText={(t) => setItemQuickAddTitleByWaypoint(prev => ({ ...prev, [wp.id]: t }))}
                            onSubmit={() => {
                              handleQuickAddWaypointTask(wp.id, itemQuickAddTitleByWaypoint[wp.id] || '');
                              setItemQuickAddTitleByWaypoint(prev => ({ ...prev, [wp.id]: '' }));
                            }}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Root-Level Items (no Waypoint) */}
              {collectionItems.filter(i => !i.waypointId).map(item => (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' }}>
                  <Pressable onPress={() => onToggleItem(item.id, collection.id)} style={{ marginRight: 10 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: item.completed ? '#BF5AF2' : '#8E8E93', backgroundColor: item.completed ? '#BF5AF2' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                      {item.completed && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>
                  </Pressable>
                  <EditableText
                    value={item.title}
                    onSave={(title) => updateItem(item.id, { title })}
                    containerStyle={{ flex: 1 }}
                    textStyle={{ color: item.completed ? '#8E8E93' : '#FFF', fontSize: 14, textDecorationLine: item.completed ? 'line-through' : 'none' }}
                  />
                  <Pressable onPress={() => deleteItem(item.id)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={15} color="#FF453A" />
                  </Pressable>
                </View>
              ))}

              <View style={{ marginTop: 10, gap: 8 }}>
                <QuickAddBar
                  placeholder="Add a waypoint..."
                  value={waypointQuickAddTitle}
                  onChangeText={setWaypointQuickAddTitle}
                  onSubmit={handleQuickAddWaypoint}
                  accentColor="#5AC8FA"
                />
                <QuickAddBar
                  placeholder="Add a task..."
                  value={itemQuickAddTitleByJourney}
                  onChangeText={setItemQuickAddTitleByJourney}
                  onSubmit={() => {
                    handleQuickAddItem(undefined, itemQuickAddTitleByJourney);
                    setItemQuickAddTitleByJourney('');
                  }}
                />
              </View>
            </View>

            {/* Tasks (reverse lookup) — Waypoint-linked tasks already render
                nested under their own Waypoint card above; this is only the
                remainder with no Waypoint (or every task, if this Journey
                has no Waypoints at all). */}
            {generalTasks.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  {collectionWaypoints.length > 0 ? 'General' : 'Tasks'}
                </Text>
                {generalTasks.map(t => (
                  <View
                    key={t.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#1C1C1E',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#2C2C2E',
                      borderLeftWidth: 3,
                      borderLeftColor: getPillarColor(tags.find(tag => tag.id === t.tagId)?.pillarId, pillars),
                      padding: 14,
                      marginBottom: 8,
                    }}
                  >
                    <Ionicons name={t.completed ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={t.completed ? '#30D158' : '#8E8E93'} style={{ marginRight: 10 }} />
                    <Text style={{ color: t.completed ? '#8E8E93' : '#EBEBF5', fontSize: 14, fontWeight: '500', flex: 1, textDecorationLine: t.completed ? 'line-through' : 'none' }} numberOfLines={1}>
                      {t.title}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ConfirmModal
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        icon="warning-outline"
        iconColor="#FF453A"
        accentColor="#FF453A"
        title="Delete Journey?"
        message="Historically earned milestone cash rewards will remain safe in your balance."
        actions={
          linkedGoal
            ? [
                { label: 'Cancel', onPress: () => {}, style: 'cancel' },
                { label: 'Delete Journey Only (Keep Goal)', onPress: () => { deleteCollection(collection.id); onClose(); } },
                { label: 'Delete Journey & Linked Goal', style: 'destructive', onPress: () => { deleteGoal(linkedGoal.id); deleteCollection(collection.id); onClose(); } },
              ]
            : [
                { label: 'Cancel', onPress: () => {}, style: 'cancel' },
                { label: 'Delete Journey', style: 'destructive', onPress: () => { deleteCollection(collection.id); onClose(); } },
              ]
        }
      />
    </Modal>
  );
}
