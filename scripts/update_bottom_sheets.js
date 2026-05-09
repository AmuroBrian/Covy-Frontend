const fs = require('fs');
const path = require('path');

const mapPath = path.resolve('/Volumes/inspire/softwaredev/covy-project/covy-frontend/app/(main)/tabs/map.tsx');
let content = fs.readFileSync(mapPath, 'utf8');

// 1. Imports
content = content.replace(
  `import * as Location from 'expo-location';`,
  `import * as Location from 'expo-location';\nimport * as Battery from 'expo-battery';`
);
content = content.replace(
  `import { useNavigation } from 'expo-router';`,
  `import { useNavigation, useRouter } from 'expo-router';`
);

// 2. Types & States
content = content.replace(
  `const [partnerLocation, setPartnerLocation] = useState<{lat: number, lng: number} | null>(null);`,
  `const [partnerLocation, setPartnerLocation] = useState<{lat: number, lng: number, battery: number} | null>(null);
  interface SheetData { type: 'partner' | 'place'; data: any; address?: string; }
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const sheetAnim = useRef(new Animated.Value(400)).current;
  const router = useRouter();

  const openSheet = (data: SheetData) => {
    setSheetData(data);
    Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
  };
  const closeSheet = () => {
    Animated.timing(sheetAnim, { toValue: 400, duration: 250, useNativeDriver: true }).start(() => setSheetData(null));
  };`
);

// 3. Update Partner Location Handlers
content = content.replace(
  `setPartnerLocation({ lat: data.lat, lng: data.lng });`,
  `setPartnerLocation({ lat: data.lat, lng: data.lng, battery: data.battery || 100 });`
);
content = content.replace(
  `setPartnerLocation({ lat: res.data.latitude, lng: res.data.longitude });`,
  `setPartnerLocation({ lat: res.data.latitude, lng: res.data.longitude, battery: res.data.battery || 100 });`
);

// 4. Update Battery Reading in Watch Position
content = content.replace(
  /setMyLocation\(\{ lat: loc\.coords\.latitude, lng: loc\.coords\.longitude \}\);\s*if \(socketRef\.current\) \{\s*socketRef\.current\.emit\('ping_location', \{ lat: loc\.coords\.latitude, lng: loc\.coords\.longitude, battery: 100 \}\);\s*\}/,
  `const bat = await Battery.getBatteryLevelAsync();
          const batPercent = bat >= 0 ? Math.round(bat * 100) : 100;
          setMyLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          if (socketRef.current) {
            socketRef.current.emit('ping_location', { lat: loc.coords.latitude, lng: loc.coords.longitude, battery: batPercent });
          }`
);

// 5. Update MapView onPress
content = content.replace(
  `<MapView
        ref={mapRef}`,
  `<MapView
        onPress={closeSheet}
        ref={mapRef}`
);

// 6. Update Saved Places Marker
content = content.replace(
  `{savedPlaces.map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={place.label}
          >`,
  `{savedPlaces.map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            onPress={async (e) => {
              e.stopPropagation();
              openSheet({ type: 'place', data: place, address: 'Loading address...' });
              try {
                const geo = await Location.reverseGeocodeAsync({ latitude: place.latitude, longitude: place.longitude });
                if (geo && geo.length > 0) {
                  const addr = geo[0];
                  const addressStr = \`\${addr.streetNumber || ''} \${addr.street || ''}, \${addr.city || ''}\`.trim();
                  setSheetData(prev => prev?.data.id === place.id ? { ...prev, address: addressStr || 'Address not found' } : prev);
                }
              } catch(err) {}
            }}
          >`
);

// 7. Update Partner Marker
content = content.replace(
  `{partnerLocation && (
          <Marker coordinate={{ latitude: partnerLocation.lat, longitude: partnerLocation.lng }}>`,
  `{partnerLocation && (
          <Marker 
            coordinate={{ latitude: partnerLocation.lat, longitude: partnerLocation.lng }}
            onPress={(e) => {
              e.stopPropagation();
              const partnerProfile = profile?.couple?.users?.find((u: any) => u.id !== profile.id);
              openSheet({ type: 'partner', data: { ...partnerProfile, battery: partnerLocation.battery || 100 } });
            }}
          >`
);

// 8. Add Bottom Sheet UI before the Save Modal
const bottomSheetCode = `
      {/* Interactive Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetAnim }] }]}>
        {sheetData?.type === 'partner' && (
          <View style={styles.sheetContent}>
            <ExpoImage source={{ uri: sheetData.data.avatarUrl }} style={styles.sheetAvatar} />
            <Text style={styles.sheetTitle}>{sheetData.data.displayName || 'Partner'}</Text>
            <View style={styles.sheetInfoRowCenter}>
              <Ionicons name="battery-half" size={20} color={sheetData.data.battery > 20 ? Colors.primary : Colors.secondary} />
              <Text style={styles.sheetText}>{sheetData.data.battery}% Battery</Text>
            </View>
            <TouchableOpacity style={styles.sheetButton} onPress={() => { closeSheet(); router.push('/(main)/tabs/chat'); }}>
              <Ionicons name="chatbubbles" size={20} color={Colors.white} />
              <Text style={styles.sheetButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        )}

        {sheetData?.type === 'place' && (
          <View style={styles.sheetContentLeft}>
            <View style={styles.placeIconCircleLarge}>
               <Ionicons name={sheetData.data.icon as any || 'bookmark'} size={32} color={Colors.white} />
            </View>
            <Text style={styles.sheetTitleLeft}>{sheetData.data.label}</Text>
            <Text style={styles.sheetSubtitleLeft}>{sheetData.address}</Text>
            <View style={styles.sheetInfoRowLeft}>
              <Ionicons name="time" size={16} color={Colors.textLight} />
              <Text style={styles.sheetSmallText}>Last Visited: Just now</Text>
            </View>
            <View style={styles.sheetInfoRowLeft}>
              <Ionicons name="battery-full" size={16} color={Colors.textLight} />
              <Text style={styles.sheetSmallText}>Battery at Visit: 100%</Text>
            </View>
          </View>
        )}
      </Animated.View>
`;

content = content.replace(
  `{/* Save Place Modal */}`,
  `${bottomSheetCode}\n      {/* Save Place Modal */}`
);

// 9. Add Styles
const sheetStyles = `
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 999,
  },
  sheetContent: {
    alignItems: 'center',
  },
  sheetAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 10,
  },
  sheetInfoRowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  sheetText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  sheetButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  sheetButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  sheetContentLeft: {
    alignItems: 'flex-start',
  },
  placeIconCircleLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  sheetTitleLeft: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 5,
  },
  sheetSubtitleLeft: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 20,
  },
  sheetInfoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  sheetSmallText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
`;

content = content.replace(
  `const extraStyles = StyleSheet.create({`,
  `const extraStyles = StyleSheet.create({\n${sheetStyles}`
);

fs.writeFileSync(mapPath, content);
console.log("Successfully updated map.tsx with bottom sheets and battery telemetry");
