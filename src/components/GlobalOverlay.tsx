import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import LottieView from 'lottie-react-native';
import { OverlayManager } from '../context/OverlayManager';
import { Colors } from '../theme/colors';

// Check if we are running in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// We dynamically require Rive so we don't crash Expo Go at startup
let Rive: any = null;
if (!isExpoGo) {
  try {
    Rive = require('rive-react-native').default;
  } catch (error) {
    console.warn('Rive not available:', error);
  }
}

export const GlobalOverlay = () => {
  const [overlayState, setOverlayState] = useState<'none' | 'loading' | 'offline'>('none');

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
            {!isExpoGo && Rive ? (
              <Rive
                resourceName="loveloading"
                autoplay={true}
                style={styles.riveAnimation}
              />
            ) : (
              <View style={styles.fallbackLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.subtitle}>Loading securely...</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
});
