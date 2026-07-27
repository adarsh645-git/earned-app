import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useCollectionStore, Collection } from '../store/collectionStore';
import { useGoalStore, Goal } from '../store/goalStore';
import { CategoryVectorIcon } from '../utils/categoryIcons';

interface LinkProgressPickerProps {
  tagType: 'earner' | 'burner';
  collectionId: string; // '' = none
  goalId: string; // '' = none
  onChange: (collectionId: string, goalId: string) => void;
  accentColor?: string;
}

/**
 * Journeys whose linked Goal matches the given economic type, or that have
 * no linked Goal at all (goalless Journeys are type-neutral). Shared between
 * `LinkProgressPicker` and the Task-row Journey pill (`AnimatedTaskRow`).
 */
export function getEligibleJourneys(collections: Collection[], goals: Goal[], tagType: 'earner' | 'burner'): Collection[] {
  const type = tagType === 'burner' ? 'entertainment' : 'productive';
  return collections.filter(c => {
    if (!c.goalId) return true;
    const goal = goals.find(g => g.id === c.goalId);
    return !goal || (goal.type || 'productive') === type;
  });
}

/**
 * Journey picker for tasks. Goal creation is Journey-only (every Goal is
 * reached through a Journey), so this only ever needs to offer Journeys —
 * picking one auto-links its Goal too, one choice, progress actually flows.
 */
export default function LinkProgressPicker({
  tagType,
  collectionId,
  goalId,
  onChange,
  accentColor = '#BF5AF2',
}: LinkProgressPickerProps) {
  const { collections } = useCollectionStore();
  const { goals } = useGoalStore();

  const eligibleJourneys = getEligibleJourneys(collections, goals, tagType);

  if (eligibleJourneys.length === 0) return null;

  const isNoneSelected = !collectionId && !goalId;

  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 13, fontWeight: '600' }}>
        Link Progress (Optional)
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Pressable
          onPress={() => onChange('', '')}
          style={({ hovered }: any) => ({
            backgroundColor: isNoneSelected ? (hovered ? '#3A2053' : '#2C183E') : (hovered ? '#2C2C2E' : '#1C1C1E'),
            borderColor: isNoneSelected ? (hovered ? '#5A3382' : '#4D2A6B') : '#2C2C2E',
            borderWidth: 1,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            marginRight: 8,
          })}
        >
          <Text style={{ color: isNoneSelected ? '#FFF' : '#8E8E93', fontWeight: isNoneSelected ? '700' : '600', fontSize: 13 }}>
            None
          </Text>
        </Pressable>

        {eligibleJourneys.map((c) => {
          const isSelected = collectionId === c.id;
          const linkedGoal = c.goalId ? goals.find(g => g.id === c.goalId) : undefined;
          return (
            <Pressable
              key={c.id}
              onPress={() => onChange(c.id, c.goalId || '')}
              style={({ hovered }: any) => ({
                backgroundColor: isSelected ? (hovered ? '#3A2053' : '#2C183E') : (hovered ? '#2C2C2E' : '#1C1C1E'),
                borderColor: isSelected ? (hovered ? '#5A3382' : '#4D2A6B') : '#2C2C2E',
                borderWidth: 1,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 12,
                marginRight: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              })}
            >
              <CategoryVectorIcon category={c.category} size={14} color={isSelected ? '#FFF' : accentColor} />
              <View>
                <Text style={{ color: isSelected ? '#FFF' : '#8E8E93', fontWeight: isSelected ? '700' : '600', fontSize: 13 }}>
                  {c.title}
                </Text>
                {linkedGoal && (
                  <Text style={{ color: isSelected ? '#D8B4FE' : '#5C5C5E', fontSize: 10, marginTop: 1 }}>
                    → {linkedGoal.title}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
