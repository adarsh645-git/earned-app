import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Task } from '../store/taskStore';
import { Collection } from '../store/collectionStore';
import { feedback } from '../utils/feedback';

interface WeeklyReviewSheetProps {
  visible: boolean;
  onClose: () => void;
  tasks: Task[];
  collections: Collection[];
  onComplete: () => void;
}

const ACCENT = '#5AC8FA';

// GTD Reflect checklist, adapted to Krushi's existing nouns. Every item
// reflects real computed state rather than a self-reported checkbox — see
// docs/sdd/026-gtd-inbox-clarify-review.md ("Review integrity").
export default function WeeklyReviewSheet({ visible, onClose, tasks, collections, onComplete }: WeeklyReviewSheetProps) {
  const [skimmedIcebox, setSkimmedIcebox] = useState(false);
  const [skimmedCompleted, setSkimmedCompleted] = useState(false);

  const inboxTasks = tasks.filter(t => !t.tagId && !t.isIcebox && !t.parentId);
  const iceboxTasks = tasks.filter(t => t.isIcebox);

  const journeysWithoutTask = collections.filter(
    c => !tasks.some(t => t.collectionId === c.id)
  );

  // No completion timestamp exists on Task (only dateCreated) — this
  // approximates "this week" off creation date, close enough for a skim
  // given tasks in this app are typically completed within days of capture.
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const completedThisWeek = tasks.filter(
    t => t.completed && Date.parse(t.dateCreated) >= oneWeekAgo
  );

  const inboxClear = inboxTasks.length === 0;
  const journeysOk = journeysWithoutTask.length === 0;
  const allDone = inboxClear && journeysOk && skimmedIcebox && skimmedCompleted;

  const handleClose = () => {
    setSkimmedIcebox(false);
    setSkimmedCompleted(false);
    onClose();
  };

  const handleCompletePress = () => {
    if (!allDone) return;
    feedback('taskComplete');
    onComplete();
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.sheet}>
          <View style={styles.header}>
            <Ionicons name="refresh-circle-outline" size={22} color={ACCENT} />
            <Text style={styles.title}>Weekly Review</Text>
          </View>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {/* 1. Inbox empty */}
            <View style={styles.item}>
              <StatusDot done={inboxClear} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Empty the Inbox</Text>
                <Text style={styles.itemSub}>
                  {inboxClear ? 'Inbox is clear.' : `${inboxTasks.length} task${inboxTasks.length === 1 ? '' : 's'} still need tagging — close this and clarify them.`}
                </Text>
              </View>
            </View>

            {/* 2. Every active Journey has a Task */}
            <View style={styles.item}>
              <StatusDot done={journeysOk} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Every Journey has a next action</Text>
                {journeysOk ? (
                  <Text style={styles.itemSub}>All Journeys have at least one Task.</Text>
                ) : (
                  <Text style={styles.itemSub}>
                    Missing one: {journeysWithoutTask.map(c => c.title).join(', ')}
                  </Text>
                )}
              </View>
            </View>

            {/* 3. Skim Icebox — auto-passes on expand */}
            <Pressable style={styles.item} onPress={() => { feedback('expand'); setSkimmedIcebox(true); }}>
              <StatusDot done={skimmedIcebox} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Skim the Icebox ({iceboxTasks.length})</Text>
                {skimmedIcebox ? (
                  iceboxTasks.length === 0 ? (
                    <Text style={styles.itemSub}>Nothing parked right now.</Text>
                  ) : (
                    <Text style={styles.itemSub}>{iceboxTasks.map(t => t.title).join(', ')}</Text>
                  )
                ) : (
                  <Text style={styles.itemSub}>Tap to view.</Text>
                )}
              </View>
            </Pressable>

            {/* 4. Skim week's completed Tasks — auto-passes on expand */}
            <Pressable style={[styles.item, { borderBottomWidth: 0 }]} onPress={() => { feedback('expand'); setSkimmedCompleted(true); }}>
              <StatusDot done={skimmedCompleted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Skim this week's wins ({completedThisWeek.length})</Text>
                {skimmedCompleted ? (
                  completedThisWeek.length === 0 ? (
                    <Text style={styles.itemSub}>Nothing completed yet this week.</Text>
                  ) : (
                    <Text style={styles.itemSub}>{completedThisWeek.map(t => t.title).join(', ')}</Text>
                  )
                ) : (
                  <Text style={styles.itemSub}>Tap to view.</Text>
                )}
              </View>
            </Pressable>
          </ScrollView>

          <Pressable
            onPress={handleCompletePress}
            disabled={!allDone}
            style={[styles.completeButton, { opacity: allDone ? 1 : 0.4 }]}
          >
            <Text style={styles.completeLabel}>Complete Review</Text>
          </Pressable>

          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeLabel}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StatusDot({ done }: { done: boolean }) {
  return (
    <View style={[styles.dot, { backgroundColor: done ? `${ACCENT}22` : 'transparent', borderColor: done ? ACCENT : '#3A3A3C' }]}>
      {done && <Ionicons name="checkmark" size={13} color={ACCENT} />}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111113',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.25)',
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  itemSub: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  completeButton: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  completeLabel: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeLabel: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
  },
});
