import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEconomyStore } from '../store/economyStore';
import { useRewardStore, Reward } from '../store/rewardStore';
import { useMacroGoalStore } from '../store/macroGoalStore';
import { hapticSuccess, hapticError } from '../utils/haptics';
import { useConfettiStore } from '../store/confettiStore';
import ConfirmModal, { ConfirmAction } from '../components/ConfirmModal';
import AnimatedMacroGoalCard from '../components/AnimatedMacroGoalCard';

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

  // Form states
  const [formMode, setFormMode] = useState<'none' | 'material' | 'entertainment'>('none');
  const [title, setTitle] = useState('');
  const [costOrHours, setCostOrHours] = useState('');
  const [validationError, setValidationError] = useState('');

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
    setFormMode('none');
  };

  const handleAddEntertainmentProject = () => {
    setValidationError('');

    if (!title.trim()) {
      setValidationError('Project title is required');
      return;
    }

    const hours = parseFloat(costOrHours);
    if (isNaN(hours) || hours <= 0) {
      setValidationError('Target must be a valid number of hours');
      return;
    }

    addMacroGoal({
      title: title.trim(),
      horizon: 'yearly',
      targetMinutes: Math.round(hours * 60),
      type: 'entertainment',
    });

    setTitle('');
    setCostOrHours('');
    setFormMode('none');
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

  // Add Item form screens
  if (formMode !== 'none') {
    const isMaterial = formMode === 'material';
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40, maxWidth: 900, width: '100%', alignSelf: 'center' }}>

          {/* Form Header */}
          <View className="flex-row justify-between items-center mt-3 mb-6">
            <Text className="text-white text-xl font-extrabold tracking-tight">
              {isMaterial ? 'Add Material Reward' : 'Add Entertainment Project'}
            </Text>
            <Pressable onPress={() => setFormMode('none')} style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }} className="p-2 rounded-full">
              <Ionicons name="close" size={20} color="#8E8E93" />
            </Pressable>
          </View>

          {validationError ? (
            <View style={{ backgroundColor: 'rgba(255,69,58,0.15)', borderColor: 'rgba(255,69,58,0.4)', borderWidth: 1 }} className="p-3.5 rounded-2xl mb-4">
              <Text className="text-[#FF453A] text-xs font-semibold text-center">{validationError}</Text>
            </View>
          ) : null}

          <Text className="text-[#8E8E93] font-bold text-[10px] tracking-[1.5px] uppercase mb-2">Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={isMaterial ? "e.g. Mechanical Keyboard, Headphones, Sneakers" : "e.g. Play Elden Ring, Watch Breaking Bad"}
            placeholderTextColor="#8E8E93"
            style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }}
            className="text-white rounded-2xl p-4 mb-4 text-sm font-semibold"
          />

          <Text className="text-[#8E8E93] font-bold text-[10px] tracking-[1.5px] uppercase mb-2">
            {isMaterial ? 'Cost ($ Dollars)' : 'Target Duration (Total Hours)'}
          </Text>
          <TextInput
            value={costOrHours}
            onChangeText={setCostOrHours}
            placeholder={isMaterial ? "e.g. 150.00" : "e.g. 60"}
            placeholderTextColor="#8E8E93"
            keyboardType="numeric"
            style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }}
            className="text-white rounded-2xl p-4 mb-6 text-sm font-semibold"
          />

          <Pressable
            onPress={isMaterial ? handleAddMaterialReward : handleAddEntertainmentProject}
            style={{ backgroundColor: isMaterial ? '#30D158' : '#5AC8FA' }}
            className="w-full py-4 rounded-2xl items-center justify-center"
          >
            <Text className="text-black font-extrabold text-base">
              {isMaterial ? 'Add Material Item' : 'Create Entertainment Project'}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <View style={{ maxWidth: 900, width: '100%', alignSelf: 'center' }} className="flex-1 px-5">

        {/* Header */}
        <View className="flex-row justify-between items-center mt-3 mb-2">
          <Text className="text-white text-3xl font-extrabold tracking-tight">Reward Store</Text>
          
          <Pressable
            onPress={() => setFormMode(activeTab === 'time' ? 'entertainment' : 'material')}
            style={{
              backgroundColor: activeTab === 'time' ? 'rgba(90,200,250,0.15)' : 'rgba(48,209,88,0.15)',
              borderColor: activeTab === 'time' ? 'rgba(90,200,250,0.4)' : 'rgba(48,209,88,0.4)',
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

        {/* Apple Segmented Control Tab Picker */}
        <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="flex-row p-1 rounded-xl my-3">
          {(['time', 'material'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const label = tab === 'time' ? 'Time Rewards' : 'Material Rewards';
            const activeColor = tab === 'time' ? '#5AC8FA' : '#30D158';

            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: isActive ? '#2C2C2E' : 'transparent',
                  borderWidth: isActive ? 1 : 0,
                  borderColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontWeight: isActive ? '700' : '500',
                    fontSize: 13,
                    color: isActive ? activeColor : '#8E8E93',
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

              {/* Active Entertainment Projects */}
              {entertainmentGoals.length === 0 ? (
                <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl p-8 items-center justify-center my-2 border-dashed">
                  <Ionicons name="game-controller-outline" size={32} color="#8E8E93" />
                  <Text className="text-white text-center font-semibold text-sm mt-3">No entertainment projects tracked</Text>
                  <Text className="text-[#8E8E93] text-xs text-center mt-1">Add games or series to track completion and earn milestone dollars.</Text>
                </View>
              ) : (
                <View className="my-1">
                  {entertainmentGoals.map((goal) => (
                    <AnimatedMacroGoalCard
                      key={goal.id}
                      goal={goal}
                      accentColor="#5AC8FA"
                      showIcon
                      iconName="game-controller"
                    />
                  ))}
                </View>
              )}
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

              {/* Material Store Items List */}
              {rewards.length === 0 ? (
                <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl p-8 items-center justify-center my-2 border-dashed">
                  <Ionicons name="gift-outline" size={32} color="#8E8E93" />
                  <Text className="text-white text-center font-semibold text-sm mt-3">No material items in store</Text>
                  <Text className="text-[#8E8E93] text-xs text-center mt-1">Add tech, gear, or physical rewards to buy with your earned dollars.</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl overflow-hidden mb-3">
                  {rewards.map((reward, index) => {
                    const canAffordCash = dollarBalance >= reward.cost;
                    const currentScore = getCreditScore();
                    const limit = getCreditLimit(currentScore);
                    const remainingLimit = limit - debt;
                    const deficit = reward.cost - dollarBalance;
                    const canAffordCredit = !canAffordCash && deficit <= remainingLimit;
                    const isLast = index === rewards.length - 1;

                    return (
                      <View
                        key={reward.id}
                        style={{
                          borderBottomWidth: isLast ? 0 : 0.5,
                          borderBottomColor: 'rgba(255,255,255,0.08)',
                        }}
                        className="p-4 flex-row items-center justify-between"
                      >
                        <View className="flex-1 pr-4">
                          <Text className="text-white text-base font-semibold">{reward.title}</Text>
                          <Text className="text-[#8E8E93] text-xs mt-0.5">Material Reward</Text>
                        </View>

                        <View className="flex-row items-center gap-2">
                          <Pressable
                            onPress={() => handleRedeem(reward)}
                            style={{
                              backgroundColor: canAffordCash
                                ? 'rgba(48,209,88,0.15)'
                                : canAffordCredit
                                ? 'rgba(10,132,255,0.15)'
                                : '#2C2C2E',
                              borderColor: canAffordCash
                                ? '#30D158'
                                : canAffordCredit
                                ? '#0A84FF'
                                : 'transparent',
                              borderWidth: 1,
                              borderRadius: 18,
                              paddingHorizontal: 16,
                              paddingVertical: 6,
                            }}
                            className="items-center justify-center"
                          >
                            <Text
                              style={{
                                color: canAffordCash
                                  ? '#30D158'
                                  : canAffordCredit
                                  ? '#0A84FF'
                                  : '#8E8E93',
                              }}
                              className="font-bold text-xs uppercase"
                            >
                              {canAffordCash
                                ? `$${reward.cost.toFixed(2)}`
                                : canAffordCredit
                                ? `Credit: $${reward.cost.toFixed(2)}`
                                : `$${reward.cost.toFixed(2)}`}
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => handleDelete(reward.id, reward.title)}
                            style={{ backgroundColor: '#2C2C2E' }}
                            className="p-2.5 rounded-full"
                          >
                            <Ionicons name="trash-outline" size={15} color="#FF453A" />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

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
    </SafeAreaView>
  );
}
