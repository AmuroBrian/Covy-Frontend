import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, LogBox } from 'react-native';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { RealtimeProvider } from '../src/context/RealtimeContext';
import { AuthGuard } from '../src/components/AuthGuard';
import { GlobalOverlay } from '../src/components/GlobalOverlay';
import registerNNPushToken from 'native-notify';

// Ignore Native Notify internal subscription warning
LogBox.ignoreLogs(['Notifications.removeNotificationSubscription']);

function RootContent() {
  const { colors } = useTheme();
  return (
    <RealtimeProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Slot />
      </View>
      <GlobalOverlay />
    </RealtimeProvider>
  );
}

export default function RootLayout() {
  registerNNPushToken(33686, 'Xsjjt4pg3babW3De5ZDNq8');
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AuthGuard>
            <ThemeProvider>
              <RootContent />
            </ThemeProvider>
          </AuthGuard>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
