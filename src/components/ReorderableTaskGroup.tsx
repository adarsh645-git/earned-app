import React, { useCallback, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, PanResponder, Platform, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Task } from '../store/taskStore';
import { feedback } from '../utils/feedback';

const DEFAULT_ROW_HEIGHT = 72;

interface DraggableRowProps {
  task: Task;
  dragEnabled: boolean;
  isDragged: boolean;
  dragY: Animated.Value;
  dragScale: Animated.Value;
  shift: Animated.Value;
  onLayout: (id: string, e: LayoutChangeEvent) => void;
  onGrant: (id: string) => void;
  onMove: (id: string, dy: number) => void;
  onRelease: () => void;
  renderRow: (task: Task, extra: { dragAccessory?: React.ReactNode }) => React.ReactNode;
}

// One active row's drag surface. Its PanResponder lives only on the grip
// (not the whole row), so every other tap target on the row — the checkbox,
// EditableText title, pills, ghost buttons — keeps working untouched, and
// the outer ScrollView keeps its own gesture for touches that don't start
// on the grip.
function DraggableRow({
  task,
  dragEnabled,
  isDragged,
  dragY,
  dragScale,
  shift,
  onLayout,
  onGrant,
  onMove,
  onRelease,
  renderRow,
}: DraggableRowProps) {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => onGrant(task.id),
      onPanResponderMove: (_evt, gesture) => onMove(task.id, gesture.dy),
      onPanResponderRelease: () => onRelease(),
      onPanResponderTerminate: () => onRelease(),
    })
  ).current;

  const grip = dragEnabled ? (
    <View
      {...panResponder.panHandlers}
      style={[
        { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
        Platform.OS === 'web' ? ({ cursor: 'grab', userSelect: 'none' } as any) : null,
      ]}
    >
      <Ionicons name="reorder-three-outline" size={20} color="#8E8E93" />
    </View>
  ) : undefined;

  return (
    <Animated.View
      onLayout={(e) => onLayout(task.id, e)}
      style={{
        zIndex: isDragged ? 20 : 0,
        elevation: isDragged ? 8 : 0,
        transform: isDragged
          ? [{ translateY: dragY }, { scale: dragScale }]
          : [{ translateY: shift }],
        ...(isDragged
          ? {
              backgroundColor: '#232326',
              borderRadius: 12,
              opacity: 0.97,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
            }
          : null),
      }}
    >
      {renderRow(task, { dragAccessory: grip })}
    </Animated.View>
  );
}

interface ReorderableTaskGroupProps {
  /** Pre-sorted: active tasks (by manual order) first, then completed tasks. */
  tasks: Task[];
  activeCount: number;
  /** Persists a manual reorder — wired to taskStore.reorderTasks. */
  onReorder: (orderedActiveIds: string[]) => void;
  /** Lets the screen disable outer ScrollView momentum while a drag is live. */
  onDragActiveChange: (dragging: boolean) => void;
  /** Builds the actual row content (border wrapper, AnimatedTaskRow, nested
   * subtask block) — this component only owns drag physics, not row look. */
  renderRow: (task: Task, extra: { dragAccessory?: React.ReactNode }) => React.ReactNode;
}

