import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PrimaryButton } from './PrimaryButton';
import { Task, Tag, Bucket } from '../store/taskStore';
import TimeSelectorModal from './TimeSelectorModal';

interface EditTaskModalProps {
  task: Task | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  tags: Tag[];
}

export default function EditTaskModal({
  task,
  visible,
  onClose,
  onSave,
  onDelete,
  tags
}: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [tagId, setTagId] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(0);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(() => {
    if (task && visible) {
      setTitle(task.title);
      setTagId(task.tagId);
      setEstimatedMinutes(task.estimatedMinutes);
    }
  }, [task, visible]);

  if (!task) return null;

  const handleSave = () => {
    if (!title.trim() || !tagId) return;
    onSave(task.id, {
      title: title.trim(),
      tagId,
      estimatedMinutes
    });
    onClose();
  };

  const handleDelete = () => {
    onDelete(task.id);
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
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>Edit Task</Text>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#A1A1AA" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Title */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' }}>
                Task Title
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What needs to be done?"
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

            {/* Time Estimate */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' }}>
                Time Estimate
              </Text>
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
                  {Math.floor(estimatedMinutes / 60)}h {estimatedMinutes % 60}m
                </Text>
                <Ionicons name="time-outline" size={20} color="#A1A1AA" />
              </Pressable>
            </View>

            {/* Category Dropdown */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' }}>
                Category
              </Text>
              
              <Pressable
                onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                style={{
                  backgroundColor: '#18181B',
                  padding: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#27272A',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: tagId ? '#FFFFFF' : '#52525B', fontSize: 14 }}>
                  {tagId ? tags.find(t => t.id === tagId)?.name : 'Select a category'}
                </Text>
                <Ionicons name={showCategoryDropdown ? "chevron-up" : "chevron-down"} size={16} color="#A1A1AA" />
              </Pressable>

              {showCategoryDropdown && (
                <View style={{ 
                  marginTop: 4,
                  backgroundColor: '#09090B', 
                  borderWidth: 1, 
                  borderColor: '#27272A', 
                  borderRadius: 8,
                  overflow: 'hidden'
                }}>
                  {tags.map(tag => (
                    <Pressable
                      key={tag.id}
                      onPress={() => {
                        setTagId(tag.id);
                        setShowCategoryDropdown(false);
                      }}
                      style={{
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottomWidth: 1,
                        borderBottomColor: '#18181B'
                      }}
                    >
                      <Text style={{ color: tagId === tag.id ? '#FFFFFF' : '#A1A1AA', fontSize: 14 }}>
                        {tag.name}
                      </Text>
                      {tagId === tag.id && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Footer */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Pressable onPress={handleDelete} style={{ padding: 8 }}>
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
        initialMinutes={estimatedMinutes}
        onClose={() => setShowTimeSelector(false)}
        onConfirm={(mins) => {
          setEstimatedMinutes(mins);
          setShowTimeSelector(false);
        }}
        title="Estimate Duration"
      />
    </Modal>
  );
}
