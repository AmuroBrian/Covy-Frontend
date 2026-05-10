import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Platform, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 65;
const CURVE_WIDTH = 100;
const CURVE_HEIGHT = 45;

export const CurvedTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const heightWithInsets = TAB_BAR_HEIGHT + insets.bottom;
  
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // Math to perfectly hug the floating button
  const buttonRadius = 28;
  const gap = 6;
  const R = buttonRadius + gap; // 34
  const H = 36; // depth
  const W = 86; // width

  const center = width / 2;
  const left = center - W / 2;
  const right = center + W / 2;

  // Mathematically precise bezier notch
  const path = `
    M 0 0
    L ${left} 0
    C ${left + 15} 0, ${left + 20} ${H}, ${center} ${H}
    C ${right - 20} ${H}, ${right - 15} 0, ${right} 0
    L ${width} 0
    L ${width} ${heightWithInsets}
    L 0 ${heightWithInsets}
    Z
  `;

  return (
    <View style={styles.container}>
      <View style={[styles.svgContainer, { height: heightWithInsets }]}>
        <Svg width={width} height={heightWithInsets} viewBox={`0 0 ${width} ${heightWithInsets}`}>
          <Path d={path} fill={colors.surface} />
        </Svg>
      </View>

      <View style={[styles.tabContent, { height: heightWithInsets, paddingBottom: insets.bottom }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          
          // Map is the center floating button
          const isCenter = route.name === 'map';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Determine icon name based on route
          let iconName: any = 'help';
          if (route.name === 'chat') iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline';
          if (route.name === 'map') iconName = isFocused ? 'map' : 'map-outline';
          if (route.name === 'shared') iconName = isFocused ? 'folder-open' : 'folder-outline';

          if (isCenter) {
            return (
              <View key={route.key} style={styles.centerButtonWrapper}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarButtonTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={styles.centerButton}
                  activeOpacity={0.8}
                >
                  <Ionicons name={iconName} size={30} color={colors.white} />
                </TouchableOpacity>
                <Text style={[styles.centerTabLabel, { color: isFocused ? colors.primary : colors.textLight }]}>
                  {options.title}
                </Text>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={iconName} 
                size={24} 
                color={isFocused ? colors.primary : colors.textLight} 
                style={styles.tabIcon}
              />
              <Text style={[styles.tabLabel, { color: isFocused ? colors.primary : colors.textLight }]}>
                {options.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    zIndex: 998,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    backgroundColor: 'transparent',
  },
  svgContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'transparent',
  },
  tabContent: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingTop: 8,
  },
  tabIcon: {
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  centerButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0, 
  },
  centerTabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 38, // Pushes label down below the floating CTA
  },
  centerButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    top: -28, // Center exactly on the tab bar top edge
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 10,
    // Removed white border so the map shows through the gap!
  },
});
