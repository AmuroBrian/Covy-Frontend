import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { useRealtime } from '../../context/RealtimeContext';
import * as Haptics from 'expo-haptics';

const { height } = Dimensions.get('window');

interface EmojiItem {
  id: string;
  emoji: string;
}

const FloatingEmoji = ({ item, onComplete }: { item: EmojiItem; onComplete: (id: string) => void }) => {
  const translateY = useRef(new Animated.Value(height)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const startX = Math.random() * 200 - 100;
  const translateX = useRef(new Animated.Value(startX)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Increase duration so it floats up smoothly across the whole screen
    const duration = Math.random() * 2000 + 3500;
    
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100, // Floats completely past the top of the screen
        duration: duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: duration,
        easing: Easing.in(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1 + Math.random() * 0.5,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: startX + (Math.random() * 100 - 50),
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: startX - (Math.random() * 100 - 50),
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        })
      ])
    ]).start(() => {
      onComplete(item.id);
    });
  }, []);

  return (
    <Animated.Text style={[
      styles.emoji,
      {
        transform: [
          { translateY },
          { translateX },
          { scale }
        ],
        opacity
      }
    ]}>
      {item.emoji}
    </Animated.Text>
  );
};

export default function FloatingEmojis() {
  const { lastNudge } = useRealtime();
  const [emojis, setEmojis] = useState<EmojiItem[]>([]);

  useEffect(() => {
    if (lastNudge) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const newEmojis = Array.from({ length: 6 }).map((_, i) => ({
        id: `${Date.now()}-${i}-${Math.random()}`,
        emoji: lastNudge.emoji,
      }));
      
      setEmojis(prev => [...prev, ...newEmojis]);
    }
  }, [lastNudge]);

  const removeEmoji = (id: string) => {
    setEmojis(prev => prev.filter(e => e.id !== id));
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {emojis.map(item => (
        <FloatingEmoji key={item.id} item={item} onComplete={removeEmoji} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  emoji: {
    fontSize: 40,
    position: 'absolute',
    top: 0,
  }
});
