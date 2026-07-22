import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCollectionStore, CollectionCategory, JourneySubGoal } from '../store/collectionStore';
import { useMacroGoalStore } from '../store/macroGoalStore';
import { useConfettiStore } from '../store/confettiStore';

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

function CategoryVectorIcon({ category, size = 20, color = '#AF52DE' }: { category: CollectionCategory; size?: number; color?: string }) {
  switch (category) {
    case 'books':
      return <FontAwesome5 name="book-open" size={size} color={color} />;
    case 'games':
      return <Ionicons name="game-controller" size={size + 2} color={color} />;
    case 'fitness':
      return <FontAwesome5 name="dumbbell" size={size - 2} color={color} />;
    case 'stocks':
      return <Ionicons name="trending-up" size={size + 2} color={color} />;
    case 'courses':
      return <FontAwesome5 name="graduation-cap" size={size - 2} color={color} />;
    case 'travel':
      return <Ionicons name="airplane" size={size + 2} color={color} />;
    case 'other':
    default:
      return <Ionicons name="star" size={size} color={color} />;
  }
}

function CelebrationVectorIcon({ type, category }: { type: CelebrationInfo['iconType']; category?: CollectionCategory }) {
  if (type === 'category' && category) {
    return <CategoryVectorIcon category={category} size={48} color="#AF52DE" />;
  }
  switch (type) {
    case 'rocket':
      return <Ionicons name="rocket-sharp" size={48} color="#AF52DE" />;
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
      setCelebrationInfo({
        title: 'QUEST LAUNCHED!',
        subtitle: `Journey "${journeyTitle.trim()}" is live in your Discipline Economy.`,
        iconType: 'rocket',
        category: journeyCategory,
        payoutText: '🎁 Estimated Rewards: Milestone keys & cash bonus multipliers upon completion!',
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
      setCelebrationInfo({
        title: 'SUB-QUEST CREATED!',
        subtitle: `Bucket "${subGoalTitle.trim()}" added to your journey timeframe targets.`,
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
      if (subGoalId) {
        const sgItems = items.filter(i => i.subGoalId === subGoalId);
        const sgCompletedCount = sgItems.filter(i => i.completed).length + 1; // including current
        const sg = subGoals.find(s => s.id === subGoalId);
        const targetVal = sg?.targetMetric || sgItems.length;

        if (sgCompletedCount >= targetVal && targetVal > 0) {
          triggerConfetti();
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }} edges={['top']}>
      {/* Header Bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginRight: 10 }}>Journeys</Text>
          <View style={{ backgroundColor: '#AF52DE22', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#AF52DE55', flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="map-outline" size={12} color="#AF52DE" style={{ marginRight: 4 }} />
            <Text style={{ color: '#AF52DE', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>QUEST LOG</Text>
          </View>
        </View>
        <Pressable onPress={handleOpenNewJourney} style={{ backgroundColor: '#AF52DE', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#AF52DE', shadowRadius: 8, shadowOpacity: 0.5 }}>
          <Ionicons name="add" size={26} color="#FFF" />
        </Pressable>
      </View>

      {/* Timeframe Filter Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12 }}>
        <Pressable
          onPress={() => setTimeframeFilter('all')}
          style={{
            backgroundColor: timeframeFilter === 'all' ? '#AF52DE' : '#1C1C1E',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 16,
            marginRight: 8,
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>All Quests</Text>
        </Pressable>

        <Pressable
          onPress={() => setTimeframeFilter('year')}
          style={{
            backgroundColor: timeframeFilter === 'year' ? '#AF52DE' : '#1C1C1E',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 16,
            marginRight: 8,
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>{currentYear} (Year)</Text>
        </Pressable>

        <Pressable
          onPress={() => setTimeframeFilter('month')}
          style={{
            backgroundColor: timeframeFilter === 'month' ? '#AF52DE' : '#1C1C1E',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 16,
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>{MONTH_NAMES[currentMonth - 1]} {currentYear}</Text>
        </Pressable>
      </View>

      {/* Journeys List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {collections.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40, backgroundColor: '#1C1C1E', borderRadius: 20, padding: 32, borderWidth: 1, borderColor: '#2C2C2E' }}>
            <View style={{ backgroundColor: '#AF52DE22', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <FontAwesome5 name="compass" size={32} color="#AF52DE" />
            </View>
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700', textAlign: 'center' }}>No Active Journeys</Text>
            <Text style={{ color: '#8E8E93', marginTop: 8, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              Launch your first RPG-style Journey to track reading targets, fitness quests, and multi-month discipline milestones!
            </Text>
            <Pressable onPress={handleOpenNewJourney} style={{ backgroundColor: '#AF52DE', marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}>
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>+ Launch First Journey</Text>
            </Pressable>
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
              <View key={collection.id} style={{ marginBottom: 24, backgroundColor: '#1C1C1E', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: isFullyComplete ? '#AF52DE' : '#2C2C2E', shadowColor: isFullyComplete ? '#AF52DE' : '#000', shadowRadius: 10, shadowOpacity: isFullyComplete ? 0.3 : 0.1 }}>
                {/* Journey Card Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ backgroundColor: '#2C2C2E', width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#3A3A3C' }}>
                        <CategoryVectorIcon category={collection.category} size={18} color="#AF52DE" />
                      </View>
                      <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800' }}>{collection.title}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                      <View style={{ backgroundColor: '#2C2C2E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 6 }}>
                        <Text style={{ color: '#AF52DE', fontSize: 11, textTransform: 'uppercase', fontWeight: '700' }}>
                          {collection.category}
                        </Text>
                      </View>
                      {linkedMacro && (
                        <View style={{ backgroundColor: '#5AC8FA15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#5AC8FA44', flexDirection: 'row', alignItems: 'center' }}>
                          <FontAwesome5 name="bullseye" size={10} color="#5AC8FA" style={{ marginRight: 4 }} />
                          <Text style={{ color: '#5AC8FA', fontSize: 11, fontWeight: '700' }}>{linkedMacro.title}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pressable onPress={() => handleOpenEditJourney(collection.id)} style={{ padding: 6, marginRight: 4 }}>
                      <Ionicons name="pencil-outline" size={18} color="#8E8E93" />
                    </Pressable>
                    <Pressable onPress={() => setDeletingJourneyId(collection.id)} style={{ padding: 6 }}>
                      <Ionicons name="trash-outline" size={18} color="#FF453A" />
                    </Pressable>
                  </View>
                </View>

                {/* Journey Overall Progress Level Bar */}
                <View style={{ backgroundColor: '#252528', padding: 12, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: '#3A3A3C' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ color: '#8E8E93', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>QUEST PROGRESS</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {isFullyComplete && <FontAwesome5 name="crown" size={12} color="#FFD700" style={{ marginRight: 4 }} />}
                      <Text style={{ color: isFullyComplete ? '#30D158' : '#AF52DE', fontSize: 14, fontWeight: '800' }}>
                        {completedCount}/{collectionItems.length} ({progress}%)
                      </Text>
                    </View>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#1C1C1E', borderRadius: 3 }}>
                    <View style={{ height: 6, width: `${progress}%`, backgroundColor: isFullyComplete ? '#30D158' : '#AF52DE', borderRadius: 3 }} />
                  </View>
                </View>

                {/* Sub-Goal Buckets Section */}
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

                  return (
                    <View key={sg.id} style={{ backgroundColor: '#252528', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: isSgComplete ? '#30D15866' : '#3A3A3C' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          {isSgComplete ? (
                            <Ionicons name="trophy" size={15} color="#FFD700" style={{ marginRight: 6 }} />
                          ) : (
                            <FontAwesome5 name="crosshairs" size={13} color="#5AC8FA" style={{ marginRight: 6 }} />
                          )}
                          <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>{sg.title}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ color: '#5AC8FA', fontSize: 11, fontWeight: '700', marginRight: 8 }}>{timeframeLabel}</Text>
                          <Pressable onPress={() => handleOpenEditSubGoal(sg)} style={{ marginRight: 6 }}>
                            <Ionicons name="ellipsis-horizontal" size={16} color="#8E8E93" />
                          </Pressable>
                          <Pressable onPress={() => deleteSubGoal(sg.id)}>
                            <Ionicons name="close-circle-outline" size={16} color="#FF453A" />
                          </Pressable>
                        </View>
                      </View>

                      {/* Sub-Goal Progress Bar */}
                      <View style={{ height: 5, backgroundColor: '#1C1C1E', borderRadius: 3, marginVertical: 6 }}>
                        <View style={{ height: 5, width: `${sgPct}%`, backgroundColor: isSgComplete ? '#30D158' : '#AF52DE', borderRadius: 3 }} />
                      </View>
                      <Text style={{ color: '#8E8E93', fontSize: 11, textAlign: 'right', fontWeight: '600' }}>
                        {sgCompleted}/{sg.targetMetric ? sg.targetMetric : sgItems.length} completed ({sgPct}%)
                      </Text>
                    </View>
                  );
                })}

                {/* Add Sub-Goal Creator Button */}
                <Pressable
                  onPress={() => handleOpenNewSubGoal(collection.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C2C2E', paddingVertical: 10, borderRadius: 10, marginBottom: 16 }}
                >
                  <Ionicons name="pricetag-outline" size={16} color="#5AC8FA" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#5AC8FA', fontSize: 13, fontWeight: '700' }}>+ Add Sub-Goal Bucket (e.g. Fiction, Hikes)</Text>
                </Pressable>

                {/* Items List */}
                {collectionItems.map(item => {
                  const itemSubGoal = (subGoals || []).find(s => s.id === item.subGoalId);

                  return (
                    <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#2C2C2E' }}>
                      <Pressable onPress={() => handleToggleItem(item.id, collection.id, item.subGoalId)} style={{ marginRight: 12 }}>
                        <Ionicons 
                          name={item.completed ? "checkmark-circle" : "ellipse-outline"} 
                          size={24} 
                          color={item.completed ? "#AF52DE" : "#8E8E93"} 
                        />
                      </Pressable>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Text style={{ color: item.completed ? '#8E8E93' : '#FFF', fontSize: 16, textDecorationLine: item.completed ? 'line-through' : 'none', marginRight: 6 }}>
                            {item.title}
                          </Text>
                          {itemSubGoal && (
                            <View style={{ backgroundColor: '#AF52DE22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                              <Text style={{ color: '#AF52DE', fontSize: 10, fontWeight: '700' }}>{itemSubGoal.title}</Text>
                            </View>
                          )}
                        </View>
                        {item.isAddedLater && (
                          <Text style={{ color: '#5AC8FA', fontSize: 10, marginTop: 2 }}>Added Later</Text>
                        )}
                      </View>
                      <Pressable onPress={() => deleteItem(item.id)}>
                        <Ionicons name="trash-outline" size={18} color="#FF453A" />
                      </Pressable>
                    </View>
                  );
                })}

                {/* Add Item Button */}
                <Pressable 
                  onPress={() => handleOpenNewItem(collection.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#2C2C2E' }}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#AF52DE" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#AF52DE', fontSize: 14, fontWeight: '700' }}>Add Item</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Celebration Dopamine Modal */}
      <Modal visible={!!celebrationInfo} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#1C1C1E', borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 2, borderColor: '#AF52DE' }}>
            <View style={{ backgroundColor: '#AF52DE22', width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#AF52DE55' }}>
              {celebrationInfo && <CelebrationVectorIcon type={celebrationInfo.iconType} category={celebrationInfo.category} />}
            </View>
            <View style={{ backgroundColor: '#AF52DE22', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#AF52DE' }}>
              <Text style={{ color: '#AF52DE', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
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
              style={{ backgroundColor: '#AF52DE', width: '100%', padding: 16, borderRadius: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Claim & Continue 🔥</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Journey Create/Edit Modal */}
      <Modal visible={isJourneyModalOpen} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 420 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700' }}>{editingJourneyId ? 'Edit Journey' : 'New Journey Quest'}</Text>
              <Pressable onPress={() => setIsJourneyModalOpen(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </Pressable>
            </View>

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Title</Text>
            <TextInput
              style={{ backgroundColor: '#2C2C2E', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16 }}
              placeholder="e.g., Reading List 2026, Fitness Quest"
              placeholderTextColor="#8E8E93"
              value={journeyTitle}
              onChangeText={setJourneyTitle}
              autoFocus
            />

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
              {categories.map(c => (
                <Pressable 
                  key={c}
                  onPress={() => setJourneyCategory(c)}
                  style={{ 
                    backgroundColor: journeyCategory === c ? '#AF52DE' : '#2C2C2E',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    marginRight: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ marginRight: 8 }}>
                    <CategoryVectorIcon category={c} size={16} color="#FFF" />
                  </View>
                  <Text style={{ color: '#FFF', fontWeight: '600', textTransform: 'capitalize' }}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Link to Macro Goal (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }}>
              <Pressable
                onPress={() => setSelectedMacroId('')}
                style={{
                  backgroundColor: selectedMacroId === '' ? '#AF52DE' : '#2C2C2E',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '600' }}>None</Text>
              </Pressable>
              {macroGoals.map((mg) => (
                <Pressable
                  key={mg.id}
                  onPress={() => setSelectedMacroId(mg.id)}
                  style={{
                    backgroundColor: selectedMacroId === mg.id ? '#AF52DE' : '#2C2C2E',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>{mg.title}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              onPress={handleSaveJourney}
              style={{ backgroundColor: '#AF52DE', padding: 16, borderRadius: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>{editingJourneyId ? 'Save Changes' : '🚀 Launch Journey Quest'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Delete Journey Confirmation Modal */}
      <Modal visible={!!deletingJourneyId} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#1C1C1E', borderRadius: 20, padding: 24 }}>
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

      {/* Sub-Goal Create/Edit Modal */}
      <Modal visible={isSubGoalModalOpen} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 460 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700' }}>{editingSubGoalId ? 'Edit Sub-Goal' : 'New Sub-Goal Bucket'}</Text>
              <Pressable onPress={() => setIsSubGoalModalOpen(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </Pressable>
            </View>

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Sub-Goal Name / Category</Text>
            <TextInput
              style={{ backgroundColor: '#2C2C2E', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16 }}
              placeholder="e.g., Fiction, Self-Help, Economics, Hikes, Running"
              placeholderTextColor="#8E8E93"
              value={subGoalTitle}
              onChangeText={setSubGoalTitle}
              autoFocus
            />

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Target Units / Count (Optional)</Text>
            <TextInput
              style={{ backgroundColor: '#2C2C2E', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16 }}
              placeholder="e.g., 3 (books or activities target)"
              placeholderTextColor="#8E8E93"
              value={subGoalTargetMetric}
              onChangeText={setSubGoalTargetMetric}
              keyboardType="numeric"
            />

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Target Year</Text>
            <TextInput
              style={{ backgroundColor: '#2C2C2E', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16 }}
              placeholder={`e.g., ${currentYear}`}
              placeholderTextColor="#8E8E93"
              value={subGoalYear}
              onChangeText={setSubGoalYear}
              keyboardType="numeric"
            />

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Target Month (1-12)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
              <Pressable
                onPress={() => setSubGoalMonth('')}
                style={{
                  backgroundColor: subGoalMonth === '' ? '#AF52DE' : '#2C2C2E',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 12,
                  marginRight: 6,
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '600' }}>All Year / None</Text>
              </Pressable>
              {MONTH_NAMES.map((mName, idx) => {
                const mNum = (idx + 1).toString();
                return (
                  <Pressable
                    key={mNum}
                    onPress={() => setSubGoalMonth(mNum)}
                    style={{
                      backgroundColor: subGoalMonth === mNum ? '#AF52DE' : '#2C2C2E',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 12,
                      marginRight: 6,
                    }}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '600' }}>{mName}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={handleSaveSubGoal}
              style={{ backgroundColor: '#AF52DE', padding: 16, borderRadius: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>{editingSubGoalId ? 'Save Sub-Goal' : '🎯 Create Sub-Goal Bucket'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Item Create Modal */}
      <Modal visible={isItemModalOpen} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 380 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700' }}>Add Item</Text>
              <Pressable onPress={() => setIsItemModalOpen(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </Pressable>
            </View>

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Item Name</Text>
            <TextInput
              style={{ backgroundColor: '#2C2C2E', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16 }}
              placeholder="e.g., The Great Gatsby, 5km Morning Run"
              placeholderTextColor="#8E8E93"
              value={itemTitle}
              onChangeText={setItemTitle}
              autoFocus
            />

            {/* Sub-Goal Bucket Selector */}
            {(() => {
              const availableSubGoals = (subGoals || []).filter(s => s.collectionId === activeCollectionId);
              if (availableSubGoals.length > 0) {
                return (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Assign to Sub-Goal Bucket</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Pressable
                        onPress={() => setSelectedSubGoalId('')}
                        style={{
                          backgroundColor: selectedSubGoalId === '' ? '#AF52DE' : '#2C2C2E',
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 12,
                          marginRight: 6,
                        }}
                      >
                        <Text style={{ color: '#FFF', fontWeight: '600' }}>General (None)</Text>
                      </Pressable>
                      {availableSubGoals.map((sg) => (
                        <Pressable
                          key={sg.id}
                          onPress={() => setSelectedSubGoalId(sg.id)}
                          style={{
                            backgroundColor: selectedSubGoalId === sg.id ? '#AF52DE' : '#2C2C2E',
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 12,
                            marginRight: 6,
                          }}
                        >
                          <Text style={{ color: '#FFF', fontWeight: '600' }}>{sg.title}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                );
              }
              return null;
            })()}

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Estimated Time (Minutes) [Optional]</Text>
            <TextInput
              style={{ backgroundColor: '#2C2C2E', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 24 }}
              placeholder="e.g., 480"
              placeholderTextColor="#8E8E93"
              value={itemEstimatedMinutes}
              onChangeText={setItemEstimatedMinutes}
              keyboardType="numeric"
            />

            <Pressable
              onPress={handleCreateItem}
              style={{ backgroundColor: '#AF52DE', padding: 16, borderRadius: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Add Item</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
