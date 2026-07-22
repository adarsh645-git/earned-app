import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEconomyStore } from '../store/economyStore';
import { useTaskStore } from '../store/taskStore';
import { useMacroGoalStore, MacroGoal, getMilestoneDollars } from '../store/macroGoalStore';
import { useAuthStore } from '../store/authStore';
import { PrimaryButton } from '../components/PrimaryButton';

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

export default function ProfileScreen() {
  const { user, openModal } = useAuthStore();
  const { 
    dollarBalance, 
    streak, 
    debt, 
    getCreditScore, 
    getCreditLimit, 
    getDailyInterestRate, 
    historyOfDefaults, 
    isInDefault,
    clearDebtForTesting 
  } = useEconomyStore();
  const { tasks } = useTaskStore();
  const { macroGoals, addMacroGoal } = useMacroGoalStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [horizon, setHorizon] = useState<'monthly' | 'yearly'>('monthly');
  const [targetHours, setTargetHours] = useState('');
  const [validationError, setValidationError] = useState('');

  // Total focused time calculations
  const totalCompletedMinutes = tasks
    .filter(t => t.completed)
    .reduce((acc, t) => acc + t.estimatedMinutes, 0);

  const totalHours = (totalCompletedMinutes / 60).toFixed(1);

  const handleAddMacro = () => {
    setValidationError('');

    if (!title.trim()) {
      setValidationError('Goal title is required');
      return;
    }

    const hours = parseFloat(targetHours);
    if (isNaN(hours) || hours <= 0) {
      setValidationError('Target hours must be a valid positive number');
      return;
    }

    addMacroGoal({
      title: title.trim(),
      horizon,
      targetMinutes: Math.round(hours * 60),
    });

    setTitle('');
    setTargetHours('');
    setModalVisible(false);
  };

  const handleResetData = () => {
    Alert.alert(
      '⚠️ Reset App Data?',
      'This will erase all of your banked keys, streaks, goals, and tasks permanently. Are you sure you want to do this?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Reset Successful', 'Restart the app to see your clean slate.');
          },
        },
      ]
    );
  };

  // If adding a macro goal, show the form inline
  if (modalVisible) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
          
          {/* Form Header */}
          <View className="flex-row justify-between items-center mt-3 mb-6">
            <Text className="text-white text-xl font-extrabold tracking-tight">New Pyramid Target</Text>
            <Pressable onPress={() => setModalVisible(false)} style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }} className="p-2 rounded-full">
              <Ionicons name="close" size={20} color="#8E8E93" />
            </Pressable>
          </View>

          {validationError ? (
            <View style={{ backgroundColor: 'rgba(255,69,58,0.15)', borderColor: 'rgba(255,69,58,0.4)', borderWidth: 1 }} className="p-3.5 rounded-2xl mb-4">
              <Text className="text-[#FF453A] text-xs font-semibold text-center">{validationError}</Text>
            </View>
          ) : null}

          {/* Title Input */}
          <Text className="text-[#8E8E93] font-bold text-[10px] tracking-[1.5px] uppercase mb-2">Pyramid Goal Title</Text>
          <PremiumInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Hike 100 miles, Write a Novel, Learn French"
            placeholderTextColor="#8E8E93"
            style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }}
            className="text-white rounded-2xl p-4 mb-4 text-sm font-semibold"
          />

          {/* Target Hours Input */}
          <Text className="text-[#8E8E93] font-bold text-[10px] tracking-[1.5px] uppercase mb-2">Target Hours</Text>
          <PremiumInput
            value={targetHours}
            onChangeText={setTargetHours}
            placeholder="e.g. 50"
            placeholderTextColor="#8E8E93"
            keyboardType="numeric"
            style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }}
            className="text-white rounded-2xl p-4 mb-4 text-sm font-semibold"
          />

          {/* Horizon Toggle */}
          <Text className="text-[#8E8E93] font-bold text-[10px] tracking-[1.5px] uppercase mb-2">Time Horizon</Text>
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="flex-row p-1 rounded-xl mb-6">
            {(['monthly', 'yearly'] as const).map((h) => {
              const isActive = horizon === h;
              return (
                <Pressable
                  key={h}
                  onPress={() => setHorizon(h)}
                  style={({ hovered }: any) => ({
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: isActive ? (hovered ? '#3A2053' : '#2C183E') : 'transparent',
                    borderWidth: isActive ? 1 : 0,
                    borderColor: isActive ? (hovered ? '#5A3382' : '#4D2A6B') : 'transparent',
                    transition: 'all 0.15s ease-in-out',
                  })}
                >
                  <Text className={`font-semibold text-xs capitalize ${isActive ? 'text-white' : 'text-[#8E8E93]'}`}>
                    {h}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Submit Button */}
          <PrimaryButton
            onPress={handleAddMacro}
            title="Add Pyramid Target"
            style={{ width: '100%' }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40, maxWidth: 900, width: '100%', alignSelf: 'center' }} className="flex-1 px-5">
        
        {/* Header */}
        <View className="flex-row justify-between items-center mt-3 mb-5">
          <Text className="text-white text-3xl font-extrabold tracking-tight">Profile & Stats</Text>
          <Pressable onPress={handleResetData} style={{ backgroundColor: 'rgba(255,69,58,0.15)', borderColor: 'rgba(255,69,58,0.4)', borderWidth: 1 }} className="p-2 rounded-xl">
            <Ionicons name="trash-outline" size={17} color="#FF453A" />
          </Pressable>
        </View>

        {/* Stats Grid - Apple Widget Cards */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          {/* Streak */}
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="flex-1 min-w-[45%] p-4 rounded-2xl">
            <View style={{ backgroundColor: 'rgba(255,149,0,0.15)', width: 32, height: 32, borderRadius: 8 }} className="items-center justify-center mb-3">
              <Ionicons name="flame" size={18} color="#FF9500" />
            </View>
            <Text className="text-white text-2xl font-bold tracking-tight">{streak} Days</Text>
            <Text className="text-[#8E8E93] text-[10px] font-bold mt-1 uppercase tracking-wider">
              Daily Streak
            </Text>
          </View>
          
          {/* Total Focus */}
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="flex-1 min-w-[45%] p-4 rounded-2xl">
            <View style={{ backgroundColor: 'rgba(191,90,242,0.15)', width: 32, height: 32, borderRadius: 8 }} className="items-center justify-center mb-3">
              <Ionicons name="time" size={18} color="#BF5AF2" />
            </View>
            <Text className="text-white text-2xl font-bold tracking-tight">{totalHours} hrs</Text>
            <Text className="text-[#8E8E93] text-[10px] font-bold mt-1 uppercase tracking-wider">
              Deep Work
            </Text>
          </View>

          {/* Keys Balance */}
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="flex-1 min-w-[45%] p-4 rounded-2xl">
            <View style={{ backgroundColor: 'rgba(48,209,88,0.15)', width: 32, height: 32, borderRadius: 8 }} className="items-center justify-center mb-3">
              <Ionicons name="logo-usd" size={15} color="#30D158" />
            </View>
            <Text className="text-white text-2xl font-bold tracking-tight">{dollarBalance.toFixed(2)}</Text>
            <Text className="text-[#8E8E93] text-[10px] font-bold mt-1 uppercase tracking-wider">
              Banked Cash
            </Text>
          </View>
          
          {/* Completed Tasks */}
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="flex-1 min-w-[45%] p-4 rounded-2xl">
            <View style={{ backgroundColor: 'rgba(48,209,88,0.15)', width: 32, height: 32, borderRadius: 8 }} className="items-center justify-center mb-3">
              <Ionicons name="checkmark-done" size={18} color="#30D158" />
            </View>
            <Text className="text-white text-2xl font-bold tracking-tight">
              {tasks.filter(t => t.completed).length}
            </Text>
            <Text className="text-[#8E8E93] text-[10px] font-bold mt-1 uppercase tracking-wider">
              Focus Wins
            </Text>
          </View>
        </View>

        {/* Cloud Sync & Account Status Card */}
        <View className="mb-6">
          <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px] mb-3">
            Cloud Sync & Account
          </Text>
          <Pressable
            onPress={openModal}
            style={{
              backgroundColor: '#1C1C1E',
              borderColor: user ? 'rgba(48,209,88,0.3)' : 'rgba(191,90,242,0.3)',
              borderWidth: 1,
            }}
            className="p-4 rounded-2xl flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1 pr-3">
              <View
                style={{
                  backgroundColor: user ? 'rgba(48,209,88,0.15)' : 'rgba(191,90,242,0.15)',
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                }}
                className="items-center justify-center mr-3"
              >
                <Ionicons
                  name={user ? 'cloud-done' : 'cloud-upload-outline'}
                  size={22}
                  color={user ? '#30D158' : '#BF5AF2'}
                />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">
                  {user ? 'Cloud Sync Active' : 'Enable Multi-Device Cloud Sync'}
                </Text>
                <Text className="text-[#8E8E93] text-xs font-medium mt-0.5" numberOfLines={1}>
                  {user ? user.email : 'Tap to sign in with Google & sync all devices'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </Pressable>
        </View>

        {/* Credit Score & Debt Dashboard - Apple Widget */}
        <View className="mb-6">
          <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px] mb-3">
            Credit Rating & Debt
          </Text>
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="p-5 rounded-2xl">
            {/* Score Ring / Bar */}
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-white text-3xl font-black tracking-tight">{getCreditScore()}</Text>
                <Text className="text-[#8E8E93] text-[10px] font-bold uppercase tracking-wider mt-0.5">
                  Discipline Score
                </Text>
              </View>
              {/* Rating Badge */}
              <View 
                style={{ 
                  backgroundColor: getCreditScore() >= 750 ? 'rgba(48,209,88,0.15)' : getCreditScore() >= 650 ? 'rgba(10,132,255,0.15)' : getCreditScore() >= 580 ? 'rgba(255,149,0,0.15)' : 'rgba(255,69,58,0.15)',
                  borderColor: getCreditScore() >= 750 ? '#30D158' : getCreditScore() >= 650 ? '#0A84FF' : getCreditScore() >= 580 ? '#FF9500' : '#FF453A',
                  borderWidth: 1 
                }} 
                className="px-3.5 py-1.5 rounded-full"
              >
                <Text 
                  style={{ 
                    color: getCreditScore() >= 750 ? '#30D158' : getCreditScore() >= 650 ? '#0A84FF' : getCreditScore() >= 580 ? '#FF9500' : '#FF453A'
                  }} 
                  className="text-xs font-black uppercase tracking-wider"
                >
                  {getCreditScore() >= 750 ? 'Excellent' : getCreditScore() >= 650 ? 'Good' : getCreditScore() >= 580 ? 'Fair' : 'Poor'}
                </Text>
              </View>
            </View>

            {/* In Debt indicator */}
            <View style={{ borderTopWidth: 0.5, borderTopColor: '#2C2C2E' }} className="pt-4 flex-row justify-between items-center">
              <View>
                <Text className="text-white text-lg font-bold">${debt.toFixed(2)}</Text>
                <Text className="text-[#8E8E93] text-[9px] uppercase font-bold tracking-wider mt-0.5">Current Debt</Text>
              </View>
              <View className="items-end">
                <Text className="text-white text-sm font-semibold">${getCreditLimit(getCreditScore()).toFixed(2)}</Text>
                <Text className="text-[#8E8E93] text-[9px] uppercase font-bold tracking-wider mt-0.5">Credit Limit</Text>
              </View>
            </View>

            {/* Default Penalty Risk */}
            {debt > 0 && (
              <View style={{ backgroundColor: isInDefault ? 'rgba(255,69,58,0.1)' : 'rgba(255,149,0,0.1)', borderColor: isInDefault ? 'rgba(255,69,58,0.3)' : 'rgba(255,149,0,0.3)', borderWidth: 1 }} className="mt-4 p-3 rounded-xl flex-row items-center gap-2">
                <Ionicons name={isInDefault ? "alert-circle" : "warning"} size={16} color={isInDefault ? "#FF453A" : "#FF9500"} />
                <Text className="text-xs flex-1" style={{ color: isInDefault ? "#FF453A" : "#FF9500", fontWeight: '600' }}>
                  {isInDefault 
                    ? "DELINQUENT DEFAULT: Streak reset, goals frozen, +20% penalty fee applied." 
                    : `Active loan accumulating ${(getDailyInterestRate(getCreditScore()) * 100).toFixed(2)}% daily interest. Focus daily to pay down.`}
                </Text>
              </View>
            )}

            {/* Defaults tally */}
            {historyOfDefaults > 0 && (
              <Text className="text-[#8E8E93] text-[9px] font-bold uppercase tracking-wider mt-3">
                Lifetime Defaults Count: {historyOfDefaults} ⚠️
              </Text>
            )}

            {/* Clear Debt testing utility */}
            {__DEV__ && debt > 0 && (
              <Pressable 
                onPress={clearDebtForTesting} 
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', alignSelf: 'flex-start' }} 
                className="mt-3 px-3 py-1.5 rounded-lg"
              >
                <Text className="text-[#8E8E93] text-[10px] font-bold">Clear Debt (Dev Tool)</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Macro Goals Section */}
        <View className="flex-row justify-between items-center mb-3 mt-1">
          <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px]">
            Macro Targets (The Pyramid)
          </Text>
          <Pressable
            onPress={() => setModalVisible(true)}
            style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }}
            className="flex-row items-center px-3 py-1.5 rounded-full"
          >
            <Ionicons name="add" size={14} color="#BF5AF2" />
            <Text className="text-[#BF5AF2] font-bold text-xs ml-1">New Goal</Text>
          </Pressable>
        </View>

        {macroGoals.length === 0 ? (
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl p-8 items-center justify-center border-dashed">
            <Ionicons name="shapes-outline" size={32} color="#8E8E93" />
            <Text className="text-white text-center font-semibold mt-3">The Pyramid is empty</Text>
            <Text className="text-[#8E8E93] text-xs text-center mt-1">Create long-term monthly/yearly targets. Direct focus to daily micro-tasks to fill them.</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl overflow-hidden mb-3">
            {macroGoals.map((goal, index) => {
              const completedHours = (goal.completedMinutes / 60).toFixed(1);
              const targetHrs = (goal.targetMinutes / 60).toFixed(1);
              const pct = Math.min(100, Math.round((goal.completedMinutes / goal.targetMinutes) * 100));
              const unlocked = goal.unlockedMilestones || [];
              const milestones = [25, 50, 75, 100];
              const isLast = index === macroGoals.length - 1;
              return (
                <View
                  key={goal.id}
                  style={{
                    borderBottomWidth: isLast ? 0 : 0.5,
                    borderBottomColor: 'rgba(255,255,255,0.08)',
                  }}
                  className="p-4"
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <View>
                      <Text className="text-white font-semibold text-sm">{goal.title}</Text>
                      <Text className="text-[#8E8E93] text-[9px] font-bold uppercase mt-0.5 tracking-wider">
                        {goal.horizon} Target
                      </Text>
                    </View>
                    <Text className="text-[#8E8E93] text-xs font-medium">
                      {completedHours} / {targetHrs} hrs ({pct}%)
                    </Text>
                  </View>
                  {/* Progress Bar */}
                  <View style={{ backgroundColor: '#2C2C2E' }} className="w-full h-2 rounded-full overflow-hidden mb-3">
                    <View
                      style={{ width: `${pct}%`, backgroundColor: '#BF5AF2' }}
                      className="h-full rounded-full"
                    />
                  </View>
                  {/* Milestone Rewards Row */}
                  <View style={{ borderTopColor: 'rgba(255,255,255,0.08)' }} className="flex-row justify-between items-center pt-2 border-t">
                    {milestones.map((m) => {
                      const isUnlocked = unlocked.includes(m);
                      const dollars = getMilestoneDollars(goal.targetMinutes, m);
                      return (
                        <View
                          key={m}
                          style={{
                            backgroundColor: isUnlocked ? 'rgba(191,90,242,0.15)' : '#2C2C2E',
                            borderColor: isUnlocked ? 'rgba(191,90,242,0.4)' : 'rgba(255,255,255,0.05)',
                          }}
                          className="flex-row items-center px-2 py-1 rounded-full border"
                        >
                          <Ionicons
                            name={isUnlocked ? 'checkmark-circle' : 'lock-closed'}
                            size={10}
                            color={isUnlocked ? '#BF5AF2' : '#8E8E93'}
                          />
                          <Text
                            style={{ color: isUnlocked ? '#BF5AF2' : '#8E8E93' }}
                            className="text-[9px] font-bold ml-1"
                          >
                            {m}% (+${dollars.toFixed(2)})
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
