import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Canvas, Path, Group, Circle, Oval, Paint, LinearGradient, vec, mix } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withRepeat, withTiming, withSpring, Easing } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CANVAS_SIZE = width * 0.8;
const CENTER = CANVAS_SIZE / 2;
const RADIUS = CANVAS_SIZE * 0.35;

interface SkiaPetProps {
  state: 'IDLE' | 'HUNGRY' | 'EATING' | 'SLEEPING' | 'HAPPY' | 'SAD' | 'SLEEPY';
  onPress: () => void;
}

export default function SkiaPet({ state, onPress }: SkiaPetProps) {
  // Breathing animation
  const breathing = useSharedValue(0);

  // State transitions
  const isEating = state === 'EATING';
  const isSleeping = state === 'SLEEPING';
  const isHappy = state === 'HAPPY';
  const isSad = state === 'SAD' || state === 'HUNGRY';

  useEffect(() => {
    breathing.value = withRepeat(
      withTiming(1, { duration: isSleeping ? 2000 : 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [isSleeping]);

  // Jiggle animation on press/eat
  const jiggle = useSharedValue(0);
  useEffect(() => {
    if (isEating || isHappy) {
      jiggle.value = withRepeat(withTiming(1, { duration: 150 }), 6, true);
    } else {
      jiggle.value = withSpring(0);
    }
  }, [state]);

  const petPath = useDerivedValue(() => {
    const breathOffset = mix(breathing.value, -3, 3);
    const jiggleOffset = mix(jiggle.value, -5, 5);
    
    // We create a perfectly smooth, undulating blob (Pou-style)
    const points = 100; // Increased points for absolute smoothness
    let pathStr = '';
    
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      
      let r = RADIUS;
      
      // Smooth pear shape (Pou style): wider at the bottom, narrower at top
      // Math.sin(angle) is 1 at the bottom (y goes down in canvas), -1 at the top
      r += Math.sin(angle) * 15; 
      
      // Flatten the bottom smoothly
      if (Math.sin(angle) > 0) {
        r -= Math.pow(Math.sin(angle), 4) * 15;
      }
      
      // Add very soft undulating "blub" (spikes)
      const spike = Math.sin(angle * 5) * 3;
      r += spike;
      
      // Add breathing (mostly vertical)
      const breath = Math.sin(angle) * breathOffset;
      r += breath;
      
      // Add jiggle
      const jig = Math.cos(angle * 4) * jiggleOffset;
      r += jig;

      const x = CENTER + Math.cos(angle) * r;
      const y = CENTER + Math.sin(angle) * r + 20; // Shift down slightly

      if (i === 0) {
        pathStr += `M ${x} ${y}`;
      } else {
        pathStr += ` L ${x} ${y}`;
      }
    }
    
    return pathStr + ' Z';
  });

  const bodyColor = isSleeping ? ['#4b6cb7', '#182848'] : 
                    isSad ? ['#8CA6DB', '#B9935A'] : 
                    isHappy ? ['#FF9A9E', '#FECFEF'] : 
                    ['#ffb347', '#ffcc33']; // Default Pou orange/yellow

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View style={styles.container}>
        <Canvas style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
          <Group>
            {/* Body */}
            <Path path={petPath}>
              <LinearGradient
                start={vec(CENTER, 0)}
                end={vec(CENTER, CANVAS_SIZE)}
                colors={bodyColor}
              />
            </Path>

            {/* Eyes */}
            {!isSleeping ? (
              <Group>
                {/* Left Eye */}
                <Oval x={CENTER - 40} y={CENTER - 20 + (isSad ? 5 : 0)} width={16} height={24} color="#333" />
                <Oval x={CENTER - 36} y={CENTER - 16 + (isSad ? 5 : 0)} width={6} height={8} color="#FFF" />
                
                {/* Right Eye */}
                <Oval x={CENTER + 24} y={CENTER - 20 + (isSad ? 5 : 0)} width={16} height={24} color="#333" />
                <Oval x={CENTER + 28} y={CENTER - 16 + (isSad ? 5 : 0)} width={6} height={8} color="#FFF" />
              </Group>
            ) : (
              <Group>
                {/* Sleeping Eyes (Closed Arcs) */}
                <Path path={`M ${CENTER - 45} ${CENTER - 10} Q ${CENTER - 35} ${CENTER + 5} ${CENTER - 25} ${CENTER - 10}`} style="stroke" strokeWidth={4} color="#333" />
                <Path path={`M ${CENTER + 25} ${CENTER - 10} Q ${CENTER + 35} ${CENTER + 5} ${CENTER + 45} ${CENTER - 10}`} style="stroke" strokeWidth={4} color="#333" />
              </Group>
            )}

            {/* Blush */}
            {isHappy && (
              <Group>
                <Oval x={CENTER - 60} y={CENTER + 10} width={24} height={12} color="rgba(255, 100, 100, 0.5)" />
                <Oval x={CENTER + 36} y={CENTER + 10} width={24} height={12} color="rgba(255, 100, 100, 0.5)" />
              </Group>
            )}

            {/* Mouth */}
            {isEating ? (
              <Oval x={CENTER - 15} y={CENTER + 15} width={30} height={30} color="#333" />
            ) : isSad ? (
              <Path path={`M ${CENTER - 15} ${CENTER + 30} Q ${CENTER} ${CENTER + 15} ${CENTER + 15} ${CENTER + 30}`} style="stroke" strokeWidth={4} color="#333" />
            ) : isSleeping ? (
              <Oval x={CENTER - 8} y={CENTER + 20} width={16} height={16} color="#333" />
            ) : (
              // Happy / Idle Smile
              <Path path={`M ${CENTER - 15} ${CENTER + 15} Q ${CENTER} ${CENTER + 35} ${CENTER + 15} ${CENTER + 15}`} style="stroke" strokeWidth={4} color="#333" />
            )}

          </Group>
        </Canvas>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
