import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, Animated, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Task } from '../store/taskStore';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { feedback } from '../utils/feedback';

interface AnimatedTaskRowProps {
  task: Task;
  tagName: string | undefined;
  isLast: boolean;
  onToggle: (id: string) => void;
  onMoveToIcebox?: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onStartTimer?: (id: string, mins: number) => void;
  showStartButton?: boolean;
  showIceboxButton?: boolean;
}

export default function AnimatedTaskRow({
  task,
  tagName,
  isLast,
  onToggle,
  onMoveToIcebox,
  onEdit,
  onDelete,
  onStartTimer,
  showStartButton = false,
  showIceboxButton = true,
}: AnimatedTaskRowProps) {
  const checkScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.6)).current;
  const rowOpacity = useRef(new Animated.Value(1)).current;
  const rowTranslateX = useRef(new Animated.Value(0)).current;
  const rowHeight = useRef(new Animated.Value(1)).current; // scale factor for height collapse
  const strikethrough = useRef(new Animated.Value(task.completed ? 1 : 0)).current;

  const [localCompleted, setLocalCompleted] = useState(task.completed);

  // Sync local state if prop changes (e.g. un-checked from Completed list)
  useEffect(() => {
    setLocalCompleted(task.completed);
    if (!task.completed) {
      strikethrough.setValue(0);
      rowOpacity.setValue(1);
      rowTranslateX.setValue(0);
    } else {
      strikethrough.setValue(1);
    }
  }, [task.completed]);

  const handleToggle = useCallback(() => {
    if (task.completed) {
      // Un-completing: just toggle, LayoutAnimation handles the list change
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onToggle(task.id);
      return;
    }

    // Completing: trigger multi-layered animation
    feedback('taskComplete');
    setLocalCompleted(true); // instantly show checkmark

    // 1. Checkbox spring bounce + green glow ring pulse + strikethrough
    Animated.parallel([
      Animated.sequence([
        Animated.spring(checkScale, { toValue: 1.5, useNativeDriver: true, speed: 80, bounciness: 16 }),
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }),
      ]),
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowOpacity, { toValue: 0.7, duration: 150, useNativeDriver: true }),
          Animated.timing(glowScale, { toValue: 2.0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.timing(glowOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
      Animated.timing(strikethrough, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // 2. After 600ms delay, slide left + fade out row
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(rowTranslateX, { toValue: -80, duration: 400, useNativeDriver: true }),
        Animated.timing(rowOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
      
      // 3. After fadeout finishes, tell parent to move it to the Completed list
      setTimeout(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onToggle(task.id);
      }, 400);
    }, 600);
  }, [task.id, task.completed, onToggle, checkScale, glowOpacity, glowScale, rowOpacity, rowTranslateX, strikethrough]);

  // Reset glow after animation
  useEffect(() => {
    glowScale.setValue(0.6);
    glowOpacity.setValue(0);
  }, []);

  const isStrikethrough = localCompleted;

  return (
    <Animated.View
      style={{
        borderBottomWidth: isLast ? 0 : 0.5,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        opacity: rowOpacity,
        transform: [{ translateX: rowTranslateX }],
      }}
    >
      <View className="flex-row items-stretch justify-between min-h-[72px]">
        <View className="flex-row items-center flex-1 py-4 pl-4 pr-2">
          {/* Checkbox with glow ring */}
          <Pressable onPress={handleToggle} style={{ position: 'relative' }}>
            {/* Green glow ring (behind checkbox) */}
            <Animated.View
              style={{
                position: 'absolute',
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#30D158',
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
                left: 0,
                top: 0,
              }}
              pointerEvents="none"
            />
            {/* Checkbox */}
            <Animated.View
              style={[
                {
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  transform: [{ scale: checkScale }],
                },
                localCompleted
                  ? { backgroundColor: '#30D158', borderColor: '#30D158' }
                  : { borderColor: '#8E8E93', backgroundColor: 'transparent' },
              ]}
            >
              {localCompleted && (
                <Ionicons name="checkmark" size={14} color="white" />
              )}
            </Animated.View>
          </Pressable>

          {/* Task Text */}
          <Pressable 
            onPress={handleToggle}
            className="flex-1"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text
              className={`text-base font-semibold ${
                isStrikethrough ? 'line-through text-[#8E8E93]' : 'text-white'
              }`}
            >
              {task.title}
            </Text>
            <View className="flex-row items-center mt-1 gap-1.5">
              <View style={{ backgroundColor: '#2C2C2E' }} className="px-2 py-0.5 rounded-full">
                <Text className="text-[#8E8E93] text-[9px] font-bold uppercase tracking-wider">
                  {tagName}
                </Text>
              </View>
              <Text className="text-[#8E8E93] text-xs font-medium">
                {task.estimatedMinutes} mins
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Actions - Shadcn-style ghost buttons */}
        <View className="flex-row items-stretch">
          {showStartButton && !localCompleted && onStartTimer && (
            <>
              <Pressable
                onPress={() => onStartTimer(task.id, task.estimatedMinutes)}
                className="px-3 justify-center items-center bg-transparent hover:bg-[#2C2C2E]"
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <Ionicons name="play" size={20} color="#BF5AF2" />
              </Pressable>
              {onEdit && <View className="self-center" style={{ width: 1, height: 16, backgroundColor: '#3A3A3C' }} />}
            </>
          )}

          {onEdit && (
            <>
              <Pressable
                onPress={() => onEdit(task)}
                className="px-3 justify-center items-center bg-transparent hover:bg-[#2C2C2E]"
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <Ionicons name="pencil" size={20} color="#8E8E93" />
              </Pressable>
              {showIceboxButton && onMoveToIcebox && <View className="self-center" style={{ width: 1, height: 16, backgroundColor: '#3A3A3C' }} />}
            </>
          )}

          {showIceboxButton && onMoveToIcebox && (
            <>
              <Pressable
                onPress={() => onMoveToIcebox(task.id)}
                className="px-3 justify-center items-center bg-transparent hover:bg-[#2C2C2E]"
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <Ionicons name="snow-outline" size={20} color="#8E8E93" />
              </Pressable>
              {onDelete && <View className="self-center" style={{ width: 1, height: 16, backgroundColor: '#3A3A3C' }} />}
            </>
          )}

          {onDelete && (
            <Pressable
              onPress={() => onDelete(task.id)}
              className="px-3 justify-center items-center bg-transparent hover:bg-[rgba(255,69,58,0.1)]"
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Ionicons name="trash-outline" size={20} color="#FF453A" />
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
