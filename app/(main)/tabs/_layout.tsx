import { Tabs } from 'expo-router';
import { Colors } from '../../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { CurvedTabBar } from '../../../src/components/CurvedTabBar';

export default function TabLayout() {
  return (
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
  );
}
