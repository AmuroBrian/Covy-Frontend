import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRealtime } from '../../../src/context/RealtimeContext';
import { useTheme } from '../../../src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SkiaPet from '../../../src/components/pet/SkiaPet';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const FOODS = ['🍎', '🍔', '🥕', '🥩', '🍰'];

function FoodItem({ food, onFeed }: { food: string, onFeed: () => void }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.value = true;
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      if (translateY.value < -150) {
        runOnJS(onFeed)();
      }
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      isDragging.value = false;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: isDragging.value ? 1.2 : 1 },
    ],
    zIndex: isDragging.value ? 100 : 1,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.foodItem, animatedStyle]}>
        <Text style={styles.foodEmoji}>{food}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

export default function PetScreen() {
  const { petState, getPetState, feedPet, patPet, togglePetSleep } = useRealtime();
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    getPetState();
    const interval = setInterval(getPetState, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const isSleeping = petState?.state === 'SLEEPING';

  return (
    <View style={[styles.container, { backgroundColor: isSleeping ? '#0a0a2a' : colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={isSleeping ? '#fff' : colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isSleeping ? '#fff' : colors.text }]}>
          {petState?.name || 'Our Pou'}
        </Text>
        <TouchableOpacity onPress={togglePetSleep} style={styles.lampButton}>
          <Ionicons name={isSleeping ? 'moon' : 'sunny'} size={28} color={isSleeping ? '#FFD700' : colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Hunger</Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${petState?.hunger || 0}%`, backgroundColor: '#ff6b6b' }]} />
          </View>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Happiness</Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${petState?.happiness || 0}%`, backgroundColor: '#4ecdc4' }]} />
          </View>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Sleepiness</Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${petState?.sleepiness || 0}%`, backgroundColor: '#4b6cb7' }]} />
          </View>
        </View>
      </View>

      <View style={styles.petArea}>
        <SkiaPet state={petState?.state || 'IDLE'} onPress={() => patPet()} />
      </View>

      {/* Food Drawer */}
      {!isSleeping && (
        <View style={[styles.foodDrawer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.foodInstruction, { color: colors.textLight }]}>Drag food to feed!</Text>
          <View style={styles.foodList}>
            {FOODS.map((food, idx) => (
              <FoodItem key={idx} food={food} onFeed={feedPet} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  lampButton: {
    padding: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  statBox: {
    alignItems: 'center',
    width: '30%',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 5,
  },
  barBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  petArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodDrawer: {
    paddingBottom: 40,
    paddingTop: 15,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  foodInstruction: {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  foodList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  foodItem: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
  },
  foodEmoji: {
    fontSize: 32,
  },
});
