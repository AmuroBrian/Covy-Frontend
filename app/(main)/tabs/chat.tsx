import React from 'react';
import { View } from 'react-native';

export default function ChatScreenDummy() {
  // This screen is never actually rendered because the tab press is intercepted
  // in _layout.tsx to open the ChatModal instead. We keep this file so Expo Router
  // resolves the "chat" tab correctly.
  return <View />;
}