export default function ReorderableTaskGroup({
  tasks,
  activeCount,
  onReorder,
  onDragActiveChange,
  renderRow,
}: ReorderableTaskGroupProps) {
  const activeTasks = tasks.slice(0, activeCount);
  const completedTasks = tasks.slice(activeCount);
  const activeIds = activeTasks.map(t => t.id);

  // Ref-mirrors of render-derived state so PanResponder handlers (created
  // once per row, read many times across a drag) always see the live
  // sequence instead of a stale one captured at mount.
  const activeIdsRef = useRef(activeIds);
  activeIdsRef.current = activeIds;

  const rowLayouts = useRef<Record<string, { y: number; height: number }>>({}).current;
  const rowShifts = useRef<Record<string, Animated.Value>>({}).current;
  const getRowShift = (id: string) => {
    if (!rowShifts[id]) rowShifts[id] = new Animated.Value(0);
    return rowShifts[id];
  };
  const getRowHeight = (id: string) => rowLayouts[id]?.height ?? DEFAULT_ROW_HEIGHT;
  const getRowY = (id: string, fallbackIndex: number) => rowLayouts[id]?.y ?? fallbackIndex * DEFAULT_ROW_HEIGHT;

  const dragY = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const draggedIdRef = useRef<string | null>(null);
  const hoverIndexRef = useRef(0);
  const currentDyRef = useRef(0);

  const handleLayout = useCallback((id: string, e: LayoutChangeEvent) => {
    rowLayouts[id] = { y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height };
  }, [rowLayouts]);

  const handleGrant = useCallback((id: string) => {
    draggedIdRef.current = id;
    setDraggedId(id);
    dragY.setValue(0);
    currentDyRef.current = 0;
    hoverIndexRef.current = activeIdsRef.current.indexOf(id);
    Animated.spring(dragScale, { toValue: 1.03, useNativeDriver: false, speed: 40, bounciness: 8 }).start();
    feedback('reorderPickup');
    onDragActiveChange(true);
  }, [dragY, dragScale, onDragActiveChange]);

  const handleMove = useCallback((id: string, dy: number) => {
    if (draggedIdRef.current !== id) return;
    dragY.setValue(dy);
    currentDyRef.current = dy;

    const ids = activeIdsRef.current;
    const i0 = ids.indexOf(id);
    const H = getRowHeight(id);
    const center = getRowY(id, i0) + H / 2 + dy;

    // hoverIndex = how many *other* rows' resting midpoints the dragged
    // row's current center has passed — a direct 0-based insertion index.
    let idx = 0;
    ids.forEach((sid, i) => {
      if (sid === id) return;
      const mid = getRowY(sid, i) + getRowHeight(sid) / 2;
      if (mid < center) idx++;
    });
    const hoverIndex = Math.max(0, Math.min(ids.length - 1, idx));

    if (hoverIndex !== hoverIndexRef.current) {
      hoverIndexRef.current = hoverIndex;
      feedback('select');
      // Gap size is always the dragged row's own height, regardless of
      // sibling height variance (wrapping pill rows can differ slightly).
      ids.forEach((sid, j) => {
        if (sid === id) return;
        let target = 0;
        if (i0 < hoverIndex && j > i0 && j <= hoverIndex) target = -H;
        else if (i0 > hoverIndex && j >= hoverIndex && j < i0) target = H;
        Animated.spring(getRowShift(sid), { toValue: target, useNativeDriver: true, speed: 24, bounciness: 4 }).start();
      });
    }
  }, []);

  const settle = useCallback(() => {
    Animated.parallel([
      Animated.spring(dragY, { toValue: 0, useNativeDriver: false, speed: 20, bounciness: 6 }),
      Animated.spring(dragScale, { toValue: 1, useNativeDriver: false, speed: 20, bounciness: 6 }),
    ]).start(() => {
      draggedIdRef.current = null;
      setDraggedId(null);
    });
  }, [dragY, dragScale]);

  const handleRelease = useCallback(() => {
    const id = draggedIdRef.current;
    if (!id) return;
    const ids = activeIdsRef.current;
    const i0 = ids.indexOf(id);
    const hoverIndex = Math.max(0, Math.min(ids.length - 1, hoverIndexRef.current));

    onDragActiveChange(false);

    if (hoverIndex === i0) {
      settle();
      return;
    }

    const H = getRowHeight(id);
    // FLIP, computed analytically rather than waiting for a fresh onLayout
    // pass: the dragged row's new resting slot sits `delta` away from where
    // it started, purely from the uniform per-row gap it crossed.
    const delta = (hoverIndex - i0) * H;

    const newOrder = [...ids];
    newOrder.splice(i0, 1);
    newOrder.splice(hoverIndex, 0, id);

    // Siblings' shift offsets are meaningless once the array itself
    // reorders (their natural flex position now reflects the new order).
    ids.forEach(sid => { if (sid !== id) getRowShift(sid).setValue(0); });

    // Invert: anchor the dragged row at its pre-reorder visual position so
    // the commit below doesn't cause a one-frame jump, then let `settle()`
    // spring it down to its new resting slot.
    dragY.setValue(currentDyRef.current - delta);

    onReorder(newOrder);

    requestAnimationFrame(settle);
  }, [onReorder, onDragActiveChange, settle, dragY]);

  return (
    <View>
      {activeTasks.map(task => (
        <DraggableRow
          key={task.id}
          task={task}
          dragEnabled={activeTasks.length >= 2}
          isDragged={draggedId === task.id}
          dragY={dragY}
          dragScale={dragScale}
          shift={getRowShift(task.id)}
          onLayout={handleLayout}
          onGrant={handleGrant}
          onMove={handleMove}
          onRelease={handleRelease}
          renderRow={renderRow}
        />
      ))}
      {completedTasks.map(task => (
        <React.Fragment key={task.id}>{renderRow(task, {})}</React.Fragment>
      ))}
    </View>
  );
}
