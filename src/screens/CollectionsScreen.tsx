import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Modal, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCollectionStore, CollectionCategory } from '../store/collectionStore';
import { useSummitStore, getChainTrail, getEligibleParents } from '../store/summitStore';
import { useConfettiStore } from '../store/confettiStore';
import { PrimaryButton } from '../components/PrimaryButton';
import AnimatedProgressBar from '../components/AnimatedProgressBar';
import RewardToast from '../components/RewardToast';
import PillPicker from '../components/PillPicker';
import EditableText from '../components/EditableText';
import JourneyDetailModal from '../components/JourneyDetailModal';
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
    toggleItemCompletion,
  } = useCollectionStore();

  const { summits, addSummit, deleteSummit } = useSummitStore();
  const { triggerConfetti } = useConfettiStore();

  // Celebration feedback modal
  const [celebrationInfo, setCelebrationInfo] = useState<CelebrationInfo | null>(null);

  // Chain-legibility toast (shown when a completed item feeds a Summit chain)
  const [chainToastVisible, setChainToastVisible] = useState(false);
  const [chainToastTrail, setChainToastTrail] = useState<string[]>([]);

  // Journey Detail — full-screen view (editing, Waypoints/Items management,
  // linked-Tasks lookup), replaces the old separate edit-Journey popup.
  const [detailJourneyId, setDetailJourneyId] = useState<string | null>(null);
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
  const [newSummitUnitLabel, setNewSummitUnitLabel] = useState('');
  const [newSummitHorizon, setNewSummitHorizon] = useState<'monthly' | 'yearly'>('monthly');
  const [newSummitParentId, setNewSummitParentId] = useState('');

  // New Journey — collapsible inline form (no modal). Shares all the state
  // above (journeyTitle, journeyCategory, journeyLinkMode, newSummit*) and
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
    setNewSummitTitle('');
    setNewSummitMetricType('minutes');
    setNewSummitTargetHours('');
    setNewSummitTargetCount('');
    setNewSummitUnitLabel('');
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
          unitLabel: newSummitUnitLabel.trim() || undefined,
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

  const totalJourneys = collections.length;
  const totalItems = items.length;
  const completedItems = items.filter(i => i.completed).length;
  const overallCompletionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Eligible chain-parents for a Summit being created inline (root goals only,
  // same type/metricType, no cycles) — mirrors the old Profile creation form.
  const eligibleParents = journeyLinkMode === 'new'
    ? getEligibleParents(summits, null, 'productive', newSummitMetricType, newSummitUnitLabel)
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
                  <>
                    <PremiumInput
                      style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, fontSize: 15, marginBottom: 8, borderWidth: 1, borderColor: '#2C2C2E' }}
                      placeholder="e.g. 20 (books, games, workouts...)"
                      placeholderTextColor="#5C5C5E"
                      keyboardType="numeric"
                      value={newSummitTargetCount}
                      onChangeText={setNewSummitTargetCount}
                    />
                    <PremiumInput
                      style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: '#2C2C2E' }}
                      placeholder="Unit label (e.g. pages, reps, km)"
                      placeholderTextColor="#5C5C5E"
                      value={newSummitUnitLabel}
                      onChangeText={setNewSummitUnitLabel}
                    />
                  </>
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
            const collectionItems = items.filter(i => i.collectionId === collection.id);
            const completedCount = collectionItems.filter(i => i.completed).length;
            const progress = collectionItems.length > 0 ? Math.round((completedCount / collectionItems.length) * 100) : 0;
            const linkedSummit = summits.find(g => g.id === collection.summitId);
            const isFullyComplete = progress === 100 && collectionItems.length > 0;

            // Mirrors the linked Summit's own progress (from Tasks/subtasks
            // cascading up via summitId) — a Journey has no progress of its
            // own, so this surfaces the Goal it actually feeds right where
            // tasks get created, without a tap to the Profile/Dashboard.
            const isSummitUnits = linkedSummit?.metricType === 'units';
            const summitCompleted = linkedSummit ? (isSummitUnits ? (linkedSummit.completedMetric || 0) : linkedSummit.completedMinutes) : 0;
            const summitTarget = linkedSummit ? (isSummitUnits ? (linkedSummit.targetMetric || 0) : linkedSummit.targetMinutes) : 0;
            const summitPct = summitTarget > 0 ? Math.min(100, Math.round((summitCompleted / summitTarget) * 100)) : 0;
            const summitProgressLabel = isSummitUnits
              ? `${summitCompleted}/${summitTarget}${linkedSummit?.unitLabel ? ` ${linkedSummit.unitLabel}` : ''}`
              : `${(summitCompleted / 60).toFixed(1)}/${(summitTarget / 60).toFixed(1)}h`;

            return (
              <Pressable
                key={collection.id}
                onPress={() => setDetailJourneyId(collection.id)}
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
                    {linkedSummit && (
                      <View style={{ backgroundColor: '#5AC8FA15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: '#5AC8FA44', flexDirection: 'row', alignItems: 'center' }}>
                        <FontAwesome5 name="bullseye" size={9} color="#5AC8FA" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#5AC8FA', fontSize: 10, fontWeight: '700' }}>{linkedSummit.title}</Text>
                      </View>
                    )}
                  </View>
                  {linkedSummit && (
                    <View style={{ marginTop: 6 }}>
                      <AnimatedProgressBar progress={summitPct} color="#5AC8FA" height={4} />
                      <Text style={{ color: '#8E8E93', fontSize: 10, marginTop: 3 }}>{summitProgressLabel} toward goal · {summitPct}%</Text>
                    </View>
                  )}
                </View>

                <Text style={{ color: isFullyComplete ? '#30D158' : '#FFF', fontSize: 13, fontWeight: '700', marginRight: 10 }}>
                  {completedCount}/{collectionItems.length} ({progress}%)
                </Text>

                <Pressable onPress={() => setDetailJourneyId(collection.id)} style={{ padding: 6, backgroundColor: '#2C2C2E', borderRadius: 8 }}>
                  <Ionicons name="pencil" size={14} color="#8E8E93" />
                </Pressable>
              </Pressable>
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

      <JourneyDetailModal
        collection={collections.find(c => c.id === detailJourneyId) || null}
        visible={!!detailJourneyId}
        onClose={() => setDetailJourneyId(null)}
        onToggleItem={handleToggleItem}
      />

    </SafeAreaView>
  );
}
