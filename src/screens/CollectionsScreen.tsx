import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Modal, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCollectionStore, CollectionCategory, Waypoint } from '../store/collectionStore';
import { useSummitStore, getChainTrail, getEligibleParents } from '../store/summitStore';
import { useConfettiStore } from '../store/confettiStore';
import { PrimaryButton } from '../components/PrimaryButton';
import AnimatedProgressBar from '../components/AnimatedProgressBar';
import RewardToast from '../components/RewardToast';
import PillPicker from '../components/PillPicker';
import QuickAddBar from '../components/QuickAddBar';
import EditableText from '../components/EditableText';
import { feedback } from '../utils/feedback';
import { CategoryVectorIcon } from '../utils/categoryIcons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PremiumInput = (props: React.ComponentProps<typeof TextInput>) => (
  <TextInput
    {...props}
    style={[props.style, { outlineStyle: 'none' } as any]}
  />
);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type TimeframeFilter = 'all' | 'year' | 'month';
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

export default function CollectionsScreen() {
  const {
    collections,
    waypoints,
    items,
    addCollection,
    updateCollection,
    deleteCollection,
    addWaypoint,
    updateWaypoint,
    deleteWaypoint,
    addItem,
    updateItem,
    toggleItemCompletion,
    deleteItem,
  } = useCollectionStore();

  const { summits, addSummit, deleteSummit } = useSummitStore();
  const { triggerConfetti } = useConfettiStore();

  // Timeframe filter state
  const [timeframeFilter, setTimeframeFilter] = useState<TimeframeFilter>('all');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Celebration feedback modal
  const [celebrationInfo, setCelebrationInfo] = useState<CelebrationInfo | null>(null);

  // Chain-legibility toast (shown when a completed item feeds a Summit chain)
  const [chainToastVisible, setChainToastVisible] = useState(false);
  const [chainToastTrail, setChainToastTrail] = useState<string[]>([]);

  // Create/Edit Journey Modal
  const [isJourneyModalOpen, setIsJourneyModalOpen] = useState(false);
  const [editingJourneyId, setEditingJourneyId] = useState<string | null>(null);
  const [journeyTitle, setJourneyTitle] = useState('');
  const [journeyCategory, setJourneyCategory] = useState<CollectionCategory>('books');
  const [journeyValidationError, setJourneyValidationError] = useState('');

  // Journey's Summit link — goal creation is Journey-only, so this modal is
  // also the only place a Summit gets created: None / link an existing one /
  // create a brand new one inline (title/track-by/target/horizon/chain-parent).
  const [journeyLinkMode, setJourneyLinkMode] = useState<JourneyLinkMode>('none');
  const [selectedMacroId, setSelectedMacroId] = useState('');
  const [newSummitTitle, setNewSummitTitle] = useState('');
  const [newSummitMetricType, setNewSummitMetricType] = useState<'minutes' | 'units'>('minutes');
  const [newSummitTargetHours, setNewSummitTargetHours] = useState('');
  const [newSummitTargetCount, setNewSummitTargetCount] = useState('');
  const [newSummitHorizon, setNewSummitHorizon] = useState<'monthly' | 'yearly'>('monthly');
  const [newSummitParentId, setNewSummitParentId] = useState('');

  // New Journey — collapsible inline form (no modal). Shares all the state
  // above (journeyTitle, journeyCategory, journeyLinkMode, newSummit*) and
  // handleSaveJourney with the Edit modal below; only the container + open
  // state differ.
  const [isNewJourneyExpanded, setIsNewJourneyExpanded] = useState(false);
  const [newJourneyOpenPill, setNewJourneyOpenPill] = useState<'category' | 'goal' | null>(null);

  // Delete Journey Confirmation Modal
  const [deletingJourneyId, setDeletingJourneyId] = useState<string | null>(null);

  // Edit Waypoint Modal (creation now happens via the quick-add bar below —
  // this only ever opens from the "..." edit affordance now)
  const [isWaypointModalOpen, setIsWaypointModalOpen] = useState(false);
  const [editingWaypointId, setEditingWaypointId] = useState<string | null>(null);
  const [activeWaypointCollectionId, setActiveWaypointCollectionId] = useState('');
  const [waypointTitle, setWaypointTitle] = useState('');
  const [waypointTargetMetric, setWaypointTargetMetric] = useState('');
  const [waypointYear, setWaypointYear] = useState<string>(currentYear.toString());
  const [waypointMonth, setWaypointMonth] = useState<string>(currentMonth.toString());

  // Waypoint quick-add bar — bare title only; Target/Year/Month default
  // unset and become row pills afterward. Keyed by collection id (one bar
  // per journey's waypoints footer).
  const [waypointQuickAddTitle, setWaypointQuickAddTitle] = useState<Record<string, string>>({});
  // Row-level Target/Year/Month pills for an existing waypoint (post-creation
  // correction), keyed by waypoint id.
  const [waypointRowOpenField, setWaypointRowOpenField] = useState<Record<string, 'target' | 'year' | 'month' | null>>({});

  // Item quick-add bars — bare title only; keyed by waypoint id (per-waypoint
  // "Add Task" bar) or by collection id (journey-footer "+ Task" bar, root items).
  const [itemQuickAddTitleByWaypoint, setItemQuickAddTitleByWaypoint] = useState<Record<string, string>>({});
  const [itemQuickAddTitleByJourney, setItemQuickAddTitleByJourney] = useState<Record<string, string>>({});

  // Accordion State
  const [expandedWaypoints, setExpandedWaypoints] = useState<Record<string, boolean>>({});
  const toggleWaypoint = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    feedback('expand');
    setExpandedWaypoints(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Journey-level Accordion State (collapsed by default — compact list view)
  const [expandedJourneys, setExpandedJourneys] = useState<Record<string, boolean>>({});
  const toggleJourney = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    feedback('expand');
    setExpandedJourneys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Per-journey-row Category/Goal pills (post-creation correction, in the
  // expanded accordion area) — keyed by journey id since these rows aren't
  // their own component.
  const [journeyRowOpenPill, setJourneyRowOpenPill] = useState<Record<string, 'category' | 'goal' | null>>({});
  const toggleJourneyRowPill = (collectionId: string, pill: 'category' | 'goal') => {
    setJourneyRowOpenPill(prev => ({ ...prev, [collectionId]: prev[collectionId] === pill ? null : pill }));
  };

  const categories: CollectionCategory[] = ['books', 'games', 'stocks', 'fitness', 'courses', 'travel', 'general'];

  // Journey CRUD
  const handleOpenNewJourney = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditingJourneyId(null);
    setJourneyTitle('');
    setJourneyCategory('general'); // matches collectionStore's addCollection default
    setJourneyValidationError('');
    setJourneyLinkMode('none');
    setSelectedMacroId('');
    setNewSummitTitle('');
    setNewSummitMetricType('minutes');
    setNewSummitTargetHours('');
    setNewSummitTargetCount('');
    setNewSummitHorizon('monthly');
    setNewSummitParentId('');
    setNewJourneyOpenPill(null);
    setIsNewJourneyExpanded(true);
  };

  const handleCancelNewJourney = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsNewJourneyExpanded(false);
    setNewJourneyOpenPill(null);
  };

  const handleOpenEditJourney = (cId: string) => {
    const col = collections.find(c => c.id === cId);
    if (!col) return;
    setEditingJourneyId(cId);
    setJourneyTitle(col.title);
    setJourneyCategory(col.category);
    setJourneyValidationError('');
    setJourneyLinkMode(col.summitId ? 'existing' : 'none');
    setSelectedMacroId(col.summitId || '');
    setIsJourneyModalOpen(true);
  };

  const handleSaveJourney = () => {
    if (!journeyTitle.trim()) return;
    setJourneyValidationError('');

    let linkedSummitId: string | undefined;

    if (journeyLinkMode === 'existing') {
      linkedSummitId = selectedMacroId || undefined;
    } else if (journeyLinkMode === 'new') {
      if (!newSummitTitle.trim()) {
        setJourneyValidationError('Summit title is required');
        return;
      }
      if (newSummitMetricType === 'units') {
        const count = parseInt(newSummitTargetCount, 10);
        if (isNaN(count) || count <= 0) {
          setJourneyValidationError('Target count must be a valid positive number');
          return;
        }
        linkedSummitId = addSummit({
          title: newSummitTitle.trim(),
          horizon: newSummitHorizon,
          targetMinutes: 0,
          metricType: 'units',
          targetMetric: count,
          parentId: newSummitParentId || undefined,
        });
      } else {
        const hours = parseFloat(newSummitTargetHours);
        if (isNaN(hours) || hours <= 0) {
          setJourneyValidationError('Target hours must be a valid positive number');
          return;
        }
        linkedSummitId = addSummit({
          title: newSummitTitle.trim(),
          horizon: newSummitHorizon,
          targetMinutes: Math.round(hours * 60),
          parentId: newSummitParentId || undefined,
        });
      }
    }

    if (editingJourneyId) {
      updateCollection(editingJourneyId, {
        title: journeyTitle.trim(),
        category: journeyCategory,
        summitId: linkedSummitId,
      });
      setIsJourneyModalOpen(false);
    } else {
      addCollection({
        title: journeyTitle.trim(),
        category: journeyCategory,
        summitId: linkedSummitId,
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsNewJourneyExpanded(false);
      setNewJourneyOpenPill(null);

      // Trigger celebration feedback
      triggerConfetti();
      feedback('select');
      const linkedGoal = summits.find(g => g.id === linkedSummitId) || (journeyLinkMode === 'new' ? { type: 'productive' } : undefined);
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
    }
  };

  const handleConfirmDeleteJourney = (alsoDeleteSummit: boolean) => {
    if (!deletingJourneyId) return;
    const col = collections.find(c => c.id === deletingJourneyId);
    if (col && col.summitId && alsoDeleteSummit) {
      deleteSummit(col.summitId);
    }
    deleteCollection(deletingJourneyId);
    setDeletingJourneyId(null);
  };

  // Waypoint CRUD — creation is now the quick-add bar (handleQuickAddWaypoint
  // below); this modal only ever opens for editing.
  const handleOpenEditWaypoint = (waypoint: Waypoint) => {
    setActiveWaypointCollectionId(waypoint.collectionId);
    setEditingWaypointId(waypoint.id);
    setWaypointTitle(waypoint.title);
    setWaypointTargetMetric(waypoint.targetMetric ? waypoint.targetMetric.toString() : '');
    setWaypointYear(waypoint.year ? waypoint.year.toString() : '');
    setWaypointMonth(waypoint.month ? waypoint.month.toString() : '');
    setIsWaypointModalOpen(true);
  };

  const handleSaveWaypoint = () => {
    if (!editingWaypointId || !waypointTitle.trim()) return;
    const targetVal = parseInt(waypointTargetMetric, 10);
    const yrVal = parseInt(waypointYear, 10);
    const moVal = parseInt(waypointMonth, 10);

    updateWaypoint(editingWaypointId, {
      title: waypointTitle.trim(),
      targetMetric: isNaN(targetVal) ? undefined : targetVal,
      year: isNaN(yrVal) ? undefined : yrVal,
      month: isNaN(moVal) ? undefined : moVal,
    });
    setIsWaypointModalOpen(false);
  };

  // Bare quick-add — title only; Target/Year/Month default unset and become
  // row pills on the created Waypoint afterward.
  const handleQuickAddWaypoint = (collectionId: string) => {
    const title = (waypointQuickAddTitle[collectionId] || '').trim();
    if (!title) return;

    addWaypoint({ collectionId, title });
    setWaypointQuickAddTitle(prev => ({ ...prev, [collectionId]: '' }));

    triggerConfetti();
    feedback('select');
    setCelebrationInfo({
      title: 'Waypoint added',
      subtitle: `"${title}" added to your journey targets.`,
      iconType: 'target',
      payoutText: 'Set a target, year, or month anytime by tapping its pills.',
      badgeLabel: 'WAYPOINT ADDED',
    });
  };

  // Item quick-add — title only; waypointId is preset when launched from
  // inside an expanded waypoint, otherwise it's a root (General) item.
  const handleQuickAddItem = (collectionId: string, waypointId: string | undefined, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    addItem({
      collectionId,
      waypointId: waypointId || undefined,
      title: trimmed,
      isAddedLater: true,
    });
    feedback('select');
  };

  const handleToggleItem = (itemId: string, collectionId: string, waypointId?: string) => {
    const targetItem = items.find(i => i.id === itemId);
    if (!targetItem) return;

    const wasCompleted = targetItem.completed;
    toggleItemCompletion(itemId);

    // If completing (not uncompleting), check if it completes a Waypoint or Journey!
    if (!wasCompleted) {
      feedback('taskComplete');

      // Surface the linked Summit chain reacting, if any (Phase 4 legibility).
      const collection = collections.find(c => c.id === collectionId);
      if (collection?.summitId) {
        const trail = getChainTrail(summits, collection.summitId);
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
            payoutText: 'Milestone reward added. Progress synced to your Summit.',
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

  // Filter collections and waypoints by timeframe filter
  const filteredWaypoints = (waypoints || []).filter(wp => {
    if (timeframeFilter === 'all') return true;
    if (timeframeFilter === 'year') return wp.year === currentYear;
    if (timeframeFilter === 'month') return wp.year === currentYear && wp.month === currentMonth;
    return true;
  });

  const totalJourneys = collections.length;
  const activeWaypointsCount = filteredWaypoints.length;
  const totalItems = items.length;
  const completedItems = items.filter(i => i.completed).length;
  const overallCompletionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Eligible chain-parents for a Summit being created inline (root goals only,
  // same type/metricType, no cycles) — mirrors the old Profile creation form.
  const eligibleParents = journeyLinkMode === 'new'
    ? getEligibleParents(summits, null, 'productive', newSummitMetricType)
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

      {/* Timeframe Filter Tabs (Shadcn TabsList) */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16 }}>
        <View style={{ backgroundColor: '#1C1C1E', borderRadius: 12, padding: 4, flexDirection: 'row', borderWidth: 1, borderColor: '#2C2C2E' }}>
          {(['all', 'year', 'month'] as TimeframeFilter[]).map((filter) => {
            const isActive = timeframeFilter === filter;
            const label = filter === 'all' ? 'All Journeys' : filter === 'year' ? currentYear.toString() : `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;
            return (
              <Pressable
                key={filter}
                onPress={() => setTimeframeFilter(filter)}
                style={{
                  backgroundColor: isActive ? '#2C2C2E' : 'transparent',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isActive ? '#3A3A3C' : 'transparent',
                }}
              >
                <Text style={{ color: isActive ? '#FFF' : '#8E8E93', fontSize: 13, fontWeight: isActive ? '700' : '500' }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
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
                    ? (summits.find(s => s.id === selectedMacroId)?.title || 'Select...')
                    : journeyLinkMode === 'new'
                    ? (newSummitTitle.trim() ? `New — ${newSummitTitle.trim()}` : 'New Goal...')
                    : 'None'
                }`}
                options={[{ id: '', label: 'None' }, ...summits.map(s => ({ id: s.id, label: s.title }))]}
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
                <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Summit Title</Text>
                <PremiumInput
                  style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: '#2C2C2E' }}
                  placeholder="e.g. Hike 100 miles, Write a Novel, Learn French"
                  placeholderTextColor="#5C5C5E"
                  value={newSummitTitle}
                  onChangeText={setNewSummitTitle}
                />

                <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Track By</Text>
                <View style={{ backgroundColor: '#151517', borderColor: '#2C2C2E', borderWidth: 1 }} className="flex-row p-1 rounded-xl mb-4">
                  {([
                    { key: 'minutes' as const, label: 'Time' },
                    { key: 'units' as const, label: 'Count' },
                  ]).map(({ key, label }) => {
                    const isActive = newSummitMetricType === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setNewSummitMetricType(key)}
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
                  {newSummitMetricType === 'units' ? 'Target Count' : 'Target Hours'}
                </Text>
                {newSummitMetricType === 'units' ? (
                  <PremiumInput
                    style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: '#2C2C2E' }}
                    placeholder="e.g. 20 (books, games, workouts...)"
                    placeholderTextColor="#5C5C5E"
                    keyboardType="numeric"
                    value={newSummitTargetCount}
                    onChangeText={setNewSummitTargetCount}
                  />
                ) : (
                  <PremiumInput
                    style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: '#2C2C2E' }}
                    placeholder="e.g. 50"
                    placeholderTextColor="#5C5C5E"
                    keyboardType="numeric"
                    value={newSummitTargetHours}
                    onChangeText={setNewSummitTargetHours}
                  />
                )}

                <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Time Horizon</Text>
                <View style={{ backgroundColor: '#151517', borderColor: '#2C2C2E', borderWidth: 1 }} className="flex-row p-1 rounded-xl mb-4">
                  {(['monthly', 'yearly'] as const).map((h) => {
                    const isActive = newSummitHorizon === h;
                    return (
                      <Pressable
                        key={h}
                        onPress={() => setNewSummitHorizon(h)}
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
                        onPress={() => setNewSummitParentId('')}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 9999,
                          borderWidth: 1,
                          marginRight: 8,
                          backgroundColor: !newSummitParentId ? 'rgba(191,90,242,0.15)' : '#151517',
                          borderColor: !newSummitParentId ? 'rgba(191,90,242,0.3)' : '#2C2C2E',
                        }}
                      >
                        <Text style={{ color: !newSummitParentId ? '#FFFFFF' : '#8E8E93', fontSize: 13, fontWeight: !newSummitParentId ? '700' : '500' }}>None</Text>
                      </Pressable>
                      {eligibleParents.map((p) => {
                        const isSelected = newSummitParentId === p.id;
                        return (
                          <Pressable
                            key={p.id}
                            onPress={() => setNewSummitParentId(p.id)}
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

      {/* Journeys List */}
      <View style={{ paddingHorizontal: 16 }}>
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
          collections.map(collection => {
            const collectionWaypoints = filteredWaypoints.filter(w => w.collectionId === collection.id);
            const collectionItems = items.filter(i => i.collectionId === collection.id);
            const completedCount = collectionItems.filter(i => i.completed).length;
            const progress = collectionItems.length > 0 ? Math.round((completedCount / collectionItems.length) * 100) : 0;
            const linkedSummit = summits.find(g => g.id === collection.summitId);
            const isFullyComplete = progress === 100 && collectionItems.length > 0;

            const isJourneyExpanded = !!expandedJourneys[collection.id];

            return (
              <View key={collection.id} style={{ marginBottom: 10, backgroundColor: '#1C1C1E', borderRadius: 14, padding: 0, borderWidth: 1, borderColor: isFullyComplete ? '#BF5AF255' : '#2C2C2E', shadowColor: isFullyComplete ? '#BF5AF2' : '#000', shadowRadius: 6, shadowOpacity: isFullyComplete ? 0.2 : 0.08, overflow: 'hidden' }}>
                {/* Journey Row — compact by default, tap to expand */}
                <Pressable
                  onPress={() => toggleJourney(collection.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}
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
                      {linkedSummit && (
                        <View style={{ backgroundColor: '#5AC8FA15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: '#5AC8FA44', flexDirection: 'row', alignItems: 'center' }}>
                          <FontAwesome5 name="bullseye" size={9} color="#5AC8FA" style={{ marginRight: 4 }} />
                          <Text style={{ color: '#5AC8FA', fontSize: 10, fontWeight: '700' }}>{linkedSummit.title}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text style={{ color: isFullyComplete ? '#30D158' : '#FFF', fontSize: 13, fontWeight: '700', marginRight: 10 }}>
                    {completedCount}/{collectionItems.length} ({progress}%)
                  </Text>

                  <Pressable onPress={() => handleOpenEditJourney(collection.id)} style={{ padding: 6, marginRight: 4, backgroundColor: '#2C2C2E', borderRadius: 8 }}>
                    <Ionicons name="pencil" size={14} color="#8E8E93" />
                  </Pressable>
                  <Pressable onPress={() => setDeletingJourneyId(collection.id)} style={{ padding: 6, backgroundColor: '#FF453A15', borderRadius: 8, marginRight: 8 }}>
                    <Ionicons name="trash" size={14} color="#FF453A" />
                  </Pressable>

                  <Ionicons name={isJourneyExpanded ? "chevron-up" : "chevron-down"} size={18} color="#8E8E93" />
                </Pressable>

                {/* Expanded Content — Progress + Waypoints (Shadcn Accordion Style) */}
                {isJourneyExpanded && (
                <View style={{ borderTopWidth: 1, borderTopColor: '#2C2C2E' }}>
                  {/* Journey Progress Bar */}
                  <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2 }}>
                    <AnimatedProgressBar
                      progress={progress}
                      color={isFullyComplete ? '#30D158' : '#BF5AF2'}
                      height={5}
                    />
                  </View>

                  {/* Category/Goal — fast post-creation correction pills */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingTop: 10 }}>
                    <PillPicker
                      label={`${collection.category.charAt(0).toUpperCase()}${collection.category.slice(1)}`}
                      options={categories.map(c => ({ id: c, label: `${c.charAt(0).toUpperCase()}${c.slice(1)}` }))}
                      selectedId={collection.category}
                      onSelect={(id) => { feedback('select'); updateCollection(collection.id, { category: id as CollectionCategory }); setJourneyRowOpenPill(prev => ({ ...prev, [collection.id]: null })); }}
                      open={journeyRowOpenPill[collection.id] === 'category'}
                      onToggle={() => toggleJourneyRowPill(collection.id, 'category')}
                    />
                    <PillPicker
                      label={linkedSummit ? linkedSummit.title : 'No Goal'}
                      options={[{ id: '', label: 'No Goal' }, ...summits.map(s => ({ id: s.id, label: s.title }))]}
                      selectedId={collection.summitId || ''}
                      onSelect={(id) => { feedback('select'); updateCollection(collection.id, { summitId: id || undefined }); setJourneyRowOpenPill(prev => ({ ...prev, [collection.id]: null })); }}
                      open={journeyRowOpenPill[collection.id] === 'goal'}
                      onToggle={() => toggleJourneyRowPill(collection.id, 'goal')}
                      accentColor="#5AC8FA"
                    />
                  </View>

                {/* Waypoints Area */}
                <View style={{ padding: 10, backgroundColor: '#1C1C1E' }}>
                  {collectionWaypoints.map(wp => {
                    const wpItems = collectionItems.filter(i => i.waypointId === wp.id);
                    const wpCompleted = wpItems.filter(i => i.completed).length;
                    const targetMetric = wp.targetMetric || wpItems.length || 1;
                    const wpPct = Math.min(100, Math.round((wpCompleted / targetMetric) * 100));
                    const isWpComplete = wpPct === 100;
                    const timeframeLabel = wp.month && wp.year
                      ? `${MONTH_NAMES[wp.month - 1]} ${wp.year}`
                      : wp.year
                      ? `${wp.year}`
                      : 'Ongoing';

                    const isExpanded = !!expandedWaypoints[wp.id];

                    return (
                      <View key={wp.id} style={{ marginBottom: 8, backgroundColor: '#252528', borderRadius: 11, borderWidth: 1, borderColor: isWpComplete ? '#30D15844' : '#3A3A3C', overflow: 'hidden' }}>
                        <Pressable
                          onPress={() => toggleWaypoint(wp.id)}
                          style={{ padding: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                              {isWpComplete ? (
                                <Ionicons name="checkmark-circle" size={16} color="#30D158" style={{ marginRight: 7 }} />
                              ) : (
                                <Ionicons name="flag" size={16} color="#5AC8FA" style={{ marginRight: 7 }} />
                              )}
                              <EditableText
                                value={wp.title}
                                onSave={(title) => updateWaypoint(wp.id, { title })}
                                textStyle={{ color: '#FFF', fontSize: 14, fontWeight: '600' }}
                              />
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ color: '#8E8E93', fontSize: 11, fontWeight: '500', marginRight: 10 }}>
                                {wpCompleted} / {wp.targetMetric ? wp.targetMetric : wpItems.length} ({wpPct}%)
                              </Text>
                              <View style={{ backgroundColor: '#1C1C1E', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ color: '#5AC8FA', fontSize: 10, fontWeight: '600' }}>{timeframeLabel}</Text>
                              </View>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Pressable onPress={() => handleOpenEditWaypoint(wp)} style={{ padding: 7, marginRight: 2 }}>
                              <Ionicons name="ellipsis-horizontal" size={16} color="#8E8E93" />
                            </Pressable>
                            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#8E8E93" />
                          </View>
                        </Pressable>

                        {/* Accordion Content */}
                        {isExpanded && (
                          <View style={{ paddingHorizontal: 11, paddingBottom: 11, borderTopWidth: 1, borderTopColor: '#3A3A3C' }}>
                            {/* Target/Year/Month — fast post-creation correction pills */}
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
                                  <Pressable onPress={() => handleToggleItem(item.id, collection.id, item.waypointId)} style={{ marginRight: 10 }}>
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
                            ) : (
                              <Text style={{ color: '#8E8E93', fontSize: 12, marginTop: 10, fontStyle: 'italic' }}>No tasks added yet.</Text>
                            )}

                            <View style={{ marginTop: 10 }}>
                              <QuickAddBar
                                placeholder="Add a task..."
                                value={itemQuickAddTitleByWaypoint[wp.id] || ''}
                                onChangeText={(t) => setItemQuickAddTitleByWaypoint(prev => ({ ...prev, [wp.id]: t }))}
                                onSubmit={() => {
                                  handleQuickAddItem(collection.id, wp.id, itemQuickAddTitleByWaypoint[wp.id] || '');
                                  setItemQuickAddTitleByWaypoint(prev => ({ ...prev, [wp.id]: '' }));
                                }}
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {/* Root-Level Items (Items without a Waypoint) */}
                  {collectionItems.filter(i => !i.waypointId).map(item => (
                    <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' }}>
                      <Pressable onPress={() => handleToggleItem(item.id, collection.id)} style={{ marginRight: 10 }}>
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

                  {/* Quick-add bars — bare title only, replacing the old +Waypoint/+Task chips */}
                  <View style={{ marginTop: 10, gap: 8 }}>
                    <QuickAddBar
                      placeholder="Add a waypoint..."
                      value={waypointQuickAddTitle[collection.id] || ''}
                      onChangeText={(t) => setWaypointQuickAddTitle(prev => ({ ...prev, [collection.id]: t }))}
                      onSubmit={() => handleQuickAddWaypoint(collection.id)}
                      accentColor="#5AC8FA"
                    />
                    <QuickAddBar
                      placeholder="Add a task..."
                      value={itemQuickAddTitleByJourney[collection.id] || ''}
                      onChangeText={(t) => setItemQuickAddTitleByJourney(prev => ({ ...prev, [collection.id]: t }))}
                      onSubmit={() => {
                        handleQuickAddItem(collection.id, undefined, itemQuickAddTitleByJourney[collection.id] || '');
                        setItemQuickAddTitleByJourney(prev => ({ ...prev, [collection.id]: '' }));
                      }}
                    />
                  </View>

                </View>
                </View>
                )}
              </View>
            );
          })
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

      {/* Journey Create/Edit Modal */}
      <Modal visible={isJourneyModalOpen} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#0E0E10', borderRadius: 24, padding: 24, maxWidth: 480, width: '100%', maxHeight: '90%', borderWidth: 1, borderColor: '#2C2C2E', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }}>{editingJourneyId ? 'Edit Journey' : 'New Journey'}</Text>
              <Pressable onPress={() => setIsJourneyModalOpen(false)} style={{ backgroundColor: '#2C2C2E', padding: 6, borderRadius: 12 }}>
                <Ionicons name="close" size={20} color="#8E8E93" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {journeyValidationError ? (
                <View style={{ backgroundColor: 'rgba(255,69,58,0.15)', borderColor: 'rgba(255,69,58,0.4)', borderWidth: 1, padding: 14, borderRadius: 16, marginBottom: 16 }}>
                  <Text style={{ color: '#FF453A', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{journeyValidationError}</Text>
                </View>
              ) : null}

              <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Journey Title</Text>
              <PremiumInput
                style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 16, borderRadius: 16, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#2C2C2E' }}
                placeholder="e.g., Reading List 2026, Marathon Training"
                placeholderTextColor="#5C5C5E"
                value={journeyTitle}
                onChangeText={setJourneyTitle}
                autoFocus
              />

              <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                {categories.map(c => {
                  const isActive = journeyCategory === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setJourneyCategory(c)}
                      style={{
                        backgroundColor: isActive ? 'rgba(191,90,242,0.15)' : '#151517',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 12,
                        marginRight: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: isActive ? 'rgba(191,90,242,0.3)' : '#2C2C2E'
                      }}
                    >
                      <View style={{ marginRight: 8 }}>
                        <CategoryVectorIcon category={c} size={16} color={isActive ? "#FFFFFF" : "#8E8E93"} />
                      </View>
                      <Text style={{ color: isActive ? '#FFFFFF' : '#8E8E93', fontWeight: isActive ? '700' : '500', fontSize: 14, textTransform: 'capitalize' }}>{c}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Track Progress (Optional)</Text>
              <View style={{ backgroundColor: '#151517', borderColor: '#2C2C2E', borderWidth: 1 }} className="flex-row p-1 rounded-xl mb-4">
                {([
                  { key: 'none' as const, label: 'None' },
                  { key: 'existing' as const, label: 'Link Existing' },
                  ...(!editingJourneyId ? [{ key: 'new' as const, label: 'Create New' }] : []),
                ]).map(({ key, label }) => {
                  const isActive = journeyLinkMode === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setJourneyLinkMode(key)}
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

              {journeyLinkMode === 'existing' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                  {summits.map((mg) => {
                    const isActive = selectedMacroId === mg.id;
                    return (
                      <Pressable
                        key={mg.id}
                        onPress={() => setSelectedMacroId(mg.id)}
                        style={{
                          backgroundColor: isActive ? 'rgba(191,90,242,0.15)' : '#151517',
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 12,
                          marginRight: 10,
                          borderWidth: 1,
                          borderColor: isActive ? 'rgba(191,90,242,0.3)' : '#2C2C2E'
                        }}
                      >
                        <Text style={{ color: isActive ? '#FFFFFF' : '#8E8E93', fontWeight: isActive ? '700' : '500', fontSize: 14 }}>{mg.title}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {journeyLinkMode === 'new' && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Summit Title</Text>
                  <PremiumInput
                    style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 16, borderRadius: 16, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#2C2C2E' }}
                    placeholder="e.g. Hike 100 miles, Write a Novel, Learn French"
                    placeholderTextColor="#5C5C5E"
                    value={newSummitTitle}
                    onChangeText={setNewSummitTitle}
                  />

                  <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Track By</Text>
                  <View style={{ backgroundColor: '#151517', borderColor: '#2C2C2E', borderWidth: 1 }} className="flex-row p-1 rounded-xl mb-4">
                    {([
                      { key: 'minutes' as const, label: 'Time' },
                      { key: 'units' as const, label: 'Count' },
                    ]).map(({ key, label }) => {
                      const isActive = newSummitMetricType === key;
                      return (
                        <Pressable
                          key={key}
                          onPress={() => setNewSummitMetricType(key)}
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
                    {newSummitMetricType === 'units' ? 'Target Count' : 'Target Hours'}
                  </Text>
                  {newSummitMetricType === 'units' ? (
                    <PremiumInput
                      style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 16, borderRadius: 16, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#2C2C2E' }}
                      placeholder="e.g. 20 (books, games, workouts...)"
                      placeholderTextColor="#5C5C5E"
                      keyboardType="numeric"
                      value={newSummitTargetCount}
                      onChangeText={setNewSummitTargetCount}
                    />
                  ) : (
                    <PremiumInput
                      style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 16, borderRadius: 16, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#2C2C2E' }}
                      placeholder="e.g. 50"
                      placeholderTextColor="#5C5C5E"
                      keyboardType="numeric"
                      value={newSummitTargetHours}
                      onChangeText={setNewSummitTargetHours}
                    />
                  )}

                  <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Time Horizon</Text>
                  <View style={{ backgroundColor: '#151517', borderColor: '#2C2C2E', borderWidth: 1 }} className="flex-row p-1 rounded-xl mb-4">
                    {(['monthly', 'yearly'] as const).map((h) => {
                      const isActive = newSummitHorizon === h;
                      return (
                        <Pressable
                          key={h}
                          onPress={() => setNewSummitHorizon(h)}
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
                          onPress={() => setNewSummitParentId('')}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 9999,
                            borderWidth: 1,
                            marginRight: 8,
                            backgroundColor: !newSummitParentId ? 'rgba(191,90,242,0.15)' : '#151517',
                            borderColor: !newSummitParentId ? 'rgba(191,90,242,0.3)' : '#2C2C2E',
                          }}
                        >
                          <Text style={{ color: !newSummitParentId ? '#FFFFFF' : '#8E8E93', fontSize: 13, fontWeight: !newSummitParentId ? '700' : '500' }}>None</Text>
                        </Pressable>
                        {eligibleParents.map((p) => {
                          const isSelected = newSummitParentId === p.id;
                          return (
                            <Pressable
                              key={p.id}
                              onPress={() => setNewSummitParentId(p.id)}
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

              <PrimaryButton
                onPress={handleSaveJourney}
                title={editingJourneyId ? 'Save Changes' : 'Launch Journey'}
                style={{ width: '100%', marginTop: 8 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Journey Confirmation Modal */}
      <Modal visible={!!deletingJourneyId} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#1C1C1E', borderRadius: 20, padding: 24, maxWidth: 440, width: '100%', borderWidth: 1, borderColor: '#FF453A44' }}>
            <Ionicons name="warning-outline" size={36} color="#FF453A" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
              Delete Journey?
            </Text>
            <Text style={{ color: '#8E8E93', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
              Are you sure you want to delete this journey? Historically earned milestone cash rewards will remain safe in your balance.
            </Text>

            {/* Check if linked to a Summit */}
            {(() => {
              const col = collections.find(c => c.id === deletingJourneyId);
              const hasSummit = col && col.summitId;
              if (hasSummit) {
                return (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: '#5AC8FA', fontSize: 12, textAlign: 'center', marginBottom: 12, fontWeight: '600' }}>
                      This journey is linked to a Summit.
                    </Text>
                    <Pressable
                      onPress={() => handleConfirmDeleteJourney(true)}
                      style={{ backgroundColor: '#FF453A', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Delete Journey & Linked Summit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleConfirmDeleteJourney(false)}
                      style={{ backgroundColor: '#2C2C2E', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600' }}>Delete Journey Only (Keep Summit)</Text>
                    </Pressable>
                  </View>
                );
              }
              return (
                <Pressable
                  onPress={() => handleConfirmDeleteJourney(false)}
                  style={{ backgroundColor: '#FF453A', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 }}
                >
                  <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Delete Journey</Text>
                </Pressable>
              );
            })()}

            <Pressable
              onPress={() => setDeletingJourneyId(null)}
              style={{ backgroundColor: 'transparent', padding: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#8E8E93', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Waypoint Create/Edit Modal - Centered Compact Card with 2-Row Month Grid */}
      <Modal visible={isWaypointModalOpen} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#1C1C1E', borderRadius: 24, padding: 24, maxWidth: 480, width: '100%', borderWidth: 1, borderColor: '#3A3A3C' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800' }}>{editingWaypointId ? 'Edit Waypoint' : 'New Waypoint'}</Text>
              <Pressable onPress={() => setIsWaypointModalOpen(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </Pressable>
            </View>

            {/* Waypoint Title Input */}
            <Text style={{ color: '#8E8E93', marginBottom: 6, fontSize: 12, fontWeight: '600' }}>Waypoint Title</Text>
            <PremiumInput
              style={{ backgroundColor: '#252528', color: '#FFF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: '#3A3A3C' }}
              placeholder="e.g., Fiction, Self-Help, Economics, Hikes, Running"
              placeholderTextColor="#8E8E93"
              value={waypointTitle}
              onChangeText={setWaypointTitle}
              autoFocus
            />

            {/* Target Count & Year Row */}
            <View style={{ flexDirection: 'row', marginBottom: 14 }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ color: '#8E8E93', marginBottom: 6, fontSize: 12, fontWeight: '600' }}>Target Count (Optional)</Text>
                <PremiumInput
                  style={{ backgroundColor: '#252528', color: '#FFF', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#3A3A3C' }}
                  placeholder="e.g., 3 books"
                  placeholderTextColor="#8E8E93"
                  value={waypointTargetMetric}
                  onChangeText={setWaypointTargetMetric}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ width: 120 }}>
                <Text style={{ color: '#8E8E93', marginBottom: 6, fontSize: 12, fontWeight: '600' }}>Target Year</Text>
                <PremiumInput
                  style={{ backgroundColor: '#252528', color: '#FFF', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#3A3A3C' }}
                  placeholder={`e.g., ${currentYear}`}
                  placeholderTextColor="#8E8E93"
                  value={waypointYear}
                  onChangeText={setWaypointYear}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Month Selection 2-Row Grid */}
            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600' }}>Month</Text>

            {/* Row 1: All Year + Jan-May */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              <Pressable
                onPress={() => setWaypointMonth('')}
                style={{
                  backgroundColor: waypointMonth === '' ? '#BF5AF2' : '#252528',
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: waypointMonth === '' ? '#BF5AF2' : '#3A3A3C',
                  flex: 1,
                  alignItems: 'center',
                  minWidth: 70
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>All Year</Text>
              </Pressable>
              {MONTH_NAMES.slice(0, 5).map((mName, idx) => {
                const mNum = (idx + 1).toString();
                const isSel = waypointMonth === mNum;
                return (
                  <Pressable
                    key={mNum}
                    onPress={() => setWaypointMonth(mNum)}
                    style={{
                      backgroundColor: isSel ? '#BF5AF2' : '#252528',
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isSel ? '#BF5AF2' : '#3A3A3C',
                      flex: 1,
                      alignItems: 'center',
                      minWidth: 60
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{mName.slice(0, 3)}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Row 2: Jun-Dec */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {MONTH_NAMES.slice(5).map((mName, idx) => {
                const mNum = (idx + 6).toString();
                const isSel = waypointMonth === mNum;
                return (
                  <Pressable
                    key={mNum}
                    onPress={() => setWaypointMonth(mNum)}
                    style={{
                      backgroundColor: isSel ? '#BF5AF2' : '#252528',
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isSel ? '#BF5AF2' : '#3A3A3C',
                      flex: 1,
                      alignItems: 'center',
                      minWidth: 50
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{mName.slice(0, 3)}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Action Button */}
            <PrimaryButton
              onPress={handleSaveWaypoint}
              title={editingWaypointId ? 'Save Waypoint' : 'Create Waypoint'}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
