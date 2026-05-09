import { Drawer } from 'expo-router/drawer';
import { Colors } from '../../src/theme/colors';

export default function MainLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: Colors.primary,
        drawerInactiveTintColor: Colors.text,
      }}
    >
      <Drawer.Screen
        name="tabs"
        options={{
          drawerLabel: 'Map & Chat',
          title: 'Map & Chat',
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: 'Settings',
          title: 'Settings',
        }}
      />
      <Drawer.Screen
        name="about"
        options={{
          drawerLabel: 'About Us',
          title: 'About Us',
        }}
      />
    </Drawer>
  );
}
