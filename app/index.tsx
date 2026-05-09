import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/theme/colors';

export default function Index() {
  const { session, isLoading, hasPartner } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!hasPartner) {
    return <Redirect href="/(auth)/invite" />;
  }

  // If authenticated and paired, proceed to the Map screen
  return <Redirect href="/(main)/tabs/map" />;
}
