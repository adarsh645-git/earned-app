import React, { useState } from 'react';
import { useTimerStore } from '../store/timerStore';
import ConfirmModal from '../components/ConfirmModal';

/** Shared "start a task's timer, but block with a modal if Hours balance is
 * insufficient" flow — used by both ordinary task rows (Dashboard) and Goal
 * quick-start (Journeys), so the insufficient-hours copy/behavior lives in
 * one place instead of drifting between the two screens. */
export default function useTimerLauncher() {
  const [blockedModal, setBlockedModal] = useState<{ title: string; message: string } | null>(null);
  const { startTimer } = useTimerStore();

  const launchTimer = (taskId: string, mins: number) => {
    const res = startTimer(taskId, mins);
    if (res && res.success === false && res.reason === 'insufficient_hours') {
      const missingHours = ((res.missingMinutes || 0) / 60).toFixed(1);
      setBlockedModal({
        title: 'Not Enough Time Earned',
        message: `You need ${missingHours} more hours of focus to earn this entertainment session. Focus on productive tasks to earn leisure time!`,
      });
    }
  };

  const blockedTimerModal = (
    <ConfirmModal
      visible={!!blockedModal}
      onClose={() => setBlockedModal(null)}
      icon="time-outline"
      iconColor="#FF9F0A"
      accentColor="#FF9F0A"
      title={blockedModal?.title || ''}
      message={blockedModal?.message || ''}
      actions={[
        { label: 'Got it', onPress: () => setBlockedModal(null), style: 'default' },
      ]}
    />
  );

  return { launchTimer, blockedTimerModal };
}
