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

  // Group tags by bucket
  const tagsByBucket = tags.reduce((acc, tag) => {
    if (!acc[tag.bucket]) acc[tag.bucket] = [];
    acc[tag.bucket].push(tag);
    return acc;
  }, {} as Record<Bucket, Tag[]>);

  const bucketColors: Record<Bucket, string> = {
    office: '#0A84FF',
    health: '#30D158',
    personal: '#BF5AF2'
  };

  const getBucketColor = (bucket: Bucket) => bucketColors[bucket] || '#A1A1AA';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' }}
      >
        <View style={{ backgroundColor: '#09090B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' }}>
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

            {/* Tags */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' }}>
                Category
              </Text>
              {(Object.keys(tagsByBucket) as Bucket[]).map(bucket => (
                <View key={bucket} style={{ marginBottom: 16 }}>
                  <Text style={{ color: getBucketColor(bucket), fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'capitalize' }}>
                    {bucket}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {tagsByBucket[bucket].map(tag => (
                      <Pressable
                        key={tag.id}
                        onPress={() => setTagId(tag.id)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: tagId === tag.id ? getBucketColor(bucket) : '#18181B',
                          borderWidth: 1,
                          borderColor: tagId === tag.id ? getBucketColor(bucket) : '#27272A'
                        }}
                      >
                        <Text style={{ 
                          color: tagId === tag.id ? '#FFFFFF' : '#A1A1AA',
                          fontSize: 13,
                          fontWeight: tagId === tag.id ? '700' : '500'
                        }}>
                          {tag.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            <PrimaryButton title="Save Changes" onPress={handleSave} />
            
            <Pressable 
              onPress={handleDelete}
              style={({ pressed }) => ({
                marginTop: 16,
                paddingVertical: 16,
                borderRadius: 12,
                backgroundColor: pressed ? '#3F161A' : '#2A0E12',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#4C1014'
              })}
            >
              <Text style={{ color: '#FF453A', fontSize: 16, fontWeight: '600' }}>Delete Task</Text>
            </Pressable>
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
