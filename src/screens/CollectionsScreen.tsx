import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Modal, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCollectionStore, CollectionCategory, JourneySubGoal } from '../store/collectionStore';
import { useMacroGoalStore, getChainTrail } from '../store/macroGoalStore';
import { useConfettiStore } from '../store/confettiStore';
import { PrimaryButton } from '../components/PrimaryButton';
import AnimatedProgressBar from '../components/AnimatedProgressBar';
import RewardToast from '../components/RewardToast';
import { feedback } from '../utils/feedback';
import { CategoryVectorIcon } from '../utils/categoryIcons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PremiumInput = (props: React.ComponentProps<typeof TextInput>) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <TextInput
      {...props}
      onFocus={(e) => {
        setIsFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        props.onBlur?.(e);
      }}
      style={[
        props.style,
        { outlineStyle: 'none' } as any,
        isFocused && { borderColor: '#BF5AF2', borderWidth: 2 }
      ]}
    />
  );
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type TimeframeFilter = 'all' | 'year' | 'month';

type CelebrationInfo = {
  title: string;
  subtitle: string;
  payoutText: string;
  badgeLabel: string;
  iconType: 'rocket' | 'award' | 'crown' | 'target' | 'category';
  category?: CollectionCategory;
};

function CelebrationVectorIcon({ type, category }: { type: CelebrationInfo['iconType']; category?: CollectionCategory }) {
  if (type === 'category' && category) {
    return <CategoryVectorIcon category={category} size={48} color="#BF5AF2" />;
  }
  switch (type) {
    case 'rocket':
      return <Ionicons name="rocket-sharp" size={48} color="#BF5AF2" />;
    case 'award':
      return <FontAwesome5 name="award" size={48} color="#FFD700" />;
    case 'crown':
      return <FontAwesome5 name="crown" size={48} color="#FFD700" />;
    case 'target':
    default:
      return <FontAwesome5 name="crosshairs" size={44} color="#5AC8FA" />;
  }
}

