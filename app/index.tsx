import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../src/theme/ThemeContext';

export default function Index() {
  const { colors } = useTheme();
  // Routing is now globally handled by src/components/AuthGuard.tsx
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
