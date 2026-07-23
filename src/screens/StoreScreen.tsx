import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEconomyStore } from '../store/economyStore';
import { useRewardStore, Reward } from '../store/rewardStore';
import { useMacroGoalStore, MacroGoal } from '../store/macroGoalStore';
import TimeSelectorModal from '../components/TimeSelectorModal';
import { hapticSuccess, hapticError } from '../utils/haptics';
import { useConfettiStore } from '../store/confettiStore';
import ConfirmModal, { ConfirmAction } from '../components/ConfirmModal';
import AnimatedMacroGoalCard from '../components/AnimatedMacroGoalCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTaskStore } from '../store/taskStore';
import { useTimerStore } from '../store/timerStore';
import QuickStartModal from '../components/QuickStartModal';

type DialogConfig = {
  icon: string;
  iconColor: string;
  accentColor: string;
  title: string;
  message: string;
  actions: ConfirmAction[];
};

export default function StoreScreen() {
  const {
    dollarBalance,
    hoursBalanceMinutes,
    spendBalance,
    debt,
    getCreditScore,
    getCreditLimit,
    isInDefault,
    getConversionRate,
  } = useEconomyStore();
  const { rewards, addReward, deleteReward } = useRewardStore();
  const { macroGoals, addMacroGoal } = useMacroGoalStore();

  const hoursDisplay = (hoursBalanceMinutes / 60).toFixed(1);
  const conversionInfo = getConversionRate();
  const entertainmentGoals = macroGoals.filter((g) => g.type === 'entertainment');

  // Tab state ('time' vs 'material')
  const [activeTab, setActiveTab] = useState<'time' | 'material'>('time');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [costOrHours, setCostOrHours] = useState('');
  const [projectMinutes, setProjectMinutes] = useState(0);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [quickStartGoal, setQuickStartGoal] = useState<MacroGoal | null>(null);
  
  const [projectCategory, setProjectCategory] = useState<'video-game' | 'movie' | 'tv-show' | 'youtube' | 'custom'>('custom');
  const [isOpenEnded, setIsOpenEnded] = useState(false);

  const { addTask } = useTaskStore();
  const { startTimer } = useTimerStore();

  // Custom dialog state
  const [dialog, setDialog] = useState<DialogConfig | null>(null);

  const closeDialog = () => setDialog(null);

  const handleAddMaterialReward = () => {
    setValidationError('');

    if (!title.trim()) {
      setValidationError('Reward title is required');
      return;
    }

    const price = parseFloat(costOrHours);
    if (isNaN(price) || price <= 0) {
      setValidationError('Cost must be a valid dollar amount');
      return;
    }

    addReward({
      title: title.trim(),
      cost: Math.round(price * 100) / 100,
    });

    setTitle('');
    setCostOrHours('');
    setShowAddModal(false);
  };

  const handleAddEntertainmentProject = () => {
    setValidationError('');

    if (!title.trim()) {
      setValidationError('Title is required');
      return;
    }
    
    // For Parent project, must have a target duration > 0
    if (!selectedParentId && projectMinutes <= 0) {
      setValidationError('Parent projects must have a target duration > 0');
      return;
    }
    
    // For Sub-projects, if it's not open ended, it must have duration
    if (selectedParentId && !isOpenEnded && projectMinutes <= 0) {
      setValidationError('Please set a target duration or mark as Open Ended');
      return;
    }

    addMacroGoal({
      title: title.trim(),
      horizon: 'yearly',
      targetMinutes: (selectedParentId && isOpenEnded) ? 0 : projectMinutes,
      type: 'entertainment',
      parentId: selectedParentId || undefined,
      category: !selectedParentId ? projectCategory : undefined,
    });

    setTitle('');
    setProjectMinutes(0);
    setSelectedParentId('');
    setProjectCategory('custom');
    setIsOpenEnded(false);
    setShowAddModal(false);
  };

  const handleQuickStart = (t: string, tagId: string, targetId: string, minutes: number) => {
    const newTaskId = addTask({
      title: t,
      tagId,
      estimatedMinutes: minutes,
      macroGoalId: targetId,
      isIcebox: false,
    });
    const res = startTimer(newTaskId, minutes);
    if (res && res.success === false && res.reason === 'insufficient_hours') {
      const missingHours = ((res.missingMinutes || 0) / 60).toFixed(1);
      setDialog({
        icon: 'time-outline',
        iconColor: '#FF453A',
        accentColor: '#FF453A',
        title: 'Not Enough Time Earned',
        message: `You need ${missingHours} more hours of focus to earn this entertainment session.\n\nKeep focusing on productive tasks to earn leisure time!`,
        actions: [
          { label: 'Got It', onPress: () => {}, style: 'default' },
        ],
      });
    } else {
      // Provide haptic feedback so they know it started
      hapticSuccess();
    }
  };

  const handleRedeem = (reward: Reward) => {
    if (isInDefault) {
      setDialog({
        icon: 'warning-outline',
        iconColor: '#FF9F0A',
        accentColor: '#FF9F0A',
        title: 'Account in Default',
        message: 'You cannot redeem rewards or make transactions while your account is in default. Pay off your debt to restore access.',
        actions: [
          { label: 'Got It', onPress: () => {}, style: 'default' },
        ],
      });
      return;
    }

    const canAffordCash = dollarBalance >= reward.cost;
    const currentScore = getCreditScore();
    const limit = getCreditLimit(currentScore);
    const remainingLimit = limit - debt;
    const deficit = reward.cost - dollarBalance;
    const canAffordCredit = !canAffordCash && deficit <= remainingLimit;

    if (!canAffordCash && !canAffordCredit) {
      setDialog({
        icon: 'close-circle-outline',
        iconColor: '#FF453A',
        accentColor: '#FF453A',
        title: 'Insufficient Funds',
        message: `"${reward.title}" costs $${reward.cost.toFixed(2)}.\n\nYour cash: $${dollarBalance.toFixed(2)}\nCredit remaining: $${remainingLimit.toFixed(2)}\n\nKeep focusing to earn more dollars.`,
        actions: [
          { label: 'Keep Grinding', onPress: () => {}, style: 'cancel' },
        ],
      });
      return;
    }

    if (canAffordCash) {
      setDialog({
        icon: 'cash-outline',
        iconColor: '#30D158',
        accentColor: '#30D158',
        title: 'Redeem Reward',
        message: `Spend $${reward.cost.toFixed(2)} from your cash balance for\n"${reward.title}"?`,
        actions: [
          { label: 'Cancel', onPress: () => {}, style: 'cancel' },
          {
            label: `Redeem — $${reward.cost.toFixed(2)}`,
            style: 'default',
            onPress: () => {
              const success = spendBalance(reward.cost, false);
              if (success) {
                hapticSuccess();
                useConfettiStore.getState().triggerConfetti();
              } else {
                hapticError();
              }
            },
          },
        ],
      });
    } else {
      setDialog({
        icon: 'card-outline',
        iconColor: '#0A84FF',
        accentColor: '#0A84FF',
        title: 'Buy on Credit',
        message: `You're $${deficit.toFixed(2)} short. Borrow on credit to redeem "${reward.title}"?\n\nDebt accrues daily interest. All future earnings will repay this first.`,
        actions: [
          { label: 'Cancel', onPress: () => {}, style: 'cancel' },
          {
            label: `Borrow $${deficit.toFixed(2)} & Redeem`,
            style: 'default',
            onPress: () => {
              const success = spendBalance(reward.cost, true);
              if (success) {
                hapticSuccess();
                useConfettiStore.getState().triggerConfetti();
              } else {
                hapticError();
                setDialog({
                  icon: 'close-circle-outline',
                  iconColor: '#FF453A',
                  accentColor: '#FF453A',
                  title: 'Transaction Failed',
                  message: 'Could not complete the credit transaction. Please try again.',
                  actions: [{ label: 'OK', onPress: () => {}, style: 'cancel' }],
                });
              }
            },
          },
        ],
      });
    }
  };

  const handleDelete = (id: string, rewardTitle: string) => {
    setDialog({
      icon: 'trash-outline',
      iconColor: '#FF453A',
      accentColor: '#FF453A',
      title: 'Delete Reward',
      message: `Remove "${rewardTitle}" from your store? This cannot be undone.`,
      actions: [
        { label: 'Keep It', onPress: () => {}, style: 'cancel' },
        {
          label: 'Delete',
          style: 'destructive',
          onPress: () => deleteReward(id),
        },
      ],
    });
  };

  // Render Add Item Modal (Shadcn style)
  const renderAddModal = () => (
    <>
      <Modal visible={showAddModal} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ width: '100%', maxWidth: 400, backgroundColor: '#09090B', borderWidth: 1, borderColor: '#27272A', borderRadius: 16, padding: 24 }}>
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white text-xl font-bold">
              {activeTab === 'material' ? 'Add Material Reward' : (selectedParentId ? 'Add Milestone/Quest' : 'Add Entertainment Project')}
            </Text>
            <Pressable onPress={() => setShowAddModal(false)} className="p-2 -mr-2 rounded-full">
              <Ionicons name="close" size={20} color="#8E8E93" />
            </Pressable>
          </View>

          {validationError ? (
            <View style={{ backgroundColor: 'rgba(255,69,58,0.1)', borderColor: 'rgba(255,69,58,0.3)', borderWidth: 1 }} className="p-3 rounded-lg mb-4">
              <Text className="text-[#FF453A] text-xs font-medium text-center">{validationError}</Text>
            </View>
          ) : null}

          {activeTab === 'time' && entertainmentGoals.filter(g => !g.parentId).length > 0 && (
            <View className="mb-4">
              <Text className="text-[#8E8E93] text-xs font-semibold mb-2">Parent Project (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable
                  onPress={() => setSelectedParentId('')}
                  style={{
                    backgroundColor: !selectedParentId ? 'rgba(90,200,250,0.2)' : '#09090B',
                    borderColor: !selectedParentId ? '#5AC8FA' : '#27272A',
                    borderWidth: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: !selectedParentId ? '#FFF' : '#A1A1AA', fontWeight: !selectedParentId ? '700' : '500' }}>None</Text>
                </Pressable>
                {entertainmentGoals.filter(g => !g.parentId).map(g => {
                  const isSelected = selectedParentId === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => setSelectedParentId(g.id)}
                      style={{
                        backgroundColor: isSelected ? 'rgba(90,200,250,0.2)' : '#09090B',
                        borderColor: isSelected ? '#5AC8FA' : '#27272A',
                        borderWidth: 1,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 8,
                        marginRight: 8,
                      }}
                    >
                      <Text style={{ color: isSelected ? '#FFF' : '#A1A1AA', fontWeight: isSelected ? '700' : '500' }}>{g.title}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {activeTab === 'time' && !selectedParentId && (
            <View className="mb-4">
              <Text className="text-[#8E8E93] text-xs font-semibold mb-2">Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(['video-game', 'movie', 'tv-show', 'youtube', 'custom'] as const).map(cat => {
                  const isSelected = projectCategory === cat;
                  let icon = 'star';
                  let label = 'Custom';
                  if (cat === 'video-game') { icon = 'game-controller'; label = 'Game'; }
                  if (cat === 'movie') { icon = 'film'; label = 'Movie'; }
                  if (cat === 'tv-show') { icon = 'tv'; label = 'TV'; }
                  if (cat === 'youtube') { icon = 'logo-youtube'; label = 'YouTube'; }
                  
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setProjectCategory(cat)}
                      style={{
                        backgroundColor: isSelected ? 'rgba(90,200,250,0.2)' : '#09090B',
                        borderColor: isSelected ? '#5AC8FA' : '#27272A',
                        borderWidth: 1,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 8,
                        marginRight: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Ionicons name={icon as any} size={14} color={isSelected ? '#FFF' : '#A1A1AA'} />
                      <Text style={{ color: isSelected ? '#FFF' : '#A1A1AA', fontWeight: isSelected ? '700' : '500' }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View className="mb-4">
            <Text className="text-[#8E8E93] text-xs font-semibold mb-2">Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={activeTab === 'material' ? "e.g. Mechanical Keyboard" : "e.g. Play Elden Ring"}
              placeholderTextColor="#52525B"
              spellCheck={true}
              autoCorrect={true}
              style={{ backgroundColor: '#09090B', borderColor: '#27272A', borderWidth: 1 }}
              className="text-white rounded-lg p-3 text-sm"
            />
          </View>

          <View className="mb-6">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text className="text-[#8E8E93] text-xs font-semibold mb-2">
                {activeTab === 'material' ? 'Cost ($)' : 'Target Duration'}
              </Text>
              {activeTab === 'time' && selectedParentId && (
                <Pressable onPress={() => setIsOpenEnded(!isOpenEnded)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name={isOpenEnded ? "checkbox" : "square-outline"} size={16} color={isOpenEnded ? "#5AC8FA" : "#8E8E93"} />
                  <Text style={{ color: isOpenEnded ? '#5AC8FA' : '#8E8E93', fontSize: 12, marginLeft: 4 }}>Open Ended</Text>
                </Pressable>
              )}
            </View>
            {activeTab === 'material' ? (
              <TextInput
                value={costOrHours}
                onChangeText={setCostOrHours}
                placeholder="e.g. 150.00"
                placeholderTextColor="#52525B"
                keyboardType="numeric"
                style={{ backgroundColor: '#09090B', borderColor: '#27272A', borderWidth: 1 }}
                className="text-white rounded-lg p-3 text-sm"
              />
            ) : (
              isOpenEnded ? (
                <View style={{ backgroundColor: '#1C1C1E', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#27272A', alignItems: 'center' }}>
                  <Text style={{ color: '#8E8E93', fontSize: 13, fontStyle: 'italic' }}>Will count up hours logged without a target.</Text>
                </View>
              ) : (
                <Pressable 
                  onPress={() => setShowTimeSelector(true)}
                  style={{
                    backgroundColor: '#09090B',
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#27272A',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 14 }}>
                    {Math.floor(projectMinutes / 60)}h {projectMinutes % 60}m
                  </Text>
                  <Ionicons name="time-outline" size={18} color="#A1A1AA" />
                </Pressable>
              )
            )}
          </View>

          <PrimaryButton
            onPress={activeTab === 'material' ? handleAddMaterialReward : handleAddEntertainmentProject}
            title={activeTab === 'material' ? 'Add Item' : 'Create Project'}
          />
        </View>
      </View>
      </Modal>
      
      <TimeSelectorModal
        visible={showTimeSelector}
        initialMinutes={projectMinutes}
        onClose={() => setShowTimeSelector(false)}
        onConfirm={(mins) => {
          setProjectMinutes(mins);
          setShowTimeSelector(false);
        }}
        title="Project Target Duration"
      />
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <View style={{ maxWidth: 900, width: '100%', alignSelf: 'center' }} className="flex-1 px-5">

        {/* Header */}
        <View className="flex-row justify-between items-center mt-3 mb-2">
          <Text className="text-white text-3xl font-extrabold tracking-tight">Reward Store</Text>
          
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={{
              backgroundColor: activeTab === 'time' ? 'rgba(90,200,250,0.1)' : 'rgba(48,209,88,0.1)',
              borderColor: activeTab === 'time' ? 'rgba(90,200,250,0.3)' : 'rgba(48,209,88,0.3)',
              borderWidth: 1,
            }}
            className="flex-row items-center px-4 py-2 rounded-full"
          >
            <Ionicons name="add" size={16} color={activeTab === 'time' ? '#5AC8FA' : '#30D158'} />
            <Text
              style={{ color: activeTab === 'time' ? '#5AC8FA' : '#30D158' }}
              className="font-bold ml-1 text-xs"
            >
              {activeTab === 'time' ? 'Add Project' : 'Add Item'}
            </Text>
          </Pressable>
        </View>

        {/* Shadcn Tabs */}
        <View style={{ backgroundColor: '#09090B', borderColor: '#27272A', borderWidth: 1 }} className="flex-row p-1 rounded-xl mb-4 mt-2">
          {(['time', 'material'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const label = tab === 'time' ? 'Media' : 'Material Rewards';
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: isActive ? '#27272A' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontWeight: isActive ? '600' : '500',
                    fontSize: 14,
                    color: isActive ? '#FFFFFF' : '#A1A1AA',
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="flex-1">

          {/* ========================================================================= */}
          {/* TAB 1: TIME REWARDS (CYAN) */}
          {/* ========================================================================= */}
          {activeTab === 'time' && (
            <View>
              {/* Hours Balance Banner */}
              <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(90,200,250,0.2)', borderWidth: 1 }} className="p-6 rounded-3xl items-center my-2 relative overflow-hidden">
                <View style={{ backgroundColor: 'rgba(90,200,250,0.1)' }} className="absolute w-40 h-40 rounded-full -top-10 -right-10" />
                <Text className="text-[#8E8E93] text-[10px] font-bold uppercase tracking-[2px]">
                  Available Entertainment Time
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 52, fontWeight: '900', letterSpacing: -1 }}>
                    {hoursDisplay}
                  </Text>
                  <Text style={{ color: '#5AC8FA', fontSize: 28, fontWeight: '900', marginLeft: 6 }}>
                    hours
                  </Text>
                </View>
                <View style={{ backgroundColor: 'rgba(90,200,250,0.15)' }} className="px-3.5 py-1.5 rounded-full mt-3 flex-row items-center">
                  <Ionicons name="flash-outline" size={13} color="#5AC8FA" />
                  <Text className="text-[#5AC8FA] text-[11px] font-bold ml-1.5">
                    Conversion Rate: {conversionInfo.ratioString} ({conversionInfo.focusRatio}h focus = {conversionInfo.leisureRatio}h leisure)
                  </Text>
                </View>
              </View>

              {/* Section Subhead */}
              <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px] mb-3 mt-4">
                Active Entertainment Projects
              </Text>

              {/* Active Entertainment Projects List */}
              <View style={{ marginTop: 8 }}>
                {entertainmentGoals.filter(g => !g.parentId).map((goal) => (
                  <AnimatedMacroGoalCard
                    key={goal.id}
                    goal={goal}
                    subGoals={entertainmentGoals.filter(g => g.parentId === goal.id)}
                    accentColor="#5AC8FA"
                    showIcon
                    iconName="game-controller"
                    onQuickStart={setQuickStartGoal}
                    onAddSubGoal={(parentId) => {
                      setSelectedParentId(parentId);
                      setShowAddModal(true);
                    }}
                  />
                ))}

                {/* Add New Project Card */}
                <Pressable
                  onPress={() => setShowAddModal(true)}
                  style={({ hovered }: any) => ({
                    flex: 1,
                    minWidth: 160,
                    backgroundColor: hovered ? '#18181B' : '#09090B',
                    borderColor: '#27272A',
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderRadius: 12,
                    padding: 24,
                    justifyContent: 'center',
                    alignItems: 'center',
                  })}
                >
                  <Ionicons name="add" size={28} color="#A1A1AA" />
                  <Text style={{ color: '#A1A1AA', fontWeight: '500', fontSize: 13, marginTop: 8 }}>Add Project</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: MATERIAL REWARDS (GREEN) */}
          {/* ========================================================================= */}
          {activeTab === 'material' && (
            <View>
              {/* Cash Balance Banner */}
              <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="p-6 rounded-3xl items-center my-2 relative overflow-hidden">
                <View style={{ backgroundColor: 'rgba(48,209,88,0.15)' }} className="absolute w-40 h-40 rounded-full -top-10 -right-10" />
                <Text className="text-[#8E8E93] text-[10px] font-bold uppercase tracking-[2px]">
                  Available Cash Balance
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
                  <Text style={{ color: '#30D158', fontSize: 28, fontWeight: '900', marginRight: 4 }}>
                    $
                  </Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 52, fontWeight: '900', letterSpacing: -1 }}>
                    {dollarBalance.toFixed(2)}
                  </Text>
                </View>
                {debt > 0 && (
                  <Text className="text-[#FF453A] text-xs font-bold mt-2.5">
                    Outstanding Debt: ${debt.toFixed(2)} (All earnings garnished)
                  </Text>
                )}
              </View>

              {/* Section Subhead */}
              <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px] mb-3 mt-4">
                Store Items & Indulgences
              </Text>

              {/* Material Store Items Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                {rewards.map((reward) => {
                  const canAffordCash = dollarBalance >= reward.cost;
                  const currentScore = getCreditScore();
                  const limit = getCreditLimit(currentScore);
                  const remainingLimit = limit - debt;
                  const deficit = reward.cost - dollarBalance;
                  const canAffordCredit = !canAffordCash && deficit <= remainingLimit;

                  return (
                    <View
                      key={reward.id}
                      style={{
                        flex: 1,
                        minWidth: 160,
                        backgroundColor: '#09090B',
                        borderColor: '#27272A',
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: 16,
                        justifyContent: 'space-between',
                      }}
                    >
                      <View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Text style={{ color: '#FAFAFA', fontWeight: '600', fontSize: 15, flex: 1, paddingRight: 8 }} numberOfLines={2}>
                            {reward.title}
                          </Text>
                          <Pressable onPress={() => handleDelete(reward.id, reward.title)} style={{ padding: 2 }}>
                            <Ionicons name="trash-outline" size={16} color="#52525B" />
                          </Pressable>
                        </View>
                        <Text style={{ color: '#A1A1AA', fontSize: 11, marginTop: 4 }}>Material Item</Text>
                      </View>

                      <View style={{ marginTop: 24, marginBottom: 16, alignItems: 'center' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>
                          ${reward.cost.toFixed(2)}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => handleRedeem(reward)}
                        style={({ pressed, hovered }: any) => ({
                          backgroundColor: canAffordCash
                            ? (hovered ? '#28B84B' : '#30D158')
                            : canAffordCredit
                            ? (hovered ? '#0974E3' : '#0A84FF')
                            : '#27272A',
                          paddingVertical: 10,
                          borderRadius: 8,
                          alignItems: 'center',
                          opacity: pressed ? 0.9 : 1,
                        })}
                      >
                        <Text
                          style={{
                            color: canAffordCash || canAffordCredit ? '#FFFFFF' : '#A1A1AA',
                            fontWeight: '700',
                            fontSize: 14,
                          }}
                        >
                          {canAffordCash
                            ? 'Purchase'
                            : canAffordCredit
                            ? 'Use Credit'
                            : 'Insufficient'}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}

                {/* Add New Material Item Card */}
                <Pressable
                  onPress={() => setShowAddModal(true)}
                  style={({ hovered }: any) => ({
                    flex: 1,
                    minWidth: 160,
                    backgroundColor: hovered ? '#18181B' : '#09090B',
                    borderColor: '#27272A',
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderRadius: 12,
                    padding: 24,
                    justifyContent: 'center',
                    alignItems: 'center',
                  })}
                >
                  <Ionicons name="add" size={28} color="#A1A1AA" />
                  <Text style={{ color: '#A1A1AA', fontWeight: '500', fontSize: 13, marginTop: 8 }}>Add Item</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Modals */}
      {renderAddModal()}

      {/* Custom Dialog */}
      {dialog && (
        <ConfirmModal
          visible={!!dialog}
          onClose={closeDialog}
          icon={dialog.icon}
          iconColor={dialog.iconColor}
          accentColor={dialog.accentColor}
          title={dialog.title}
          message={dialog.message}
          actions={dialog.actions}
        />
      )}

      {/* Quick Start Modal */}
      {quickStartGoal && (
        <QuickStartModal
          visible={!!quickStartGoal}
          onClose={() => setQuickStartGoal(null)}
          goal={quickStartGoal}
          subGoals={macroGoals.filter(g => g.parentId === quickStartGoal.id)}
          onStart={handleQuickStart}
        />
      )}
    </SafeAreaView>
  );
}
