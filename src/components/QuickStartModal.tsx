import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MacroGoal } from '../store/macroGoalStore';
import { useTaskStore } from '../store/taskStore';
import TimeSelectorModal from './TimeSelectorModal';

interface QuickStartModalProps {
  visible: boolean;
  onClose: () => void;
  goal: MacroGoal;
  subGoals: MacroGoal[];
  onStart: (title: string, tagId: string, targetId: string, minutes: number) => void;
}

export default function QuickStartModal({
  visible,
  onClose,
  goal,
  subGoals,
  onStart,
}: QuickStartModalProps) {
  const { tags } = useTaskStore();
  const [selectedTargetId, setSelectedTargetId] = useState<string>(goal.id);
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [minutes, setMinutes] = useState(25);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [title, setTitle] = useState('');

  // Default tag based on goal type
  useEffect(() => {
    if (visible && tags.length > 0) {
      const isEntertainment = goal.type === 'entertainment';
      const defaultTag = tags.find(t => isEntertainment ? t.type === 'burner' : t.type === 'earner');
      if (defaultTag) {
        setSelectedTagId(defaultTag.id);
      }
      setSelectedTargetId(goal.id);
      setMinutes(isEntertainment ? 60 : 25);
      setTitle('');
    }
  }, [visible, goal, tags]);

  const handleStart = () => {
    if (!title.trim() || !selectedTagId) return;
    onStart(title.trim(), selectedTagId, selectedTargetId, minutes);
    onClose();
  };

  const isEntertainment = goal.type === 'entertainment';
  const accentColor = isEntertainment ? '#5AC8FA' : '#BF5AF2';

  // Available options: Main goal + sub goals
  const targetOptions = [goal, ...subGoals];

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#1C1C1E', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#2C2C2E' }}>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700' }}>
              {isEntertainment ? 'Quick Indulge' : 'Quick Focus'}
            </Text>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#8E8E93" />
            </Pressable>
          </View>

          {/* Title Input */}
          <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Session Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={isEntertainment ? "e.g. Boss Fight" : "e.g. Read Chapter 1"}
            placeholderTextColor="#5C5C5E"
            style={{ backgroundColor: '#151517', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2C2C2E' }}
          />

          {/* Target Project / Sub-Project */}
          <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Target Project</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {targetOptions.map((opt) => {
              const isSelected = selectedTargetId === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setSelectedTargetId(opt.id)}
                  style={{
                    backgroundColor: isSelected ? accentColor + '20' : '#151517',
                    borderColor: isSelected ? accentColor : '#2C2C2E',
                    borderWidth: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: isSelected ? '#FFF' : '#8E8E93', fontWeight: isSelected ? '700' : '500' }}>
                    {opt.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Category Tag */}
          <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Category Tag</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {tags.filter(t => isEntertainment ? t.type === 'burner' : t.type === 'earner').map((tag) => {
              const isSelected = selectedTagId === tag.id;
              return (
                <Pressable
                  key={tag.id}
                  onPress={() => setSelectedTagId(tag.id)}
                  style={{
                    backgroundColor: isSelected ? accentColor + '20' : '#151517',
                    borderColor: isSelected ? accentColor : '#2C2C2E',
                    borderWidth: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: isSelected ? '#FFF' : '#8E8E93', fontWeight: isSelected ? '700' : '500' }}>
                    {tag.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Duration Selector */}
          <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Duration</Text>
          <Pressable 
            onPress={() => setShowTimePicker(true)}
            style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: '#2C2C2E', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>
              {Math.floor(minutes / 60)}h {minutes % 60}m
            </Text>
            <Ionicons name="time-outline" size={20} color="#8E8E93" />
          </Pressable>

          {/* Start Button */}
          <Pressable
            onPress={handleStart}
            style={{
              backgroundColor: accentColor,
              padding: 16,
              borderRadius: 16,
              alignItems: 'center',
              opacity: !title.trim() ? 0.5 : 1
            }}
            disabled={!title.trim()}
          >
            <Text style={{ color: isEntertainment ? '#000' : '#FFF', fontSize: 16, fontWeight: '700' }}>
              {isEntertainment ? `Indulge (-${minutes}m)` : `Focus (+${minutes}m)`}
            </Text>
          </Pressable>

        </View>
      </View>

      <TimeSelectorModal
        visible={showTimePicker}
        initialMinutes={minutes}
        title="Session Duration"
        onClose={() => setShowTimePicker(false)}
        onConfirm={(m) => {
          setMinutes(m);
          setShowTimePicker(false);
        }}
      />
    </Modal>
  );
}
