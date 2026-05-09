import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../src/theme/colors';
import { View } from 'react-native';
import { AuthProvider } from '../src/context/AuthContext';
import { RealtimeProvider } from '../src/context/RealtimeContext';
import { AuthGuard } from '../src/components/AuthGuard';
import { GlobalOverlay } from '../src/components/GlobalOverlay';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AuthGuard>
            <RealtimeProvider>
              <View style={{ flex: 1, backgroundColor: Colors.background }}>
                <Slot />
              </View>
              <GlobalOverlay />
            </RealtimeProvider>
          </AuthGuard>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
