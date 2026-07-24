import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCollectionStore } from '../store/collectionStore';
import { useMacroGoalStore, MacroGoalType } from '../store/macroGoalStore';
import { CategoryVectorIcon } from '../utils/categoryIcons';

interface LinkProgressPickerProps {
  tagType: 'earner' | 'burner';
  collectionId: string; // '' = none
  macroGoalId: string; // '' = none
  onChange: (collectionId: string, macroGoalId: string) => void;
  accentColor?: string;
}

/**
 * Combined Journey / macro-goal picker for tasks. Picking a Journey with a
 * linked macro goal auto-links that goal too (one choice, progress actually
 * flows); picking a standalone goal clears any Journey; "None" clears both.
 */
export default function LinkProgressPicker({
  tagType,
  collectionId,
  macroGoalId,
  onChange,
  accentColor = '#BF5AF2',
}: LinkProgressPickerProps) {
  const { collections } = useCollectionStore();
  const { macroGoals } = useMacroGoalStore();

  const type: MacroGoalType = tagType === 'burner' ? 'entertainment' : 'productive';

  // Journeys whose linked goal matches this task's economic type, or that
  // have no linked goal at all (goalless Journeys are type-neutral).
  const eligibleJourneys = collections.filter(c => {
    if (!c.macroGoalId) return true;
    const goal = macroGoals.find(g => g.id === c.macroGoalId);
    return !goal || (goal.type || 'productive') === type;
  });

  // Root goals of the matching type that aren't already reachable via a
  // Journey above (avoids two picker entries for the same underlying goal).
  const journeyGoalIds = new Set(collections.map(c => c.macroGoalId).filter(Boolean));
  const standaloneGoals = macroGoals.filter(g =>
    !g.parentId && (g.type || 'productive') === type && !journeyGoalIds.has(g.id)
  );

  if (eligibleJourneys.length === 0 && standaloneGoals.length === 0) return null;

  const isNoneSelected = !collectionId && !macroGoalId;

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
          const linkedGoal = c.macroGoalId ? macroGoals.find(g => g.id === c.macroGoalId) : undefined;
          return (
            <Pressable
              key={c.id}
              onPress={() => onChange(c.id, c.macroGoalId || '')}
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

        {standaloneGoals.map((g) => {
          const isSelected = !collectionId && macroGoalId === g.id;
          return (
            <Pressable
              key={g.id}
              onPress={() => onChange('', g.id)}
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
              <Ionicons name="triangle-outline" size={12} color={isSelected ? '#FFF' : accentColor} />
              <Text style={{ color: isSelected ? '#FFF' : '#8E8E93', fontWeight: isSelected ? '700' : '600', fontSize: 13 }}>
                {g.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
