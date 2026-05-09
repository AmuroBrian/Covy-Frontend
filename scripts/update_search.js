const fs = require('fs');
const path = require('path');

const mapPath = path.resolve('/Volumes/inspire/softwaredev/covy-project/covy-frontend/app/(main)/tabs/map.tsx');
let content = fs.readFileSync(mapPath, 'utf8');

// 1. Add Animated to imports
content = content.replace(
  `import { KeyboardAvoidingView, Platform, ScrollView, Image as RNImage } from 'react-native';`,
  `import { KeyboardAvoidingView, Platform, ScrollView, Image as RNImage, Animated } from 'react-native';`
);

// 2. Add animation states
content = content.replace(
  `  const [selectedIcon, setSelectedIcon] = useState<string>('home');`,
  `  const [selectedIcon, setSelectedIcon] = useState<string>('home');
  const [isTargetVisible, setIsTargetVisible] = useState(false);
  const targetOpacity = useRef(new Animated.Value(0)).current;
  const targetScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (isTargetVisible) {
      Animated.parallel([
        Animated.timing(targetOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(targetScale, { toValue: 1, friction: 5, useNativeDriver: true })
      ]).start();
    } else {
      Animated.timing(targetOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [isTargetVisible]);`
);

// 3. Update search behavior
content = content.replace(
  /const newRegion = \{\s*latitude: details\.geometry\.location\.lat,\s*longitude: details\.geometry\.location\.lng,\s*latitudeDelta: 0\.01,\s*longitudeDelta: 0\.01,\s*\};/g,
  `const newRegion = {
              latitude: details.geometry.location.lat,
              longitude: details.geometry.location.lng,
              latitudeDelta: 0.002, // increased precision
              longitudeDelta: 0.002,
            };`
);

content = content.replace(
  `setRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 1000);`,
  `setRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 1000);
            setTimeout(() => {
              setIsTargetVisible(true);
            }, 1000);`
);

// 4. Update Target Marker View
content = content.replace(
  `<View style={styles.targetMarker}>
            <Ionicons name="location" size={40} color={Colors.primary} />
          </View>`,
  `<Animated.View style={[styles.targetMarker, { opacity: targetOpacity, transform: [{ scale: targetScale }] }]} pointerEvents="none">
            <Ionicons name="location" size={40} color={Colors.primary} />
          </Animated.View>`
);

// 5. Hide target marker when user returns to My Location
content = content.replace(
  `mapRef.current?.animateToRegion(currentRegion, 1000);
  };`,
  `setIsTargetVisible(false);
    mapRef.current?.animateToRegion(currentRegion, 1000);
  };`
);

fs.writeFileSync(mapPath, content);
console.log("Successfully updated map.tsx with animations and precision");
