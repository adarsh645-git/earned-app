import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
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
  const { tasks, tags, pillars } = useTaskStore();

  const [categoryPillOpen, setCategoryPillOpen] = useState(false);
  const [goalPillOpen, setGoalPillOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandedWaypoints, setExpandedWaypoints] = useState<Record<string, boolean>>({});
  const [waypointRowOpenField, setWaypointRowOpenField] = useState<Record<string, 'target' | 'year' | 'month' | null>>({});
  const [waypointQuickAddTitle, setWaypointQuickAddTitle] = useState('');
  const [itemQuickAddTitleByWaypoint, setItemQuickAddTitleByWaypoint] = useState<Record<string, string>>({});
  const [itemQuickAddTitleByJourney, setItemQuickAddTitleByJourney] = useState('');

  if (!collection) return null;

  const currentYear = new Date().getFullYear();
  const linkedGoal = goals.find(s => s.id === collection.goalId);
  const collectionWaypoints = waypoints.filter(w => w.collectionId === collection.id);
  const collectionItems = items.filter(i => i.collectionId === collection.id);
  const completedCount = collectionItems.filter(i => i.completed).length;
  const progress = collectionItems.length > 0 ? Math.round((completedCount / collectionItems.length) * 100) : 0;
  const linkedTasks = tasks.filter(t => t.collectionId === collection.id);
  const generalTasks = linkedTasks.filter(t => !t.waypointId);

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
                label={linkedGoal ? linkedGoal.title : 'No Goal'}
                options={[{ id: '', label: 'No Goal' }, ...goals.map(s => ({ id: s.id, label: s.title }))]}
                selectedId={collection.goalId || ''}
                onSelect={(id) => { feedback('select'); updateCollection(collection.id, { goalId: id || undefined }); setGoalPillOpen(false); }}
                open={goalPillOpen}
                onToggle={() => setGoalPillOpen(p => !p)}
                accentColor="#5AC8FA"
              />
            </View>

            {/* Progress — Journey's own item checklist, and (separately) the mirrored linked-Goal progress */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                This Journey
              </Text>
              <AnimatedProgressBar progress={progress} color="#BF5AF2" height={8} />
              <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 6 }}>{completedCount}/{collectionItems.length} tasks ({progress}%)</Text>
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
                // A Waypoint's progress counts completed Tasks alongside its
                // CollectionItem checklist — both are "things that live under
                // this Waypoint," just created from different surfaces.
                const wpCompleted = wpItems.filter(i => i.completed).length + wpTasks.filter(t => t.completed).length;
                const wpTotalCount = wpItems.length + wpTasks.length;
                const targetMetric = wp.targetMetric || wpTotalCount || 1;
                const wpPct = Math.min(100, Math.round((wpCompleted / targetMetric) * 100));
                const isWpComplete = wpPct === 100;
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
                            {wpCompleted} / {wp.targetMetric ? wp.targetMetric : wpTotalCount} ({wpPct}%)
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
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 4 }}>
                          <PillPicker
                            label={wp.targetMetric ? `Target: ${wp.targetMetric}` : 'No Target'}
                            options={[{ id: '', label: 'No Target' }, ...[5, 10, 15, 20, 25, 30, 50, 100].map(n => ({ id: String(n), label: String(n) }))]}
                            selectedId={wp.targetMetric ? String(wp.targetMetric) : ''}
                            onSelect={(id) => { updateWaypoint(wp.id, { targetMetric: id ? parseInt(id, 10) : undefined }); setWaypointRowOpenField(prev => ({ ...prev, [wp.id]: null })); }}
                            open={waypointRowOpenField[wp.id] === 'target'}
                            onToggle={() => setWaypointRowOpenField(prev => ({ ...prev, [wp.id]: prev[wp.id] === 'target' ? null : 'target' }))}
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
                              handleQuickAddItem(wp.id, itemQuickAddTitleByWaypoint[wp.id] || '');
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
