import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Modal, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCollectionStore, CollectionCategory, Collection, CollectionItem } from '../store/collectionStore';
import { useGoalStore, Goal, getChainTrail, getEligibleParents } from '../store/goalStore';
import { useTaskStore } from '../store/taskStore';
import { useConfettiStore } from '../store/confettiStore';
import { getPillarColor, FALLBACK_COLOR } from '../utils/pillarColor';
import { PrimaryButton } from '../components/PrimaryButton';
import AnimatedProgressBar from '../components/AnimatedProgressBar';
import AnimatedGoalCard from '../components/AnimatedGoalCard';
import QuickStartModal from '../components/QuickStartModal';
import RewardToast from '../components/RewardToast';
import PillPicker from '../components/PillPicker';
import EditableText from '../components/EditableText';
import JourneyDetailModal from '../components/JourneyDetailModal';
import { feedback } from '../utils/feedback';
import { CategoryVectorIcon } from '../utils/categoryIcons';
import useTimerLauncher from '../hooks/useTimerLauncher';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PremiumInput = (props: React.ComponentProps<typeof TextInput>) => (
  <TextInput
    {...props}
    style={[props.style, { outlineStyle: 'none' } as any]}
  />
);

type JourneyLinkMode = 'none' | 'existing' | 'new';

type CelebrationInfo = {
  title: string;
  subtitle: string;
  payoutText: string;
  badgeLabel: string;
  iconType: 'rocket' | 'award' | 'crown' | 'target' | 'category';
  category?: CollectionCategory;
};

function getCelebrationAccent(type: CelebrationInfo['iconType']): string {
  switch (type) {
    case 'target':
      return '#5AC8FA';
    case 'award':
    case 'crown':
      return '#FFD700';
    case 'rocket':
    case 'category':
    default:
      return '#BF5AF2';
  }
}

function CelebrationVectorIcon({ type, category }: { type: CelebrationInfo['iconType']; category?: CollectionCategory }) {
  const accent = getCelebrationAccent(type);
  if (type === 'category' && category) {
    return <CategoryVectorIcon category={category} size={40} color={accent} />;
  }
  switch (type) {
    case 'rocket':
      return <Ionicons name="rocket-sharp" size={40} color={accent} />;
    case 'award':
      return <FontAwesome5 name="award" size={38} color={accent} />;
    case 'crown':
      return <FontAwesome5 name="crown" size={38} color={accent} />;
    case 'target':
    default:
      return <FontAwesome5 name="crosshairs" size={36} color={accent} />;
  }
}