export default function CollectionsScreen() {
  const {
    collections,
    subGoals,
    items,
    addCollection,
    updateCollection,
    deleteCollection,
    addSubGoal,
    updateSubGoal,
    deleteSubGoal,
    addItem,
    toggleItemCompletion,
    deleteItem,
  } = useCollectionStore();

  const { macroGoals, deleteMacroGoal } = useMacroGoalStore();
  const { triggerConfetti } = useConfettiStore();

  // Timeframe filter state
  const [timeframeFilter, setTimeframeFilter] = useState<TimeframeFilter>('all');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Celebration Dopamine Modal
  const [celebrationInfo, setCelebrationInfo] = useState<CelebrationInfo | null>(null);

  // Chain-legibility toast (shown when a completed item feeds a macro-goal chain)
  const [chainToastVisible, setChainToastVisible] = useState(false);
  const [chainToastTrail, setChainToastTrail] = useState<string[]>([]);

  // Create/Edit Journey Modal
  const [isJourneyModalOpen, setIsJourneyModalOpen] = useState(false);
  const [editingJourneyId, setEditingJourneyId] = useState<string | null>(null);
  const [journeyTitle, setJourneyTitle] = useState('');
  const [journeyCategory, setJourneyCategory] = useState<CollectionCategory>('books');
  const [selectedMacroId, setSelectedMacroId] = useState('');

  // Delete Journey Confirmation Modal
  const [deletingJourneyId, setDeletingJourneyId] = useState<string | null>(null);

  // Create/Edit Sub-Goal Modal
  const [isSubGoalModalOpen, setIsSubGoalModalOpen] = useState(false);
  const [editingSubGoalId, setEditingSubGoalId] = useState<string | null>(null);
  const [activeSubGoalCollectionId, setActiveSubGoalCollectionId] = useState('');
  const [subGoalTitle, setSubGoalTitle] = useState('');
  const [subGoalTargetMetric, setSubGoalTargetMetric] = useState('');
  const [subGoalYear, setSubGoalYear] = useState<string>(currentYear.toString());
  const [subGoalMonth, setSubGoalMonth] = useState<string>(currentMonth.toString());

  // Create Item Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState('');
  const [selectedSubGoalId, setSelectedSubGoalId] = useState<string>('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemEstimatedMinutes, setItemEstimatedMinutes] = useState('');

  // Accordion State
  const [expandedSubGoals, setExpandedSubGoals] = useState<Record<string, boolean>>({});
  const toggleSubGoal = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    feedback('expand');
    setExpandedSubGoals(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const categories: CollectionCategory[] = ['books', 'games', 'stocks', 'fitness', 'courses', 'travel', 'other'];

  // Journey CRUD
  const handleOpenNewJourney = () => {
    setEditingJourneyId(null);
    setJourneyTitle('');
    setJourneyCategory('books');
    setSelectedMacroId('');
    setIsJourneyModalOpen(true);
  };

  const handleOpenEditJourney = (cId: string) => {
    const col = collections.find(c => c.id === cId);
    if (!col) return;
    setEditingJourneyId(cId);
    setJourneyTitle(col.title);
    setJourneyCategory(col.category);
    setSelectedMacroId(col.macroGoalId || '');
    setIsJourneyModalOpen(true);
  };

  const handleSaveJourney = () => {
    if (!journeyTitle.trim()) return;
    if (editingJourneyId) {
      updateCollection(editingJourneyId, {
        title: journeyTitle.trim(),
        category: journeyCategory,
        macroGoalId: selectedMacroId || undefined,
      });
      setIsJourneyModalOpen(false);
    } else {
      addCollection({
        title: journeyTitle.trim(),
        category: journeyCategory,
        macroGoalId: selectedMacroId || undefined,
      });
      setIsJourneyModalOpen(false);

      // Trigger Celebration Dopamine Feedback
      triggerConfetti();
      feedback('select');
      const linkedGoal = macroGoals.find(g => g.id === selectedMacroId);
      const isEntertainment = linkedGoal?.type === 'entertainment';
      setCelebrationInfo({
        title: 'QUEST LAUNCHED!',
        subtitle: `Journey "${journeyTitle.trim()}" is live in your Discipline Economy.`,
        iconType: 'rocket',
        category: journeyCategory,
        payoutText: isEntertainment
          ? '🎁 Milestone badges unlock as you make progress — already earned, guilt-free!'
          : '🎁 Estimated Rewards: Milestone keys & cash bonus multipliers upon completion!',
        badgeLabel: 'MAIN QUEST UNLOCKED',
      });
    }
  };

  const handleConfirmDeleteJourney = (alsoDeleteMacroGoal: boolean) => {
    if (!deletingJourneyId) return;
    const col = collections.find(c => c.id === deletingJourneyId);
    if (col && col.macroGoalId && alsoDeleteMacroGoal) {
      deleteMacroGoal(col.macroGoalId);
    }
    deleteCollection(deletingJourneyId);
    setDeletingJourneyId(null);
  };

  // Sub-Goal CRUD
  const handleOpenNewSubGoal = (collectionId: string) => {
    setActiveSubGoalCollectionId(collectionId);
    setEditingSubGoalId(null);
    setSubGoalTitle('');
    setSubGoalTargetMetric('');
    setSubGoalYear(currentYear.toString());
    setSubGoalMonth(currentMonth.toString());
    setIsSubGoalModalOpen(true);
  };

  const handleOpenEditSubGoal = (subGoal: JourneySubGoal) => {
    setActiveSubGoalCollectionId(subGoal.collectionId);
    setEditingSubGoalId(subGoal.id);
    setSubGoalTitle(subGoal.title);
    setSubGoalTargetMetric(subGoal.targetMetric ? subGoal.targetMetric.toString() : '');
    setSubGoalYear(subGoal.year ? subGoal.year.toString() : '');
    setSubGoalMonth(subGoal.month ? subGoal.month.toString() : '');
    setIsSubGoalModalOpen(true);
  };

  const handleSaveSubGoal = () => {
    if (!subGoalTitle.trim() || !activeSubGoalCollectionId) return;
    const targetVal = parseInt(subGoalTargetMetric, 10);
    const yrVal = parseInt(subGoalYear, 10);
    const moVal = parseInt(subGoalMonth, 10);

    if (editingSubGoalId) {
      updateSubGoal(editingSubGoalId, {
        title: subGoalTitle.trim(),
        targetMetric: isNaN(targetVal) ? undefined : targetVal,
        year: isNaN(yrVal) ? undefined : yrVal,
        month: isNaN(moVal) ? undefined : moVal,
      });
      setIsSubGoalModalOpen(false);
    } else {
      addSubGoal({
        collectionId: activeSubGoalCollectionId,
        title: subGoalTitle.trim(),
        targetMetric: isNaN(targetVal) ? undefined : targetVal,
        year: isNaN(yrVal) ? undefined : yrVal,
        month: isNaN(moVal) ? undefined : moVal,
      });
      setIsSubGoalModalOpen(false);

      // Trigger Celebration Dopamine Feedback for Sub-Goal creation
      triggerConfetti();
      feedback('select');
      setCelebrationInfo({
        title: 'SUB-QUEST CREATED!',
        subtitle: `Sub-Goal "${subGoalTitle.trim()}" added to your journey targets.`,
        iconType: 'target',
        payoutText: `🎯 Target: ${isNaN(targetVal) ? 'Custom' : targetVal} units | Timeframe: ${subGoalMonth ? MONTH_NAMES[parseInt(subGoalMonth, 10) - 1] : ''} ${subGoalYear || 'Ongoing'}`,
        badgeLabel: 'SUB-QUEST INITIALIZED',
      });
    }
  };

  // Item CRUD
  const handleOpenNewItem = (collectionId: string) => {
    setActiveCollectionId(collectionId);
    setSelectedSubGoalId('');
    setItemTitle('');
    setItemEstimatedMinutes('');
    setIsItemModalOpen(true);
  };

  const handleCreateItem = () => {
    if (!itemTitle.trim() || !activeCollectionId) return;
    const est = parseInt(itemEstimatedMinutes, 10);
    addItem({
      collectionId: activeCollectionId,
      subGoalId: selectedSubGoalId || undefined,
      title: itemTitle.trim(),
      estimatedMinutes: isNaN(est) ? undefined : est,
      isAddedLater: true,
    });
    setItemTitle('');
    setItemEstimatedMinutes('');
    setSelectedSubGoalId('');
    setIsItemModalOpen(false);
  };

  const handleToggleItem = (itemId: string, collectionId: string, subGoalId?: string) => {
    const targetItem = items.find(i => i.id === itemId);
    if (!targetItem) return;

    const wasCompleted = targetItem.completed;
    toggleItemCompletion(itemId);

    // If completing (not uncompleting), check if it completes a Sub-Goal or Journey!
    if (!wasCompleted) {
      feedback('taskComplete');

      // Surface the linked macro-goal chain reacting, if any (Phase 4 legibility).
      const collection = collections.find(c => c.id === collectionId);
      if (collection?.macroGoalId) {
        const trail = getChainTrail(macroGoals, collection.macroGoalId);
        if (trail.length > 1) {
          setChainToastTrail(trail);
          setChainToastVisible(true);
        }
      }

      if (subGoalId) {
        const sgItems = items.filter(i => i.subGoalId === subGoalId);
        const sgCompletedCount = sgItems.filter(i => i.completed).length + 1; // including current
        const sg = subGoals.find(s => s.id === subGoalId);
        const targetVal = sg?.targetMetric || sgItems.length;

        if (sgCompletedCount >= targetVal && targetVal > 0) {
          triggerConfetti();
          feedback('milestone');
          setCelebrationInfo({
            title: 'SUB-GOAL CONQUERED!',
            subtitle: `You completed 100% of "${sg?.title || 'Sub-Goal'}"!`,
            iconType: 'award',
            payoutText: '💰 Milestone Payout Credited! Progress synced to Macro Goal.',
            badgeLabel: 'SUB-GOAL COMPLETE 100%',
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
          title: 'JOURNEY MASTERED!',
          subtitle: `Congratulations! You conquered all tasks in this Journey!`,
          iconType: 'crown',
          payoutText: '🔥 Discipline Booster unlocked! +1 Completed Journey logged.',
          badgeLabel: 'JOURNEY COMPLETED 🏆',
        });
      }
    }
  };

  // Filter collections and sub-goals by timeframe filter
  const filteredSubGoals = (subGoals || []).filter(sg => {
    if (timeframeFilter === 'all') return true;
    if (timeframeFilter === 'year') return sg.year === currentYear;
    if (timeframeFilter === 'month') return sg.year === currentYear && sg.month === currentMonth;
    return true;
  });

  const totalQuests = collections.length;
  const activeSubGoalsCount = filteredSubGoals.length;
  const totalItems = items.length;
  const completedItems = items.filter(i => i.completed).length;
  const overallCompletionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }} edges={['top']}>
      <RewardToast
        visible={chainToastVisible}
        message="Progress logged"
        chainTrail={chainToastTrail}
        onDismiss={() => setChainToastVisible(false)}
      />

      {/* Executive Summary Header Stats Bar (Shadcn-inspired) */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 32, fontWeight: '800', color: '#FFFFFF' }}>Journeys</Text>
          <PrimaryButton
            onPress={handleOpenNewJourney}
            title="New Journey"
            icon={<Ionicons name="add" size={16} color="white" />}
            size="sm"
          />
        </View>

        {/* Shadcn Stats Grid */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, backgroundColor: '#1C1C1E', borderRadius: 16, padding: 16, marginRight: 8, borderWidth: 1, borderColor: '#2C2C2E' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: '#8E8E93', fontSize: 13, fontWeight: '600' }}>Total Quests</Text>
              <Ionicons name="map-outline" size={16} color="#8E8E93" />
            </View>
            <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '800' }}>{totalQuests}</Text>
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
            const label = filter === 'all' ? 'All Quests' : filter === 'year' ? currentYear.toString() : `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;
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

      {/* Journeys List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {collections.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40, backgroundColor: '#1C1C1E', borderRadius: 20, padding: 32, borderWidth: 1, borderColor: '#2C2C2E' }}>
            <View style={{ backgroundColor: '#BF5AF222', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <FontAwesome5 name="compass" size={32} color="#BF5AF2" />
            </View>
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700', textAlign: 'center' }}>No Active Journeys</Text>
            <Text style={{ color: '#8E8E93', marginTop: 8, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              Launch your first RPG-style Journey to track reading targets, fitness quests, and multi-month discipline milestones!
            </Text>
            <PrimaryButton
              onPress={handleOpenNewJourney}
              title="+ Launch First Journey"
              style={{ marginTop: 20 }}
            />
          </View>
        ) : (
          collections.map(collection => {
            const collectionSubGoals = filteredSubGoals.filter(s => s.collectionId === collection.id);
            const collectionItems = items.filter(i => i.collectionId === collection.id);
            const completedCount = collectionItems.filter(i => i.completed).length;
            const progress = collectionItems.length > 0 ? Math.round((completedCount / collectionItems.length) * 100) : 0;
            const linkedMacro = macroGoals.find(g => g.id === collection.macroGoalId);
            const isFullyComplete = progress === 100 && collectionItems.length > 0;

            return (
              <View key={collection.id} style={{ marginBottom: 24, backgroundColor: '#1C1C1E', borderRadius: 20, padding: 0, borderWidth: 1, borderColor: isFullyComplete ? '#BF5AF255' : '#2C2C2E', shadowColor: isFullyComplete ? '#BF5AF2' : '#000', shadowRadius: 10, shadowOpacity: isFullyComplete ? 0.2 : 0.1, overflow: 'hidden' }}>
                {/* Journey Card Header */}
                <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ backgroundColor: '#BF5AF215', width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#BF5AF233' }}>
                          <CategoryVectorIcon category={collection.category} size={20} color="#BF5AF2" />
                        </View>
                        <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800' }}>{collection.title}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                        <View style={{ backgroundColor: '#2C2C2E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 }}>
                          <Text style={{ color: '#BF5AF2', fontSize: 11, textTransform: 'uppercase', fontWeight: '700' }}>
                            {collection.category}
                          </Text>
                        </View>
                        {linkedMacro && (
                          <View style={{ backgroundColor: '#5AC8FA15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#5AC8FA44', flexDirection: 'row', alignItems: 'center' }}>
                            <FontAwesome5 name="bullseye" size={10} color="#5AC8FA" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#5AC8FA', fontSize: 11, fontWeight: '700' }}>{linkedMacro.title}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Pressable onPress={() => handleOpenEditJourney(collection.id)} style={{ padding: 6, marginRight: 4, backgroundColor: '#2C2C2E', borderRadius: 8 }}>
                        <Ionicons name="pencil" size={16} color="#8E8E93" />
                      </Pressable>
                      <Pressable onPress={() => setDeletingJourneyId(collection.id)} style={{ padding: 6, backgroundColor: '#FF453A15', borderRadius: 8 }}>
                        <Ionicons name="trash" size={16} color="#FF453A" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Journey Progress Bar */}
                  <View style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '600' }}>Progress</Text>
                      <Text style={{ color: isFullyComplete ? '#30D158' : '#FFF', fontSize: 13, fontWeight: '700' }}>
                        {completedCount} / {collectionItems.length} ({progress}%)
                      </Text>
                    </View>
                    <AnimatedProgressBar
                      progress={progress}
                      color={isFullyComplete ? '#30D158' : '#BF5AF2'}
                    />
                  </View>
                </View>

                {/* Sub-Goals Area (Shadcn Accordion Style) */}
                <View style={{ padding: 16, backgroundColor: '#1C1C1E' }}>
                  {collectionSubGoals.map(sg => {
                    const sgItems = collectionItems.filter(i => i.subGoalId === sg.id);
                    const sgCompleted = sgItems.filter(i => i.completed).length;
                    const targetMetric = sg.targetMetric || sgItems.length || 1;
                    const sgPct = Math.min(100, Math.round((sgCompleted / targetMetric) * 100));
                    const isSgComplete = sgPct === 100;
                    const timeframeLabel = sg.month && sg.year
                      ? `${MONTH_NAMES[sg.month - 1]} ${sg.year}`
                      : sg.year
                      ? `${sg.year}`
                      : 'Ongoing';

                    const isExpanded = !!expandedSubGoals[sg.id];

                    return (
                      <View key={sg.id} style={{ marginBottom: 12, backgroundColor: '#252528', borderRadius: 12, borderWidth: 1, borderColor: isSgComplete ? '#30D15844' : '#3A3A3C', overflow: 'hidden' }}>
                        <Pressable 
                          onPress={() => toggleSubGoal(sg.id)}
                          style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                              {isSgComplete ? (
                                <Ionicons name="checkmark-circle" size={18} color="#30D158" style={{ marginRight: 8 }} />
                              ) : (
                                <Ionicons name="flag" size={18} color="#5AC8FA" style={{ marginRight: 8 }} />
                              )}
                              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>{sg.title}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '500', marginRight: 12 }}>
                                {sgCompleted} / {sg.targetMetric ? sg.targetMetric : sgItems.length} ({sgPct}%)
                              </Text>
                              <View style={{ backgroundColor: '#1C1C1E', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ color: '#5AC8FA', fontSize: 10, fontWeight: '600' }}>{timeframeLabel}</Text>
                              </View>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Pressable onPress={() => handleOpenEditSubGoal(sg)} style={{ padding: 8, marginRight: 4 }}>
                              <Ionicons name="ellipsis-horizontal" size={18} color="#8E8E93" />
                            </Pressable>
                            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#8E8E93" />
                          </View>
                        </Pressable>

                        {/* Accordion Content */}
                        {isExpanded && (
                          <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#3A3A3C' }}>
                            {sgItems.length > 0 ? (
                              sgItems.map(item => (
                                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                                  <Pressable onPress={() => handleToggleItem(item.id, collection.id, item.subGoalId)} style={{ marginRight: 12 }}>
                                    <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: item.completed ? '#BF5AF2' : '#8E8E93', backgroundColor: item.completed ? '#BF5AF2' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                                      {item.completed && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                    </View>
                                  </Pressable>
                                  <Text style={{ flex: 1, color: item.completed ? '#8E8E93' : '#FFF', fontSize: 15, textDecorationLine: item.completed ? 'line-through' : 'none' }}>
                                    {item.title}
                                  </Text>
                                  <Pressable onPress={() => deleteItem(item.id)} style={{ padding: 4 }}>
                                    <Ionicons name="trash-outline" size={16} color="#FF453A" />
                                  </Pressable>
                                </View>
                              ))
                            ) : (
                              <Text style={{ color: '#8E8E93', fontSize: 13, marginTop: 12, fontStyle: 'italic' }}>No tasks added yet.</Text>
                            )}

                            {/* Shadcn Quick-Add Task Chip */}
                            <Pressable 
                              onPress={() => {
                                handleOpenNewItem(collection.id);
                                setSelectedSubGoalId(sg.id);
                              }}
                              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#1C1C1E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#2C2C2E' }}
                            >
                              <Ionicons name="add" size={16} color="#BF5AF2" style={{ marginRight: 6 }} />
                              <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Add Task</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {/* Root-Level Items (Items without a Sub-Goal) */}
                  {collectionItems.filter(i => !i.subGoalId).map(item => (
                    <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' }}>
                      <Pressable onPress={() => handleToggleItem(item.id, collection.id)} style={{ marginRight: 12 }}>
                        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: item.completed ? '#BF5AF2' : '#8E8E93', backgroundColor: item.completed ? '#BF5AF2' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                          {item.completed && <Ionicons name="checkmark" size={16} color="#FFF" />}
                        </View>
                      </Pressable>
                      <Text style={{ flex: 1, color: item.completed ? '#8E8E93' : '#FFF', fontSize: 15, textDecorationLine: item.completed ? 'line-through' : 'none' }}>
                        {item.title}
                      </Text>
                      <Pressable onPress={() => deleteItem(item.id)} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={16} color="#FF453A" />
                      </Pressable>
                    </View>
                  ))}

                  {/* Quick Action Chips Footer */}
                  <View style={{ flexDirection: 'row', marginTop: 16 }}>
                    <Pressable
                      onPress={() => handleOpenNewSubGoal(collection.id)}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#252528', paddingVertical: 12, borderRadius: 10, marginRight: 6, borderWidth: 1, borderColor: '#3A3A3C' }}
                    >
                      <Ionicons name="folder-open" size={16} color="#5AC8FA" style={{ marginRight: 8 }} />
                      <Text style={{ color: '#5AC8FA', fontSize: 13, fontWeight: '700' }}>+ Sub-Goal</Text>
                    </Pressable>
                    
                    <Pressable 
                      onPress={() => handleOpenNewItem(collection.id)}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#BF5AF215', paddingVertical: 12, borderRadius: 10, marginLeft: 6, borderWidth: 1, borderColor: '#BF5AF233' }}
                    >
                      <Ionicons name="list" size={16} color="#BF5AF2" style={{ marginRight: 8 }} />
                      <Text style={{ color: '#BF5AF2', fontSize: 13, fontWeight: '700' }}>+ Task</Text>
                    </Pressable>
                  </View>

                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Celebration Dopamine Modal */}
      <Modal visible={!!celebrationInfo} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#1C1C1E', borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 2, borderColor: '#BF5AF2', maxWidth: 480, width: '100%' }}>
            <View style={{ backgroundColor: '#BF5AF222', width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#BF5AF255' }}>
              {celebrationInfo && <CelebrationVectorIcon type={celebrationInfo.iconType} category={celebrationInfo.category} />}
            </View>
            <View style={{ backgroundColor: '#BF5AF222', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#BF5AF2' }}>
              <Text style={{ color: '#BF5AF2', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
                {celebrationInfo?.badgeLabel}
              </Text>
            </View>
            <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>
              {celebrationInfo?.title}
            </Text>
            <Text style={{ color: '#8E8E93', fontSize: 14, textAlign: 'center', marginBottom: 16, lineHeight: 20 }}>
              {celebrationInfo?.subtitle}
            </Text>
            <View style={{ backgroundColor: '#252528', padding: 14, borderRadius: 14, width: '100%', marginBottom: 24, borderWidth: 1, borderColor: '#3A3A3C' }}>
              <Text style={{ color: '#5AC8FA', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                {celebrationInfo?.payoutText}
              </Text>
            </View>
            <Pressable
              onPress={() => setCelebrationInfo(null)}
              style={{ backgroundColor: '#BF5AF2', width: '100%', padding: 16, borderRadius: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Claim & Continue 🔥</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Journey Create/Edit Modal */}
      <Modal visible={isJourneyModalOpen} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#0E0E10', borderRadius: 24, padding: 24, maxWidth: 480, width: '100%', borderWidth: 1, borderColor: '#2C2C2E', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }}>{editingJourneyId ? 'Edit Journey' : 'New Journey'}</Text>
              <Pressable onPress={() => setIsJourneyModalOpen(false)} style={{ backgroundColor: '#2C2C2E', padding: 6, borderRadius: 12 }}>
                <Ionicons name="close" size={20} color="#8E8E93" />
              </Pressable>
            </View>

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Journey Title</Text>
            <PremiumInput
              style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 16, borderRadius: 16, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#2C2C2E' }}
              placeholder="e.g., Reading List 2026, Fitness Quest"
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

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Linked Macro Goal (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }}>
              <Pressable
                onPress={() => setSelectedMacroId('')}
                style={{
                  backgroundColor: selectedMacroId === '' ? 'rgba(191,90,242,0.15)' : '#151517',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  marginRight: 10,
                  borderWidth: 1,
                  borderColor: selectedMacroId === '' ? 'rgba(191,90,242,0.3)' : '#2C2C2E'
                }}
              >
                <Text style={{ color: selectedMacroId === '' ? '#FFFFFF' : '#8E8E93', fontWeight: selectedMacroId === '' ? '700' : '500', fontSize: 14 }}>None</Text>
              </Pressable>
              {macroGoals.map((mg) => {
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

            <PrimaryButton
              onPress={handleSaveJourney}
              title={editingJourneyId ? 'Save Changes' : 'Launch Journey'}
              style={{ width: '100%' }}
            />
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

            {/* Check if linked to macro goal */}
            {(() => {
              const col = collections.find(c => c.id === deletingJourneyId);
              const hasMacro = col && col.macroGoalId;
              if (hasMacro) {
                return (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: '#5AC8FA', fontSize: 12, textAlign: 'center', marginBottom: 12, fontWeight: '600' }}>
                      This journey is linked to a Macro Goal.
                    </Text>
                    <Pressable
                      onPress={() => handleConfirmDeleteJourney(true)}
                      style={{ backgroundColor: '#FF453A', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Delete Journey & Linked Macro Goal</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleConfirmDeleteJourney(false)}
                      style={{ backgroundColor: '#2C2C2E', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600' }}>Delete Journey Only (Keep Macro Goal)</Text>
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

      {/* Sub-Goal Create/Edit Modal - Centered Compact Card with 2-Row Month Grid */}
      <Modal visible={isSubGoalModalOpen} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#1C1C1E', borderRadius: 24, padding: 24, maxWidth: 480, width: '100%', borderWidth: 1, borderColor: '#3A3A3C' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800' }}>{editingSubGoalId ? 'Edit Sub-Goal' : 'New Sub-Goal'}</Text>
              <Pressable onPress={() => setIsSubGoalModalOpen(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </Pressable>
            </View>

            {/* Goal Title Input */}
            <Text style={{ color: '#8E8E93', marginBottom: 6, fontSize: 12, fontWeight: '600' }}>Goal Title</Text>
            <PremiumInput
              style={{ backgroundColor: '#252528', color: '#FFF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: '#3A3A3C' }}
              placeholder="e.g., Fiction, Self-Help, Economics, Hikes, Running"
              placeholderTextColor="#8E8E93"
              value={subGoalTitle}
              onChangeText={setSubGoalTitle}
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
                  value={subGoalTargetMetric}
                  onChangeText={setSubGoalTargetMetric}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ width: 120 }}>
                <Text style={{ color: '#8E8E93', marginBottom: 6, fontSize: 12, fontWeight: '600' }}>Target Year</Text>
                <PremiumInput
                  style={{ backgroundColor: '#252528', color: '#FFF', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#3A3A3C' }}
                  placeholder={`e.g., ${currentYear}`}
                  placeholderTextColor="#8E8E93"
                  value={subGoalYear}
                  onChangeText={setSubGoalYear}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Month Selection 2-Row Grid */}
            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600' }}>Month</Text>

            {/* Row 1: All Year + Jan-May */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              <Pressable
                onPress={() => setSubGoalMonth('')}
                style={{
                  backgroundColor: subGoalMonth === '' ? '#BF5AF2' : '#252528',
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: subGoalMonth === '' ? '#BF5AF2' : '#3A3A3C',
                  flex: 1,
                  alignItems: 'center',
                  minWidth: 70
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>All Year</Text>
              </Pressable>
              {MONTH_NAMES.slice(0, 5).map((mName, idx) => {
                const mNum = (idx + 1).toString();
                const isSel = subGoalMonth === mNum;
                return (
                  <Pressable
                    key={mNum}
                    onPress={() => setSubGoalMonth(mNum)}
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
                const isSel = subGoalMonth === mNum;
                return (
                  <Pressable
                    key={mNum}
                    onPress={() => setSubGoalMonth(mNum)}
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
              onPress={handleSaveSubGoal}
              title={editingSubGoalId ? 'Save Sub-Goal' : 'Create Sub-Goal'}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </Modal>

      {/* Item Create Modal */}
      <Modal visible={isItemModalOpen} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#1C1C1E', borderRadius: 24, padding: 24, maxWidth: 480, width: '100%', borderWidth: 1, borderColor: '#3A3A3C' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800' }}>Add Item</Text>
              <Pressable onPress={() => setIsItemModalOpen(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </Pressable>
            </View>

            <Text style={{ color: '#8E8E93', marginBottom: 6, fontSize: 12, fontWeight: '600' }}>Item Name</Text>
            <PremiumInput
              style={{ backgroundColor: '#252528', color: '#FFF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: '#3A3A3C' }}
              placeholder="e.g., The Great Gatsby, 5km Morning Run"
              placeholderTextColor="#8E8E93"
              value={itemTitle}
              onChangeText={setItemTitle}
              autoFocus
            />

            {/* Sub-Goal Assignment Selector */}
            {(() => {
              const availableSubGoals = (subGoals || []).filter(s => s.collectionId === activeCollectionId);
              if (availableSubGoals.length > 0) {
                return (
                  <View style={{ marginBottom: 14 }}>
                    <Text style={{ color: '#8E8E93', marginBottom: 6, fontSize: 12, fontWeight: '600' }}>Sub-Goal Assignment</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Pressable
                        onPress={() => setSelectedSubGoalId('')}
                        style={{
                          backgroundColor: selectedSubGoalId === '' ? '#BF5AF2' : '#252528',
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 10,
                          marginRight: 6,
                          borderWidth: 1,
                          borderColor: selectedSubGoalId === '' ? '#BF5AF2' : '#3A3A3C'
                        }}
                      >
                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>General (None)</Text>
                      </Pressable>
                      {availableSubGoals.map((sg) => (
                        <Pressable
                          key={sg.id}
                          onPress={() => setSelectedSubGoalId(sg.id)}
                          style={{
                            backgroundColor: selectedSubGoalId === sg.id ? '#BF5AF2' : '#252528',
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 10,
                            marginRight: 6,
                            borderWidth: 1,
                            borderColor: selectedSubGoalId === sg.id ? '#BF5AF2' : '#3A3A3C'
                          }}
                        >
                          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{sg.title}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                );
              }
              return null;
            })()}

            <Text style={{ color: '#8E8E93', marginBottom: 6, fontSize: 12, fontWeight: '600' }}>Estimated Time (Minutes) [Optional]</Text>
            <PremiumInput
              style={{ backgroundColor: '#252528', color: '#FFF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, fontSize: 15, marginBottom: 20, borderWidth: 1, borderColor: '#3A3A3C' }}
              placeholder="e.g., 480"
              placeholderTextColor="#8E8E93"
              value={itemEstimatedMinutes}
              onChangeText={setItemEstimatedMinutes}
              keyboardType="numeric"
            />

            <PrimaryButton
              onPress={handleCreateItem}
              title="Add Item"
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
