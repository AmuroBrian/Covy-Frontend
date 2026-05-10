import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Animated, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useRealtime } from '../../context/RealtimeContext';

const EMOJIS = ['❤️', '😂', '😍', '🔥', '🥺'];

interface NudgeButtonProps {
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  isFloating?: boolean;
}

export default function NudgeButton({ style, iconSize = 28, isFloating = false }: NudgeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { sendNudge } = useRealtime();
  const { colors } = useTheme();
  
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  
  const heightAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  const toggleOpen = () => {
    const toValue = isOpen ? 0 : 1;
    setIsOpen(!isOpen);
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue,
        duration: 250,
        useNativeDriver: false, 
      }),
      Animated.timing(opacityAnim, {
        toValue,
        duration: 200,
        useNativeDriver: false,
      })
    ]).start();
  };

  const handleSend = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    sendNudge(emoji);
    toggleOpen();
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={[styles.mainBtn, isFloating && styles.floatingBtn]} 
        onPress={() => {
          if (!isOpen) {
             Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
             toggleOpen();
          } else {
             toggleOpen();
          }
        }}
      >
        <Ionicons name="heart" size={iconSize} color={isFloating ? colors.white : '#FF3B30'} />
      </TouchableOpacity>

      <Animated.View style={[
        styles.menuContainer, 
        isFloating ? styles.menuUp : styles.menuDown,
        { 
          opacity: opacityAnim,
          height: heightAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 260]
          })
        }
      ]}>
        {EMOJIS.map(e => (
          <TouchableOpacity key={e} style={styles.emojiBtn} onPress={() => handleSend(e)}>
            <Text style={styles.emojiText}>{e}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  menuContainer: {
    flexDirection: 'column',
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: 25,
    width: 46,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
    overflow: 'hidden', 
  },
  menuUp: {
    bottom: 55, // Above the floating button
  },
  menuDown: {
    top: 45, // Below the chat header button
    right: -5,
  },
  emojiBtn: {
    paddingVertical: 6,
  },
  emojiText: {
    fontSize: 28,
  },
  mainBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  floatingBtn: {
    backgroundColor: '#FF3B30',
    width: 50,
    height: 50,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  }
});
