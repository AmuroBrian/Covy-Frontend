import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../src/theme/colors';

export default function Index() {
  // Routing is now globally handled by src/components/AuthGuard.tsx
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
