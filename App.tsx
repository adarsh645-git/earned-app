import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import ConfettiCanvas from './src/components/ConfettiCanvas';
import { useEconomyStore } from './src/store/economyStore';
import { useGoalStore } from './src/store/goalStore';
import { useCollectionStore } from './src/store/collectionStore';
import { useTaskStore } from './src/store/taskStore';
import './global.css';

function waitForHydration(store: { persist: { hasHydrated: () => boolean; onFinishHydration: (cb: () => void) => () => void } }): Promise<void> {
  return new Promise((resolve) => {
    if (store.persist.hasHydrated()) {
      resolve();
      return;
    }
    const unsubscribe = store.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

export default function App() {
  useEffect(() => {
    Promise.all([
      waitForHydration(useEconomyStore),
      waitForHydration(useGoalStore),
      waitForHydration(useCollectionStore),
      waitForHydration(useTaskStore),
    ]).then(() => {
      useEconomyStore.getState().applyEntertainmentClawback();
      useGoalStore.getState().applyPaysCurrencyDefaults();
      // Must run after both Goals and Collections have hydrated — it reads
      // one store and writes the other.
      useCollectionStore.getState().backfillJourneysForOrphanGoals();
      useTaskStore.getState().backfillTagPillarIds();
    });
  }, []);

  return (
    <>
      <AppNavigator />
      <ConfettiCanvas />
      <StatusBar style="light" />
    </>
  );
}
