import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CurvedTabBar } from '../../../src/components/CurvedTabBar';
import ChatModal from '../../../src/components/chat/ChatModal';
import FloatingEmojis from '../../../src/components/shared/FloatingEmojis';
import { useState } from 'react';

export default function TabLayout() {
  const [isChatOpen, setChatOpen] = useState(false);

  return (
    <>
    <Tabs
      tabBar={(props) => <CurvedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
        }}
        listeners={() => ({
          tabPress: (e) => {
            // Prevent default navigation
            e.preventDefault();
            // Open the modal instead
            setChatOpen(true);
          },
        })}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
        }}
      />
      <Tabs.Screen
        name="shared"
        options={{
          title: 'Shared',
        }}
      />
    </Tabs>
      <ChatModal visible={isChatOpen} onClose={() => setChatOpen(false)} />
      <FloatingEmojis />
    </>
  );
}
