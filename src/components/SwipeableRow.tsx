import React, { useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { feedback } from '../utils/feedback';

const BUTTON_WIDTH = 56;

interface SwipeableRowProps {
  taskId: string;
  onMoveToIcebox?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Mirrors AnimatedTaskRow's prop of the same name/purpose — subtask rows
   * pass false here (icebox doesn't apply at that granularity), so those
   * rows only ever reveal Delete. */
  showIceboxButton?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps a task row with swipe-to-reveal Icebox/Delete (reveal only — the
 * action always requires an explicit tap on the revealed button, never an
 * instant full-swipe commit) and a right-click context menu offering the
 * same two actions. Both were pulled out of AnimatedTaskRow's own
 * always-visible icon row to declutter it down to just Start-timer/Edit.
 *
 * The swipe gesture claims the responder by *shape* (dominant horizontal
 * movement past a small threshold), not by owning a dedicated element the
 * way the drag-reorder grip does — so a plain tap still reaches the
 * checkbox/title/pills/icons untouched, and a vertical drag still reaches
 * the outer ScrollView (and the drag-reorder grip, which claims its own
 * touches first) exactly as before this wrapper existed.
 */
export default function SwipeableRow({
  taskId,
  onMoveToIcebox,
  onDelete,
  showIceboxButton = true,
  children,
}: SwipeableRowProps) {
  const drawerWidth = (showIceboxButton ? 2 : 1) * BUTTON_WIDTH;

  const swipeX = useRef(new Animated.Value(0)).current;
  const baseXRef = useRef(0); // swipeX's value at the start of the current gesture
  const isOpenRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false); // mirrors isOpenRef, drives the tap-to-close overlay's mount

  const clamp = (v: number) => Math.max(-drawerWidth, Math.min(0, v));

  const settle = (open: boolean) => {
    isOpenRef.current = open;
    setIsOpen(open);
    Animated.spring(swipeX, {
      toValue: open ? -drawerWidth : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 8,
      onPanResponderGrant: () => {
        baseXRef.current = isOpenRef.current ? -drawerWidth : 0;
      },
      onPanResponderMove: (_evt, gesture) => {
        swipeX.setValue(clamp(baseXRef.current + gesture.dx));
      },
      onPanResponderRelease: (_evt, gesture) => {
        const current = clamp(baseXRef.current + gesture.dx);
        settle(current < -drawerWidth / 2);
      },
      onPanResponderTerminate: (_evt, gesture) => {
        const current = clamp(baseXRef.current + gesture.dx);
        settle(current < -drawerWidth / 2);
      },
    })
  ).current;

  const handleIcebox = () => {
    feedback('select');
    onMoveToIcebox?.(taskId);
    settle(false);
  };

  const handleDelete = () => {
    onDelete?.(taskId);
    settle(false);
  };

  // ─── Right-click context menu (web only). `onContextMenu` is one of RNW's
  // forwarded DOM props on View (confirmed in its source), so it Just Works
  // as a normal prop — no direct DOM listener needed. Positioned via a
  // `Modal` (same escape-hatch PillPicker uses) so `left`/`top` are relative
  // to the viewport, not this row's own local `position:relative` container.
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: any) => {
    e.preventDefault?.();
    const native = e.nativeEvent ?? e;
    setMenuPos({ x: native.pageX ?? native.clientX, y: native.pageY ?? native.clientY });
  };

  const closeMenu = () => setMenuPos(null);

  return (
    <View
      style={{ overflow: 'hidden', position: 'relative' }}
      {...({ onContextMenu: handleContextMenu } as any)}
    >
      {/* Drawer — static, revealed as the content layer slides left over it */}
      <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, flexDirection: 'row' }}>
        {showIceboxButton && (
          <Pressable
            onPress={handleIcebox}
            style={{ width: BUTTON_WIDTH, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C2C2E' }}
          >
            <Ionicons name="snow-outline" size={20} color="#8E8E93" />
          </Pressable>
        )}
        <Pressable
          onPress={handleDelete}
          style={{ width: BUTTON_WIDTH, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,69,58,0.15)' }}
        >
          <Ionicons name="trash-outline" size={20} color="#FF453A" />
        </Pressable>
      </View>

      {/* Content layer — the actual row, translated to reveal the drawer */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{ backgroundColor: '#1C1C1E', transform: [{ translateX: swipeX }] }}
      >
        {children}
        {isOpen && (
          // Tapping the row while the drawer is open closes it instead of
          // reaching whatever's underneath (e.g. toggle-expand) — mounted
          // only while open, so it never intercepts a normal tap otherwise.
          <Pressable style={StyleSheet.absoluteFill} onPress={() => settle(false)} />
        )}
      </Animated.View>

      {/* Right-click context menu — rendered in a Modal (escapes this row's
          own `position:relative` container and any card `overflow:hidden`
          clipping), positioned at the actual click point in viewport space. */}
      {menuPos && (
        <Modal visible transparent animationType="fade" onRequestClose={closeMenu}>
          <View style={{ flex: 1 }}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
            <View
              style={{
                position: 'absolute',
                left: menuPos.x,
                top: menuPos.y,
                backgroundColor: 'rgba(9,9,11,0.96)',
                borderWidth: 1,
                borderColor: '#27272A',
                borderRadius: 10,
                overflow: 'hidden',
                minWidth: 160,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              {showIceboxButton && (
                <Pressable
                  onPress={() => { closeMenu(); handleIcebox(); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: '#18181B' }}
                >
                  <Ionicons name="snow-outline" size={16} color="#A1A1AA" />
                  <Text style={{ color: '#A1A1AA', fontSize: 14, fontWeight: '500' }}>Move to Icebox</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => { closeMenu(); handleDelete(); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}
              >
                <Ionicons name="trash-outline" size={16} color="#FF453A" />
                <Text style={{ color: '#FF453A', fontSize: 14, fontWeight: '500' }}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
