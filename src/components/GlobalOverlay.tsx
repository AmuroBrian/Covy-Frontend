import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import LottieView from 'lottie-react-native';
import { OverlayManager } from '../context/OverlayManager';
import { useTheme } from '../theme/ThemeContext';

// Check if we are running in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Rive implementation temporarily removed due to missing native bundle resources crashing the app on startup

export const GlobalOverlay = () => {
  const [overlayState, setOverlayState] = useState<'none' | 'loading' | 'offline'>('none');
  const { colors } = useTheme();
  
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const unsubscribe = OverlayManager.subscribe((state) => {
      setOverlayState(state);
    });
    return unsubscribe;
  }, []);

  if (overlayState === 'none') {
    return null;
  }

  return (
    <View style={styles.overlayContainer}>
      <View style={styles.contentBox}>
        {overlayState === 'offline' && (
          <>
            <LottieView
              source={require('../../assets/images/sadheart.json')}
              autoPlay
              loop
              style={styles.lottieAnimation}
            />
            <Text style={styles.title}>Oops! We are Offline.</Text>
            <Text style={styles.subtitle}>Our servers are currently unreachable. Please try again later.</Text>
          </>
        )}

        {overlayState === 'loading' && (
          <>
            <View style={styles.fallbackLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.subtitle}>Loading securely...</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background === '#FFFFFF' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(18, 18, 18, 0.95)',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentBox: {
    alignItems: 'center',
    padding: 20,
    width: '80%',
  },
  lottieAnimation: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  riveAnimation: {
    width: 150,
    height: 150,
  },
  fallbackLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
});
