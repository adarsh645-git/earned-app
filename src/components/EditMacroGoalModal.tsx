import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PrimaryButton } from './PrimaryButton';
import { MacroGoal, useMacroGoalStore, getEligibleParents } from '../store/macroGoalStore';
import TimeSelectorModal from './TimeSelectorModal';
import ConfirmModal from './ConfirmModal';

interface EditMacroGoalModalProps {
  goal: MacroGoal | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<MacroGoal>) => void;
  onDelete: (id: string) => void;
}

export default function EditMacroGoalModal({
  goal,
  visible,
  onClose,
  onSave,
  onDelete,
}: EditMacroGoalModalProps) {
  const { macroGoals: allGoals, setPayingLevel } = useMacroGoalStore();

  const [title, setTitle] = useState('');
  const [horizon, setHorizon] = useState<'monthly' | 'yearly'>('monthly');
  const [targetMinutes, setTargetMinutes] = useState(0);
  const [targetMetric, setTargetMetric] = useState('');
  const [isOpenEnded, setIsOpenEnded] = useState(false);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [parentId, setParentId] = useState('');
  const [paysCurrency, setPaysCurrency] = useState(true);

  const isUnits = goal?.metricType === 'units';

  useEffect(() => {
    if (goal && visible) {
      setTitle(goal.title);
      setHorizon(goal.horizon);
      setTargetMinutes(goal.targetMinutes);
      setTargetMetric(String(goal.targetMetric || ''));
      setIsOpenEnded((goal.targetMetric ?? goal.targetMinutes) === 0);
      setParentId(goal.parentId || '');
      setPaysCurrency(goal.paysCurrency !== false);
    }
  }, [goal, visible]);

  if (!goal) return null;

  const eligibleParents = getEligibleParents(allGoals, goal, goal.type || 'productive', goal.metricType || 'minutes');

  const handleSave = () => {
    if (!title.trim()) return;

    const updates: Partial<MacroGoal> = { title: title.trim(), horizon, parentId: parentId || undefined };

    if (isUnits) {
      updates.targetMetric = isOpenEnded ? 0 : parseInt(targetMetric, 10) || 0;
    } else {
      updates.targetMinutes = isOpenEnded ? 0 : targetMinutes;
    }

    onSave(goal.id, updates);
    // setPayingLevel re-reads the just-saved parentId to correctly enforce
    // "exactly one payer" across the whole chain, wherever this goal now sits.
    if (paysCurrency) {
      setPayingLevel(goal.id);
    } else {
      onSave(goal.id, { paysCurrency: false });
    }
    onClose();
  };

  const handleConfirmDelete = () => {
    onDelete(goal.id);
    setConfirmDeleteVisible(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 16 }}
      >
        <View style={{ width: '100%', maxWidth: 425, alignSelf: 'center', backgroundColor: '#09090B', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#27272A', maxHeight: '90%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>Edit Macro Target</Text>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#A1A1AA" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Title */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' }}>
                Title
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Goal title"
                placeholderTextColor="#52525B"
                spellCheck={true}
                autoCorrect={true}
                style={{
                  backgroundColor: '#18181B',
                  color: '#FFFFFF',
                  padding: 16,
                  borderRadius: 12,
                  fontSize: 16,
                  borderWidth: 1,
                  borderColor: '#27272A'
                }}
              />
            </View>

            {/* Parent Chain */}
            {eligibleParents.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' }}>
                  Contributes To (Optional)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Pressable
                    onPress={() => setParentId('')}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 9999,
                      borderWidth: 1,
                      marginRight: 8,
                      backgroundColor: !parentId ? '#FFFFFF' : '#18181B',
                      borderColor: !parentId ? '#FFFFFF' : '#27272A',
                    }}
                  >
                    <Text style={{ color: !parentId ? '#000000' : '#A1A1AA', fontSize: 13, fontWeight: !parentId ? '700' : '500' }}>
                      None
                    </Text>
                  </Pressable>
                  {eligibleParents.map((p) => {
                    const isSelected = parentId === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => setParentId(p.id)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 9999,
                          borderWidth: 1,
                          marginRight: 8,
                          backgroundColor: isSelected ? '#FFFFFF' : '#18181B',
                          borderColor: isSelected ? '#FFFFFF' : '#27272A',
                        }}
                      >
                        <Text style={{ color: isSelected ? '#000000' : '#A1A1AA', fontSize: 13, fontWeight: isSelected ? '700' : '500' }}>
                          {p.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Text style={{ color: '#52525B', fontSize: 11, marginTop: 6 }}>
                  Progress here drips up automatically. {isUnits ? 'Finishing this contributes +1 up the chain.' : 'Minutes cascade up the chain.'}
                </Text>
              </View>
            )}

            {/* Rewards Paid At This Level */}
            <View style={{ marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#18181B', borderColor: '#27272A', borderWidth: 1, borderRadius: 12, padding: 16 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Rewards Paid Here</Text>
                <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 2 }}>
                  Only one level per chain pays currency. Turning this on turns it off everywhere else in the chain.
                </Text>
              </View>
              <Pressable onPress={() => setPaysCurrency(!paysCurrency)}>
                <View
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 13,
                    padding: 3,
                    backgroundColor: paysCurrency ? '#30D158' : '#3A3A3C',
                    alignItems: paysCurrency ? 'flex-end' : 'flex-start',
                  }}
                >
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' }} />
                </View>
              </Pressable>
            </View>

            {/* Horizon */}
            {!parentId && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' }}>
                  Horizon
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['monthly', 'yearly'] as const).map((h) => (
                    <Pressable
                      key={h}
                      onPress={() => setHorizon(h)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 9999,
                        borderWidth: 1,
                        backgroundColor: horizon === h ? '#FFFFFF' : '#18181B',
                        borderColor: horizon === h ? '#FFFFFF' : '#27272A',
                      }}
                    >
                      <Text style={{
                        color: horizon === h ? '#000000' : '#A1A1AA',
                        fontSize: 13,
                        fontWeight: horizon === h ? '700' : '500',
                        textTransform: 'capitalize',
                      }}>
                        {h}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Target */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '600', textTransform: 'uppercase' }}>
                  {isUnits ? 'Target Units' : 'Target Duration'}
                </Text>
                <Pressable onPress={() => setIsOpenEnded(!isOpenEnded)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={isOpenEnded ? 'checkbox' : 'square-outline'} size={16} color={isOpenEnded ? '#BF5AF2' : '#8E8E93'} />
                  <Text style={{ color: isOpenEnded ? '#BF5AF2' : '#8E8E93', fontSize: 12, marginLeft: 4 }}>Open Ended</Text>
                </Pressable>
              </View>

              {isOpenEnded ? (
                <View style={{ backgroundColor: '#18181B', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#27272A', alignItems: 'center' }}>
                  <Text style={{ color: '#8E8E93', fontSize: 13, fontStyle: 'italic' }}>Will count up progress without a fixed target.</Text>
                </View>
              ) : isUnits ? (
                <TextInput
                  value={targetMetric}
                  onChangeText={setTargetMetric}
                  placeholder="e.g. 12"
                  placeholderTextColor="#52525B"
                  keyboardType="numeric"
                  style={{ backgroundColor: '#18181B', color: '#FFFFFF', padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#27272A' }}
                />
              ) : (
                <Pressable
                  onPress={() => setShowTimeSelector(true)}
                  style={{
                    backgroundColor: '#18181B',
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#27272A',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 16 }}>
                    {Math.floor(targetMinutes / 60)}h {targetMinutes % 60}m
                  </Text>
                  <Ionicons name="time-outline" size={20} color="#A1A1AA" />
                </Pressable>
              )}
            </View>

            {/* Footer */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <Pressable onPress={() => setConfirmDeleteVisible(true)} style={{ padding: 8 }}>
                <Ionicons name="trash-outline" size={20} color="#FF453A" />
              </Pressable>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Pressable onPress={onClose}>
                  <Text style={{ color: '#A1A1AA', fontSize: 14, fontWeight: '500' }}>Cancel</Text>
                </Pressable>
                <PrimaryButton title="Save Changes" onPress={handleSave} />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <TimeSelectorModal
        visible={showTimeSelector}
        initialMinutes={targetMinutes}
        onClose={() => setShowTimeSelector(false)}
        onConfirm={(mins) => {
          setTargetMinutes(mins);
          setShowTimeSelector(false);
        }}
        title="Target Duration"
      />

      <ConfirmModal
        visible={confirmDeleteVisible}
        onClose={() => setConfirmDeleteVisible(false)}
        icon="trash-outline"
        iconColor="#FF453A"
        accentColor="#FF453A"
        title="Delete Macro Target?"
        message={`"${goal.title}" will be removed${goal.parentId ? '' : ', along with any of its sub-goals'}. Linked tasks and Journeys stay put — they just lose their link to this goal. This cannot be undone.`}
        actions={[
          { label: 'Keep It', onPress: () => {}, style: 'cancel' },
          { label: 'Delete Macro Target', style: 'destructive', onPress: handleConfirmDelete },
        ]}
      />
    </Modal>
  );
}
