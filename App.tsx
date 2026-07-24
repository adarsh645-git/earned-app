import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import ConfettiCanvas from './src/components/ConfettiCanvas';
import { useEconomyStore } from './src/store/economyStore';
import { useMacroGoalStore } from './src/store/macroGoalStore';
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
      waitForHydration(useMacroGoalStore),
    ]).then(() => {
      useEconomyStore.getState().applyEntertainmentClawback();
      useMacroGoalStore.getState().applyPaysCurrencyDefaults();
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
