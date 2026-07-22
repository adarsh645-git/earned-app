import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTaskStore, Task } from '../store/taskStore';
import { useMacroGoalStore } from '../store/macroGoalStore';
import { useEconomyStore } from '../store/economyStore';
import { PrimaryButton } from '../components/PrimaryButton';
import RewardToast from '../components/RewardToast';
import AnimatedTaskRow from '../components/AnimatedTaskRow';
import DialPicker from '../components/DialPicker';
import EditTaskModal from '../components/EditTaskModal';
import TimeSelectorModal from '../components/TimeSelectorModal';

export default function TasksScreen() {
  const { tasks, tags, pillars, addTask, updateTask, deleteTask, toggleTask, moveToIcebox, activateFromIcebox } = useTaskStore();
  const { macroGoals } = useMacroGoalStore();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedTagId, setSelectedTagId] = useState(tags[0]?.id || '');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(25);
  const [selectedMacroId, setSelectedMacroId] = useState('');
  const [sendDirectlyToIcebox, setSendDirectlyToIcebox] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Reward toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSubtext, setToastSubtext] = useState('');

  // Modals state
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showAddTimeSelector, setShowAddTimeSelector] = useState(false);

  const incompleteTasks = tasks.filter(t => !t.isIcebox && !t.completed);
  const completedTasks = tasks.filter(t => !t.isIcebox && t.completed);
  const iceboxTasks = tasks.filter(t => t.isIcebox);

  const handleAddTask = () => {
    setValidationError('');
    
    if (!title.trim()) {
      setValidationError('Task title is required');
      return;
    }
    
    if (estimatedMinutes <= 0) {
      setValidationError('Estimated focus time must be greater than 0 minutes');
      return;
    }

    addTask({
      title: title.trim(),
      tagId: selectedTagId,
      estimatedMinutes: estimatedMinutes,
      macroGoalId: selectedMacroId || undefined,
      isIcebox: sendDirectlyToIcebox,
    });

    setTitle('');
    setEstimatedMinutes(25);
    setSelectedMacroId('');
    setSendDirectlyToIcebox(false);
    setModalVisible(false);
  };

  // If modal is visible, show the form inline instead of using Modal component
  if (modalVisible) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
          
          {/* Header */}
          <View className="flex-row justify-between items-center mt-3 mb-6">
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }}>New Focus Block</Text>
            <Pressable onPress={() => setModalVisible(false)} style={{ backgroundColor: '#2C2C2E', padding: 6, borderRadius: 12 }}>
              <Ionicons name="close" size={20} color="#8E8E93" />
            </Pressable>
          </View>

          {validationError ? (
            <View style={{ backgroundColor: 'rgba(255,69,58,0.15)', borderColor: 'rgba(255,69,58,0.4)', borderWidth: 1 }} className="p-3.5 rounded-2xl mb-4">
              <Text className="text-[#FF453A] text-xs font-semibold text-center">{validationError}</Text>
            </View>
          ) : null}

          {/* Title Input */}
          <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Focus Item Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Code Review, Bike Ride, Read Book"
            placeholderTextColor="#5C5C5E"
            spellCheck={true}
            autoCorrect={true}
            style={{ backgroundColor: '#151517', color: '#FFF', paddingHorizontal: 16, paddingVertical: 16, borderRadius: 16, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#2C2C2E' }}
          />

          {/* Focus Duration */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#8E8E93', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Estimated Duration</Text>
            <Pressable 
              onPress={() => setShowAddTimeSelector(true)}
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
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '500' }}>
                {Math.floor(estimatedMinutes / 60)}h {estimatedMinutes % 60}m
              </Text>
              <Ionicons name="time-outline" size={20} color="#A1A1AA" />
            </Pressable>
          </View>

          {/* Tag Selection */}
          <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Category Tag</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {tags.filter(t => !t.isArchived).map((tag) => {
              const isSelected = selectedTagId === tag.id;
              const pillar = pillars.find(p => p.id === tag.pillarId);
              return (
                <Pressable
                  key={tag.id}
                  onPress={() => setSelectedTagId(tag.id)}
                  style={({ hovered }: any) => ({
                    backgroundColor: isSelected ? (hovered ? '#3A2053' : '#2C183E') : (hovered ? '#2C2C2E' : '#1C1C1E'),
                    borderColor: isSelected ? (hovered ? '#5A3382' : '#4D2A6B') : '#2C2C2E',
                    borderWidth: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    marginRight: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease-in-out',
                  })}
                >
                  <Text style={{ color: isSelected ? '#FFF' : '#8E8E93', fontWeight: isSelected ? '700' : '600', fontSize: 13 }}>
                    {tag.name} {pillar ? `(${pillar.name})` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Link to Macro Goal */}
          {macroGoals.length > 0 && (
            <>
              <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Link to Pyramid Goal (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                <Pressable
                  onPress={() => setSelectedMacroId('')}
                  style={({ hovered }: any) => ({
                    backgroundColor: !selectedMacroId ? (hovered ? '#3A2053' : '#2C183E') : (hovered ? '#2C2C2E' : '#1C1C1E'),
                    borderColor: !selectedMacroId ? (hovered ? '#5A3382' : '#4D2A6B') : '#2C2C2E',
                    borderWidth: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    marginRight: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease-in-out',
                  })}
                >
                  <Text style={{ color: !selectedMacroId ? '#FFF' : '#8E8E93', fontWeight: !selectedMacroId ? '700' : '600', fontSize: 13 }}>
                    None
                  </Text>
                </Pressable>
                {macroGoals.map((goal) => {
                  const isSelected = selectedMacroId === goal.id;
                  return (
                    <Pressable
                      key={goal.id}
                      onPress={() => setSelectedMacroId(goal.id)}
                      style={({ hovered }: any) => ({
                        backgroundColor: isSelected ? (hovered ? '#3A2053' : '#2C183E') : (hovered ? '#2C2C2E' : '#1C1C1E'),
                        borderColor: isSelected ? (hovered ? '#5A3382' : '#4D2A6B') : '#2C2C2E',
                        borderWidth: 1,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 12,
                        marginRight: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease-in-out',
                      })}
                    >
                      <Text style={{ color: isSelected ? '#FFF' : '#8E8E93', fontWeight: isSelected ? '700' : '600', fontSize: 13 }}>
                        {goal.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Send Directly to Icebox Toggle */}
          <Pressable
            onPress={() => setSendDirectlyToIcebox(!sendDirectlyToIcebox)}
            style={{ backgroundColor: '#151517', borderColor: '#2C2C2E', borderWidth: 1 }}
            className="flex-row items-center p-4 rounded-2xl justify-between mb-8"
          >
            <View className="flex-row items-center gap-2.5">
              <Ionicons name="snow-outline" size={18} color="#8E8E93" />
              <View>
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' }}>Defer directly to Icebox</Text>
                <Text style={{ color: '#8E8E93', fontSize: 12, marginTop: 2 }}>Locks item out of today's focus list</Text>
              </View>
            </View>
            <Ionicons
              name={sendDirectlyToIcebox ? 'checkbox' : 'square-outline'}
              size={20}
              color={sendDirectlyToIcebox ? '#BF5AF2' : '#8E8E93'}
            />
          </Pressable>

          {/* Submit Button */}
          <PrimaryButton
            onPress={handleAddTask}
            title="Add Focus Item (+$0.02)"
            style={{ width: '100%' }}
          />

          <TimeSelectorModal
            visible={showAddTimeSelector}
            initialMinutes={estimatedMinutes}
            title="Estimate Duration"
            onClose={() => setShowAddTimeSelector(false)}
            onConfirm={(mins) => {
              setEstimatedMinutes(mins);
              setShowAddTimeSelector(false);
            }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <RewardToast
        visible={toastVisible}
        message={toastMessage}
        subtext={toastSubtext}
        onDismiss={() => setToastVisible(false)}
      />

      <View style={{ maxWidth: 900, width: '100%', alignSelf: 'center' }} className="flex-1 px-5">
        
        {/* Header */}
        <View className="flex-row justify-between items-center mt-3 mb-4">
          <Text className="text-white text-3xl font-extrabold tracking-tight">Manage Focus</Text>
          <Pressable
            onPress={() => setModalVisible(true)}
            style={{ backgroundColor: '#2C2C2E', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="add" size={16} color="#BF5AF2" style={{ marginRight: 6 }} />
            <Text style={{ color: '#BF5AF2', fontSize: 14, fontWeight: '700' }}>Add Task</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="flex-1">
          
          {/* Active Tasks Section */}
          <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px] mb-3">
            Today's Focus List
          </Text>
          
          {incompleteTasks.length === 0 ? (
            <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl p-6 items-center justify-center mb-6">
              <Text className="text-white font-semibold text-center">Your focus list is clear.</Text>
              <Text className="text-[#8E8E93] text-xs text-center mt-1">Tap Add Task to schedule focused chunks for today.</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl overflow-hidden mb-5">
              {incompleteTasks.map((task, index) => {
                const tag = tags.find(t => t.id === task.tagId);
                const isLast = index === incompleteTasks.length - 1;
                return (
                  <AnimatedTaskRow
                    key={task.id}
                    task={task}
                    tagName={tag?.name}
                    isLast={isLast}
                    onToggle={toggleTask}
                    onMoveToIcebox={moveToIcebox}
                    onEdit={setEditTask}
                    showStartButton
                  />
                );
              })}
            </View>
          )}

          {/* Completed Tasks Section */}
          {completedTasks.length > 0 && (
            <View className="mb-5">
              <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px] mb-3">
                Completed Today
              </Text>
              <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl overflow-hidden">
                {completedTasks.map((task, index) => {
                  const tag = tags.find(t => t.id === task.tagId);
                  const isLast = index === completedTasks.length - 1;
                  return (
                    <AnimatedTaskRow
                      key={task.id}
                      task={task}
                      tagName={tag?.name}
                      isLast={isLast}
                      onToggle={toggleTask}
                      onMoveToIcebox={moveToIcebox}
                      onEdit={setEditTask}
                      showIceboxButton={false}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {/* Icebox Tasks Section */}
          <View className="mt-5">
            <View className="flex-row items-center gap-1.5 mb-3">
              <Ionicons name="snow-outline" size={16} color="#8E8E93" />
              <Text className="text-[#8E8E93] font-bold text-xs uppercase tracking-[1.5px]">
                The Icebox (Distractions Deferred)
              </Text>
            </View>

            {iceboxTasks.length === 0 ? (
              <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }} className="rounded-2xl p-6 items-center justify-center">
                <Text className="text-[#8E8E93] text-xs font-semibold text-center">The Icebox is empty.</Text>
                <Text className="text-[#8E8E93] text-[11px] text-center mt-0.5">Defer distractions here to protect today's focus.</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }} className="rounded-2xl overflow-hidden mb-3 opacity-65">
                {iceboxTasks.map((task, index) => {
                  const tag = tags.find(t => t.id === task.tagId);
                  const isLast = index === iceboxTasks.length - 1;
                  return (
                    <View
                      key={task.id}
                      style={{
                        borderBottomWidth: isLast ? 0 : 0.5,
                        borderBottomColor: 'rgba(255,255,255,0.05)',
                      }}
                      className="p-4 flex-row items-center justify-between"
                    >
                      <View className="flex-1 pr-4">
                        <Text className="text-zinc-300 text-base font-semibold">
                          {task.title}
                        </Text>
                        <View className="flex-row items-center mt-1 gap-1.5">
                          <View style={{ backgroundColor: '#2C2C2E' }} className="px-2 py-0.5 rounded-full">
                            <Text className="text-[#8E8E93] text-[9px] font-bold uppercase tracking-wider">{tag?.name}</Text>
                          </View>
                          <Text className="text-[#8E8E93] text-xs font-medium">{task.estimatedMinutes} mins</Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => activateFromIcebox(task.id)}
                        style={{ backgroundColor: 'rgba(191,90,242,0.2)', borderColor: 'rgba(191,90,242,0.4)', borderWidth: 1 }}
                        className="flex-row items-center px-3 py-1.5 rounded-xl"
                      >
                        <Ionicons name="thunderstorm-outline" size={12} color="#BF5AF2" />
                        <Text className="text-[#BF5AF2] font-bold text-xs ml-1">De-ice</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <EditTaskModal pillars={pillars} 
        task={editTask}
        visible={!!editTask}
        tags={tags}
        onClose={() => setEditTask(null)}
        onSave={(id, updates) => updateTask(id, updates)}
        onDelete={(id) => deleteTask(id)}
      />
    </SafeAreaView>
  );
}
