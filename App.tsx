import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import ConfettiCanvas from './src/components/ConfettiCanvas';
import './global.css';

export default function App() {
  return (
    <>
      <AppNavigator />
      <ConfettiCanvas />
      <StatusBar style="light" />
    </>
  );
}