// A single Journey card — title, category badge, linked-Goal progress mirror
// (if any), and item-completion count. Extracted so it can render both
// nested under its Goal's Pillar section and, for goal-less Journeys, in the
// standalone "Other Journeys" section, without duplicating the ~45 lines.
function JourneyRow({
  collection,
  items,
  goals,
  updateCollection,
  onOpen,
  nested = false,
}: {
  collection: Collection;
  items: CollectionItem[];
  goals: Goal[];
  updateCollection: (id: string, updates: { title?: string }) => void;
  onOpen: (id: string) => void;
  // True when rendered directly under its Goal's own card — that card
  // already shows the goal name + full progress, so the pill/mirror below
  // would just repeat it. Standalone Journeys (no goal link) keep both.
  nested?: boolean;
}) {
  const collectionItems = items.filter(i => i.collectionId === collection.id);
  const completedCount = collectionItems.filter(i => i.completed).length;
  const progress = collectionItems.length > 0 ? Math.round((completedCount / collectionItems.length) * 100) : 0;
  const linkedGoal = goals.find(g => g.id === collection.goalId);
  const isFullyComplete = progress === 100 && collectionItems.length > 0;

  // Mirrors the linked Goal's own progress (from Tasks/subtasks cascading up
  // via goalId) — a Journey has no progress of its own, so this surfaces the
  // Goal it actually feeds right where tasks get created.
  const isGoalUnits = linkedGoal?.metricType === 'units';
  const goalCompleted = linkedGoal ? (isGoalUnits ? (linkedGoal.completedMetric || 0) : linkedGoal.completedMinutes) : 0;
  const goalTarget = linkedGoal ? (isGoalUnits ? (linkedGoal.targetMetric || 0) : linkedGoal.targetMinutes) : 0;
  const goalPct = goalTarget > 0 ? Math.min(100, Math.round((goalCompleted / goalTarget) * 100)) : 0;
  const goalProgressLabel = isGoalUnits
    ? `${goalCompleted}/${goalTarget}${linkedGoal?.unitLabel ? ` ${linkedGoal.unitLabel}` : ''}`
    : `${(goalCompleted / 60).toFixed(1)}/${(goalTarget / 60).toFixed(1)}h`;

  return (
    <Pressable
      onPress={() => onOpen(collection.id)}
      style={{ marginBottom: 10, backgroundColor: '#1C1C1E', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: isFullyComplete ? '#BF5AF255' : '#2C2C2E', shadowColor: isFullyComplete ? '#BF5AF2' : '#000', shadowRadius: 6, shadowOpacity: isFullyComplete ? 0.2 : 0.08, flexDirection: 'row', alignItems: 'center' }}
    >
      <View style={{ backgroundColor: '#BF5AF215', width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#BF5AF233' }}>
        <CategoryVectorIcon category={collection.category} size={15} color="#BF5AF2" />
      </View>

      <View style={{ flex: 1, marginRight: 8 }}>
        <EditableText
          value={collection.title}
          onSave={(title) => updateCollection(collection.id, { title })}
          textStyle={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 3 }}>
          <View style={{ backgroundColor: '#2C2C2E', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginRight: 6 }}>
            <Text style={{ color: '#BF5AF2', fontSize: 10, textTransform: 'uppercase', fontWeight: '700' }}>
              {collection.category}
            </Text>
          </View>
          {linkedGoal && !nested && (
            <View style={{ backgroundColor: '#5AC8FA15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: '#5AC8FA44', flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome5 name="bullseye" size={9} color="#5AC8FA" style={{ marginRight: 4 }} />
              <Text style={{ color: '#5AC8FA', fontSize: 10, fontWeight: '700' }}>{linkedGoal.title}</Text>
            </View>
          )}
        </View>
        {linkedGoal && !nested && (
          <View style={{ marginTop: 6 }}>
            <AnimatedProgressBar progress={goalPct} color="#5AC8FA" height={4} />
            <Text style={{ color: '#8E8E93', fontSize: 10, marginTop: 3 }}>{goalProgressLabel} toward goal · {goalPct}%</Text>
          </View>
        )}
      </View>

      <Text style={{ color: isFullyComplete ? '#30D158' : '#FFF', fontSize: 13, fontWeight: '700', marginRight: 10 }}>
        {completedCount}/{collectionItems.length} ({progress}%)
      </Text>

      <Pressable onPress={() => onOpen(collection.id)} style={{ padding: 6, backgroundColor: '#2C2C2E', borderRadius: 8 }}>
        <Ionicons name="pencil" size={14} color="#8E8E93" />
      </Pressable>
    </Pressable>
  );
}

export default function CollectionsScreen() {
  const {
    collections,
    waypoints,
    items,
    addCollection,
    updateCollection,
    toggleItemCompletion,
  } = useCollectionStore();

  const { goals, addGoal, deleteGoal } = useGoalStore();
  const { pillars, addTask } = useTaskStore();
  const activePillars = pillars.filter(p => !p.isArchived);
  const { triggerConfetti } = useConfettiStore();
  const { launchTimer, blockedTimerModal } = useTimerLauncher();

  // Goal Quick Start — creates a task for the picked Goal/sub-goal and
  // immediately starts its timer (moved here from Dashboard along with Goals).
  const [quickStartGoal, setQuickStartGoal] = useState<Goal | null>(null);
  const handleQuickStart = (title: string, tagId: string, targetId: string, minutes: number) => {
    const newTaskId = addTask({
      title,
      tagId,
      estimatedMinutes: minutes,
      goalId: targetId,
      isIcebox: false,
    });
    launchTimer(newTaskId, minutes);
  };

  // Celebration feedback modal
  const [celebrationInfo, setCelebrationInfo] = useState<CelebrationInfo | null>(null);

  // Chain-legibility toast (shown when a completed item feeds a Goal chain)
  const [chainToastVisible, setChainToastVisible] = useState(false);
  const [chainToastTrail, setChainToastTrail] = useState<string[]>([]);

  // Journey Detail — full-screen view (editing, Waypoints/Items management,
  // linked-Tasks lookup), replaces the old separate edit-Journey popup.
  const [detailJourneyId, setDetailJourneyId] = useState<string | null>(null);
  const [journeyTitle, setJourneyTitle] = useState('');
  const [journeyCategory, setJourneyCategory] = useState<CollectionCategory>('books');
  const [journeyValidationError, setJourneyValidationError] = useState('');

  // Journey's Goal link — goal creation is Journey-only, so this modal is
  // also the only place a Goal gets created: None / link an existing one /
  // create a brand new one inline (title/track-by/target/horizon/chain-parent).
  const [journeyLinkMode, setJourneyLinkMode] = useState<JourneyLinkMode>('none');
  const [selectedMacroId, setSelectedMacroId] = useState('');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalMetricType, setNewGoalMetricType] = useState<'minutes' | 'units'>('minutes');
  const [newGoalTargetHours, setNewGoalTargetHours] = useState('');
  const [newGoalTargetCount, setNewGoalTargetCount] = useState('');
  const [newGoalUnitLabel, setNewGoalUnitLabel] = useState('');
  const [newGoalHorizon, setNewGoalHorizon] = useState<'monthly' | 'yearly'>('monthly');
  const [newGoalParentId, setNewGoalParentId] = useState('');
  const [newGoalPillarId, setNewGoalPillarId] = useState('');

  // Narrows the Pillar -> Goal -> Journey hierarchy below to a single Pillar.
  // '' = "All" (everything, unchanged).
  const [journeyPillarFilter, setJourneyPillarFilter] = useState('');

  // New Journey — collapsible inline form (no modal). Shares all the state
  // above (journeyTitle, journeyCategory, journeyLinkMode, newGoal*) and
  // handleSaveJourney with the Edit modal below; only the container + open
  // state differ.
  const [isNewJourneyExpanded, setIsNewJourneyExpanded] = useState(false);
  const [newJourneyOpenPill, setNewJourneyOpenPill] = useState<'category' | 'goal' | null>(null);

  const categories: CollectionCategory[] = ['books', 'games', 'stocks', 'fitness', 'courses', 'travel', 'general'];

  // Journey CRUD
  const handleOpenNewJourney = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setJourneyTitle('');
    setJourneyCategory('general'); // matches collectionStore's addCollection default
    setJourneyValidationError('');
    setJourneyLinkMode('none');
    setSelectedMacroId('');
    setNewGoalTitle('');
    setNewGoalMetricType('minutes');
    setNewGoalTargetHours('');
    setNewGoalTargetCount('');
    setNewGoalUnitLabel('');
    setNewGoalHorizon('monthly');
    setNewGoalParentId('');
    setNewGoalPillarId('');
    setNewJourneyOpenPill(null);
    setIsNewJourneyExpanded(true);
  };

  const handleCancelNewJourney = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsNewJourneyExpanded(false);
    setNewJourneyOpenPill(null);
  };

  const handleSaveJourney = () => {
    if (!journeyTitle.trim()) return;
    setJourneyValidationError('');

    let linkedGoalId: string | undefined;

    if (journeyLinkMode === 'existing') {
      linkedGoalId = selectedMacroId || undefined;
    } else if (journeyLinkMode === 'new') {
      if (!newGoalTitle.trim()) {
        setJourneyValidationError('Goal title is required');
        return;
      }
      if (!newGoalPillarId) {
        setJourneyValidationError('Pick a Pillar for this Goal');
        return;
      }
      if (newGoalMetricType === 'units') {
        const count = parseInt(newGoalTargetCount, 10);
        if (isNaN(count) || count <= 0) {
          setJourneyValidationError('Target count must be a valid positive number');
          return;
        }
        linkedGoalId = addGoal({
          title: newGoalTitle.trim(),
          horizon: newGoalHorizon,
          targetMinutes: 0,
          metricType: 'units',
          targetMetric: count,
          unitLabel: newGoalUnitLabel.trim() || undefined,
          parentId: newGoalParentId || undefined,
          pillarId: newGoalPillarId,
        });
      } else {
        const hours = parseFloat(newGoalTargetHours);
        if (isNaN(hours) || hours <= 0) {
          setJourneyValidationError('Target hours must be a valid positive number');
          return;
        }
        linkedGoalId = addGoal({
          title: newGoalTitle.trim(),
          horizon: newGoalHorizon,
          targetMinutes: Math.round(hours * 60),
          parentId: newGoalParentId || undefined,
          pillarId: newGoalPillarId,
        });
      }
    }

    addCollection({
      title: journeyTitle.trim(),
      category: journeyCategory,
      goalId: linkedGoalId,
    });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsNewJourneyExpanded(false);
    setNewJourneyOpenPill(null);

    // Trigger celebration feedback
    triggerConfetti();
    feedback('select');
    const linkedGoal = goals.find(g => g.id === linkedGoalId) || (journeyLinkMode === 'new' ? { type: 'productive' } : undefined);
    const isEntertainment = linkedGoal?.type === 'entertainment';
    setCelebrationInfo({
      title: 'Journey started',
      subtitle: `"${journeyTitle.trim()}" is live and tracking.`,
      iconType: 'rocket',
      category: journeyCategory,
      payoutText: isEntertainment
        ? 'Milestone rewards unlock as you progress — already earned, guilt-free.'
        : 'Earn milestone cash rewards as you make progress.',
      badgeLabel: 'JOURNEY CREATED',
    });
  };

  const handleToggleItem = (itemId: string, collectionId: string, waypointId?: string) => {
    const targetItem = items.find(i => i.id === itemId);
    if (!targetItem) return;

    const wasCompleted = targetItem.completed;
    toggleItemCompletion(itemId);

    // If completing (not uncompleting), check if it completes a Waypoint or Journey!
    if (!wasCompleted) {
      feedback('taskComplete');

      // Surface the linked Goal chain reacting, if any (Phase 4 legibility).
      const collection = collections.find(c => c.id === collectionId);
      if (collection?.goalId) {
        const trail = getChainTrail(goals, collection.goalId);
        if (trail.length > 1) {
          setChainToastTrail(trail);
          setChainToastVisible(true);
        }
      }

      if (waypointId) {
        const wpItems = items.filter(i => i.waypointId === waypointId);
        const wpCompletedCount = wpItems.filter(i => i.completed).length + 1; // including current
        const wp = waypoints.find(w => w.id === waypointId);
        const targetVal = wp?.targetMetric || wpItems.length;

        if (wpCompletedCount >= targetVal && targetVal > 0) {
          triggerConfetti();
          feedback('milestone');
          setCelebrationInfo({
            title: 'Waypoint complete',
            subtitle: `You finished every item in "${wp?.title || 'Waypoint'}".`,
            iconType: 'award',
            payoutText: 'Milestone reward added. Progress synced to your Goal.',
            badgeLabel: 'WAYPOINT COMPLETE',
          });
          return;
        }
      }

      // Check entire Journey completion
      const colItems = items.filter(i => i.collectionId === collectionId);
      const colCompletedCount = colItems.filter(i => i.completed).length + 1;
      if (colCompletedCount >= colItems.length && colItems.length > 0) {
        triggerConfetti();
        feedback('milestone');
        setCelebrationInfo({
          title: 'Journey complete',
          subtitle: `You finished every task in this journey. Well done.`,
          iconType: 'crown',
          payoutText: 'Journey added to your record. Keep the momentum going.',
          badgeLabel: 'JOURNEY COMPLETE',
        });
      }
    }
  };

  const totalJourneys = collections.length;
  const totalItems = items.length;
  const completedItems = items.filter(i => i.completed).length;
  const overallCompletionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Eligible chain-parents for a Goal being created inline (root goals only,
  // same type/metricType, no cycles) — mirrors the old Profile creation form.
  const eligibleParents = journeyLinkMode === 'new'
    ? getEligibleParents(goals, null, 'productive', newGoalMetricType, newGoalUnitLabel)
    : [];

  const celebrationAccent = celebrationInfo ? getCelebrationAccent(celebrationInfo.iconType) : '#BF5AF2';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }} edges={['top']}>
      <RewardToast
        visible={chainToastVisible}
        message="Progress logged"
        chainTrail={chainToastTrail}
        onDismiss={() => setChainToastVisible(false)}
      />

      {/* Whole screen scrolls as one unit — the collapsible New Journey form
          below can grow tall enough on its own (once its "new goal"
          sub-fields appear) to exceed the viewport, so it can't live in a
          static, non-scrolling header the way it did before. */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Executive Summary Header Stats Bar (Shadcn-inspired) */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginBottom: 16 }}>Journeys</Text>

        {/* Shadcn Stats Grid */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, backgroundColor: '#1C1C1E', borderRadius: 16, padding: 16, marginRight: 8, borderWidth: 1, borderColor: '#2C2C2E' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: '#8E8E93', fontSize: 13, fontWeight: '600' }}>Total Journeys</Text>
              <Ionicons name="map-outline" size={16} color="#8E8E93" />
            </View>
            <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '800' }}>{totalJourneys}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#1C1C1E', borderRadius: 16, padding: 16, marginLeft: 8, borderWidth: 1, borderColor: '#2C2C2E' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: '#8E8E93', fontSize: 13, fontWeight: '600' }}>Completion</Text>
              <Ionicons name="stats-chart" size={16} color="#8E8E93" />
            </View>
            <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '800' }}>{overallCompletionRate}%</Text>
          </View>
        </View>
      </View>

      {/* New Journey — collapsible inline form, no modal */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Pressable
          onPress={isNewJourneyExpanded ? handleCancelNewJourney : handleOpenNewJourney}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2C2C2E', borderRadius: 16, padding: 14 }}
        >
          <Ionicons name="add-circle" size={18} color="#BF5AF2" style={{ marginRight: 8 }} />
          <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700', flex: 1 }}>New Journey</Text>
          <Ionicons name={isNewJourneyExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#8E8E93" />
        </Pressable>

        {isNewJourneyExpanded && (
          <View style={{ marginTop: 8, backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2C2C2E', borderRadius: 16, padding: 16 }}>
            {journeyValidationError ? (
              <View style={{ backgroundColor: 'rgba(255,69,58,0.15)', borderColor: 'rgba(255,69,58,0.4)', borderWidth: 1, padding: 12, borderRadius: 12, marginBottom: 14 }}>
                <Text style={{ color: '#FF453A', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{journeyValidationError}</Text>
              </View>
            ) : null}

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Journey Title</Text>
            <PremiumInput
              style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: '#2C2C2E' }}
              placeholder="e.g., Reading List 2026, Marathon Training"
              placeholderTextColor="#5C5C5E"
              value={journeyTitle}
              onChangeText={setJourneyTitle}
              autoFocus
            />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              <PillPicker
                label={`Category: ${journeyCategory.charAt(0).toUpperCase()}${journeyCategory.slice(1)}`}
                options={categories.map(c => ({ id: c, label: `${c.charAt(0).toUpperCase()}${c.slice(1)}` }))}
                selectedId={journeyCategory}
                onSelect={(id) => { setJourneyCategory(id as CollectionCategory); setNewJourneyOpenPill(null); }}
                open={newJourneyOpenPill === 'category'}
                onToggle={() => setNewJourneyOpenPill(p => (p === 'category' ? null : 'category'))}
              />

              <PillPicker
                label={`Goal: ${
                  journeyLinkMode === 'existing'
                    ? (goals.find(s => s.id === selectedMacroId)?.title || 'Select...')
                    : journeyLinkMode === 'new'
                    ? (newGoalTitle.trim() ? `New — ${newGoalTitle.trim()}` : 'New Goal...')
                    : 'None'
                }`}
                options={[{ id: '', label: 'None' }, ...goals.map(s => ({ id: s.id, label: s.title }))]}
                selectedId={journeyLinkMode === 'existing' ? selectedMacroId : ''}
                onSelect={(id) => {
                  feedback('select');
                  setNewJourneyOpenPill(null);
                  if (id === '') {
                    setJourneyLinkMode('none');
                    setSelectedMacroId('');
                  } else {
                    setJourneyLinkMode('existing');
                    setSelectedMacroId(id);
                  }
                }}
                open={newJourneyOpenPill === 'goal'}
                onToggle={() => setNewJourneyOpenPill(p => (p === 'goal' ? null : 'goal'))}
                footerAction={{
                  label: '+ Create New Goal...',
                  onPress: () => { setJourneyLinkMode('new'); setNewJourneyOpenPill(null); },
                }}
              />
            </View>

            {journeyLinkMode === 'new' && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Goal Title</Text>
                <PremiumInput
                  style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: '#2C2C2E' }}
                  placeholder="e.g. Hike 100 miles, Write a Novel, Learn French"
                  placeholderTextColor="#5C5C5E"
                  value={newGoalTitle}
                  onChangeText={setNewGoalTitle}
                />

                <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Pillar</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  {activePillars.map((pillar) => {
                    const isSelected = newGoalPillarId === pillar.id;
                    const color = getPillarColor(pillar.id, pillars);
                    return (
                      <Pressable
                        key={pillar.id}
                        onPress={() => setNewGoalPillarId(pillar.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 9999,
                          borderWidth: 1,
                          marginRight: 8,
                          backgroundColor: isSelected ? `${color}26` : '#151517',
                          borderColor: isSelected ? `${color}66` : '#2C2C2E',
                        }}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 6 }} />
                        <Text style={{ color: isSelected ? '#FFFFFF' : '#8E8E93', fontSize: 13, fontWeight: isSelected ? '700' : '500' }}>{pillar.name}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Track By</Text>
                <View style={{ backgroundColor: '#151517', borderColor: '#2C2C2E', borderWidth: 1 }} className="flex-row p-1 rounded-xl mb-4">
                  {([
                    { key: 'minutes' as const, label: 'Time' },
                    { key: 'units' as const, label: 'Count' },
                  ]).map(({ key, label }) => {
                    const isActive = newGoalMetricType === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setNewGoalMetricType(key)}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 8,
                          alignItems: 'center',
                          backgroundColor: isActive ? 'rgba(191,90,242,0.15)' : 'transparent',
                        }}
                      >
                        <Text style={{ color: isActive ? '#FFFFFF' : '#8E8E93', fontWeight: isActive ? '700' : '500', fontSize: 13 }}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>
                  {newGoalMetricType === 'units' ? 'Target Count' : 'Target Hours'}
                </Text>
                {newGoalMetricType === 'units' ? (
                  <>
                    <PremiumInput
                      style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, fontSize: 15, marginBottom: 8, borderWidth: 1, borderColor: '#2C2C2E' }}
                      placeholder="e.g. 20 (books, games, workouts...)"
                      placeholderTextColor="#5C5C5E"
                      keyboardType="numeric"
                      value={newGoalTargetCount}
                      onChangeText={setNewGoalTargetCount}
                    />
                    <PremiumInput
                      style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: '#2C2C2E' }}
                      placeholder="Unit label (e.g. pages, reps, km)"
                      placeholderTextColor="#5C5C5E"
                      value={newGoalUnitLabel}
                      onChangeText={setNewGoalUnitLabel}
                    />
                  </>
                ) : (
                  <PremiumInput
                    style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: '#2C2C2E' }}
                    placeholder="e.g. 50"
                    placeholderTextColor="#5C5C5E"
                    keyboardType="numeric"
                    value={newGoalTargetHours}
                    onChangeText={setNewGoalTargetHours}
                  />
                )}

                <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Time Horizon</Text>
                <View style={{ backgroundColor: '#151517', borderColor: '#2C2C2E', borderWidth: 1 }} className="flex-row p-1 rounded-xl mb-4">
                  {(['monthly', 'yearly'] as const).map((h) => {
                    const isActive = newGoalHorizon === h;
                    return (
                      <Pressable
                        key={h}
                        onPress={() => setNewGoalHorizon(h)}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 8,
                          alignItems: 'center',
                          backgroundColor: isActive ? 'rgba(191,90,242,0.15)' : 'transparent',
                        }}
                      >
                        <Text style={{ color: isActive ? '#FFFFFF' : '#8E8E93', fontWeight: isActive ? '700' : '500', fontSize: 13, textTransform: 'capitalize' }}>{h}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {eligibleParents.length > 0 && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Contributes To (Optional)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Pressable
                        onPress={() => setNewGoalParentId('')}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 9999,
                          borderWidth: 1,
                          marginRight: 8,
                          backgroundColor: !newGoalParentId ? 'rgba(191,90,242,0.15)' : '#151517',
                          borderColor: !newGoalParentId ? 'rgba(191,90,242,0.3)' : '#2C2C2E',
                        }}
                      >
                        <Text style={{ color: !newGoalParentId ? '#FFFFFF' : '#8E8E93', fontSize: 13, fontWeight: !newGoalParentId ? '700' : '500' }}>None</Text>
                      </Pressable>
                      {eligibleParents.map((p) => {
                        const isSelected = newGoalParentId === p.id;
                        return (
                          <Pressable
                            key={p.id}
                            onPress={() => setNewGoalParentId(p.id)}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 10,
                              borderRadius: 9999,
                              borderWidth: 1,
                              marginRight: 8,
                              backgroundColor: isSelected ? 'rgba(191,90,242,0.15)' : '#151517',
                              borderColor: isSelected ? 'rgba(191,90,242,0.3)' : '#2C2C2E',
                            }}
                          >
                            <Text style={{ color: isSelected ? '#FFFFFF' : '#8E8E93', fontSize: 13, fontWeight: isSelected ? '700' : '500' }}>{p.title}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={handleCancelNewJourney}
                style={{ flex: 1, backgroundColor: '#2C2C2E', borderRadius: 14, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <PrimaryButton onPress={handleSaveJourney} title="Create Journey" size="sm" style={{ width: '100%' }} />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Pillar -> Goal -> Journey Hierarchy */}
      <View style={{ paddingHorizontal: 16 }}>
        {activePillars.length > 0 && (
          <View style={{ backgroundColor: '#1C1C1E', borderColor: '#2C2C2E', borderWidth: 1, borderRadius: 12, marginBottom: 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 4 }}>
              <Pressable
                onPress={() => setJourneyPillarFilter('')}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 8,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: journeyPillarFilter === '' ? '#2C2C2E' : 'transparent',
                  borderWidth: journeyPillarFilter === '' ? 1 : 0,
                  borderColor: journeyPillarFilter === '' ? '#BF5AF2' : 'transparent',
                }}
              >
                <Text style={{ fontWeight: journeyPillarFilter === '' ? '700' : '500', fontSize: 13, color: journeyPillarFilter === '' ? '#FFFFFF' : '#8E8E93' }}>
                  All
                </Text>
              </Pressable>
              {activePillars.map((pillar) => {
                const isActive = journeyPillarFilter === pillar.id;
                const pillarColor = getPillarColor(pillar.id, pillars);
                return (
                  <Pressable
                    key={pillar.id}
                    onPress={() => setJourneyPillarFilter(pillar.id)}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: isActive ? '#2C2C2E' : 'transparent',
                      borderWidth: isActive ? 1 : 0,
                      borderColor: isActive ? pillarColor : 'transparent',
                    }}
                  >
                    <Text style={{ fontWeight: isActive ? '700' : '500', fontSize: 13, color: isActive ? '#FFFFFF' : '#8E8E93' }}>
                      {pillar.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {collections.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40, backgroundColor: '#1C1C1E', borderRadius: 20, padding: 32, borderWidth: 1, borderColor: '#2C2C2E' }}>
            <View style={{ backgroundColor: '#BF5AF222', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <FontAwesome5 name="compass" size={32} color="#BF5AF2" />
            </View>
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700', textAlign: 'center' }}>No Active Journeys</Text>
            <Text style={{ color: '#8E8E93', marginTop: 8, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              Launch your first Journey to track reading targets, fitness goals, and multi-month discipline milestones!
            </Text>
            <PrimaryButton
              onPress={handleOpenNewJourney}
              title="+ Launch First Journey"
              style={{ marginTop: 20 }}
            />
          </View>
        ) : (
          <>
            {(() => {
              const productiveRootGoals = goals.filter(g => !g.parentId && (!g.type || g.type === 'productive'));
              const entertainmentRootGoals = goals.filter(g => !g.parentId && g.type === 'entertainment');
              const unassignedGoals = productiveRootGoals.filter(g => !g.pillarId);
              const standaloneJourneys = collections.filter(c => !c.goalId || !goals.find(g => g.id === c.goalId));

              const renderGoalWithJourneys = (goal: Goal, accentColor: string, extraProps: Partial<React.ComponentProps<typeof AnimatedGoalCard>> = {}) => {
                const subGoals = goals.filter(g => g.parentId === goal.id);
                const feedingIds = new Set([goal.id, ...subGoals.map(sg => sg.id)]);
                const linkedJourneys = collections.filter(c => c.goalId && feedingIds.has(c.goalId));
                return (
                  <View key={goal.id} style={{ marginBottom: 16 }}>
                    <AnimatedGoalCard
                      goal={goal}
                      subGoals={subGoals}
                      accentColor={accentColor}
                      onQuickStart={setQuickStartGoal}
                      {...extraProps}
                    />
                    {linkedJourneys.length > 0 && (
                      <View style={{ marginTop: 4, marginLeft: 12 }}>
                        {linkedJourneys.map(c => (
                          <JourneyRow key={c.id} collection={c} items={items} goals={goals} updateCollection={updateCollection} onOpen={setDetailJourneyId} nested />
                        ))}
                      </View>
                    )}
                  </View>
                );
              };

              return (
                <>
                  {activePillars.map(pillar => {
                    if (journeyPillarFilter && journeyPillarFilter !== pillar.id) return null;
                    const pillarGoals = productiveRootGoals.filter(g => g.pillarId === pillar.id);
                    if (pillarGoals.length === 0) return null;
                    const pillarColor = getPillarColor(pillar.id, pillars);
                    return (
                      <View key={pillar.id} style={{ marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: pillarColor, marginRight: 8 }} />
                          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{pillar.name}</Text>
                        </View>
                        {pillarGoals.map(g => renderGoalWithJourneys(g, '#BF5AF2'))}
                      </View>
                    );
                  })}

                  {!journeyPillarFilter && unassignedGoals.length > 0 && (
                    <View style={{ marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: FALLBACK_COLOR, marginRight: 8 }} />
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>Unassigned</Text>
                      </View>
                      {unassignedGoals.map(g => renderGoalWithJourneys(g, '#BF5AF2'))}
                    </View>
                  )}

                  {!journeyPillarFilter && entertainmentRootGoals.length > 0 && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ color: '#5AC8FA', fontSize: 16, fontWeight: '800', marginBottom: 12 }}>Entertainment Projects</Text>
                      {entertainmentRootGoals.map(g => renderGoalWithJourneys(g, '#5AC8FA', { showIcon: true, iconName: 'game-controller' }))}
                    </View>
                  )}

                  {!journeyPillarFilter && standaloneJourneys.length > 0 && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ color: '#8E8E93', fontSize: 16, fontWeight: '800', marginBottom: 12 }}>Other Journeys</Text>
                      {standaloneJourneys.map(c => (
                        <JourneyRow key={c.id} collection={c} items={items} goals={goals} updateCollection={updateCollection} onOpen={setDetailJourneyId} />
                      ))}
                    </View>
                  )}
                </>
              );
            })()}
          </>
        )}
      </View>
      </ScrollView>

      {/* Celebration feedback modal */}
      <Modal visible={!!celebrationInfo} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View
            style={{
              backgroundColor: '#1C1C1E',
              borderRadius: 28,
              paddingTop: 32,
              paddingBottom: 24,
              paddingHorizontal: 26,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              maxWidth: 400,
              width: '100%',
              shadowColor: celebrationAccent,
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.35,
              shadowRadius: 32,
              elevation: 20,
            }}
          >
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: `${celebrationAccent}14`,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: `${celebrationAccent}26`,
                  borderWidth: 1,
                  borderColor: `${celebrationAccent}40`,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {celebrationInfo && <CelebrationVectorIcon type={celebrationInfo.iconType} category={celebrationInfo.category} />}
              </View>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: `${celebrationAccent}1A`,
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 20,
                marginBottom: 14,
              }}
            >
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: celebrationAccent, marginRight: 6 }} />
              <Text style={{ color: celebrationAccent, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>
                {celebrationInfo?.badgeLabel}
              </Text>
            </View>
            <Text style={{ color: '#FFF', fontSize: 21, fontWeight: '800', letterSpacing: 0.1, textAlign: 'center', marginBottom: 8 }}>
              {celebrationInfo?.title}
            </Text>
            <Text style={{ color: '#8E8E93', fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20, paddingHorizontal: 8 }}>
              {celebrationInfo?.subtitle}
            </Text>
            <View
              style={{
                backgroundColor: '#232326',
                paddingVertical: 13,
                paddingHorizontal: 14,
                borderRadius: 14,
                width: '100%',
                marginBottom: 22,
                borderLeftWidth: 3,
                borderLeftColor: celebrationAccent,
              }}
            >
              <Text style={{ color: celebrationAccent, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                {celebrationInfo?.payoutText}
              </Text>
            </View>
            <Pressable
              onPress={() => setCelebrationInfo(null)}
              style={{
                backgroundColor: celebrationAccent,
                width: '100%',
                paddingVertical: 15,
                borderRadius: 16,
                alignItems: 'center',
                shadowColor: celebrationAccent,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Text style={{ color: celebrationAccent === '#FFD700' ? '#1C1C1E' : '#FFF', fontSize: 15, fontWeight: '700' }}>
                Continue
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <JourneyDetailModal
        collection={collections.find(c => c.id === detailJourneyId) || null}
        visible={!!detailJourneyId}
        onClose={() => setDetailJourneyId(null)}
        onToggleItem={handleToggleItem}
      />

      {quickStartGoal && (
        <QuickStartModal
          visible={!!quickStartGoal}
          onClose={() => setQuickStartGoal(null)}
          goal={quickStartGoal}
          subGoals={goals.filter(g => g.parentId === quickStartGoal.id)}
          onStart={handleQuickStart}
        />
      )}

      {blockedTimerModal}

    </SafeAreaView>
  );
}
