const fs = require('fs');
const path = require('path');

const mapPath = path.resolve('/Volumes/inspire/softwaredev/covy-project/covy-frontend/app/(main)/tabs/map.tsx');
let content = fs.readFileSync(mapPath, 'utf8');

// 1. Imports
content = content.replace(
  `import { Ionicons } from '@expo/vector-icons';`,
  `import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAvoidingView, Platform, ScrollView, Image as RNImage } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../../src/context/AuthContext';`
);

// 2. Component inside
content = content.replace(
  `  const mapRef = useRef<MapView>(null);`,
  `  const mapRef = useRef<MapView>(null);
  const { session, profile } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string>('home');
  const availableIcons = ['home', 'briefcase', 'school', 'heart', 'star'];`
);

// 3. Effects for socket and location watching
const socketCode = `
  useEffect(() => {
    if (!session?.access_token) return;
    
    const wsUrl = process.env.EXPO_PUBLIC_WS_URL || 'http://192.168.1.100:3000';
    const newSocket = io(wsUrl, {
      auth: { token: session.access_token },
      transports: ['websocket'],
    });

    newSocket.on('partner_location_update', (data) => {
      setPartnerLocation({ lat: data.lat, lng: data.lng });
    });

    socketRef.current = newSocket;
    return () => { newSocket.disconnect(); };
  }, [session]);

  useEffect(() => {
    const fetchLatestPartnerLoc = async () => {
      try {
        const res = await apiClient.get('/locations/latest');
        if (res.data && res.data.latitude) {
          setPartnerLocation({ lat: res.data.latitude, lng: res.data.longitude });
        }
      } catch (err) {}
    };
    fetchLatestPartnerLoc();
  }, []);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
        (loc) => {
          if (socketRef.current) {
            socketRef.current.emit('ping_location', { lat: loc.coords.latitude, lng: loc.coords.longitude, battery: 100 });
          }
        }
      );
    })();
    return () => { if (locationSubscription) locationSubscription.remove(); };
  }, []);
`;

content = content.replace(
  `  const openSidebar = () => {`,
  `${socketCode}\n  const openSidebar = () => {`
);

// 4. Update handleSavePlace
content = content.replace(
  /const handleSavePlace = async \(\) => \{[\s\S]*?finally \{\s*setIsSaving\(false\);\s*\}\s*\};/,
  `const handleSavePlace = async () => {
    if (!placeLabel.trim()) {
      Alert.alert('Error', 'Please enter a label for this place.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
    try {
      await apiClient.post('/saved-places', {
        label: placeLabel,
        lat: region.latitude,
        lng: region.longitude,
        radius: 50,
        icon: selectedIcon,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        setModalVisible(false);
        setPlaceLabel('');
        setIsSaving(false);
      }, 500);
    } catch (error) {
      Alert.alert('Error', 'Failed to save location.');
      setIsSaving(false);
    }
  };`
);

// 5. Update MapView Markers
const markersCode = `
        {/* User Marker */}
        <MapView.Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }}>
          <View style={styles.markerContainer}>
            {profile?.avatarUrl ? (
              <ExpoImage source={{ uri: profile.avatarUrl }} style={styles.markerAvatar} />
            ) : (
              <View style={styles.markerFallback}><Ionicons name="person" size={20} color="white" /></View>
            )}
          </View>
        </MapView.Marker>

        {/* Partner Marker */}
        {partnerLocation && (
          <MapView.Marker coordinate={{ latitude: partnerLocation.lat, longitude: partnerLocation.lng }}>
            <View style={[styles.markerContainer, styles.partnerMarkerContainer]}>
              {profile?.couple?.users?.find((u: any) => u.id !== profile.id)?.avatarUrl ? (
                <ExpoImage source={{ uri: profile.couple.users.find((u: any) => u.id !== profile.id).avatarUrl }} style={styles.markerAvatar} />
              ) : (
                <View style={styles.markerFallback}><Ionicons name="heart" size={20} color="white" /></View>
              )}
            </View>
          </MapView.Marker>
        )}
`;

content = content.replace(
  `        onRegionChangeComplete={(r) => setRegion(r)}\n      />`,
  `        onRegionChangeComplete={(r) => setRegion(r)}
      >
${markersCode}
      </MapView>`
);

// 6. Update Save Modal
const iconSelectorCode = `
            <Text style={styles.iconLabel}>Select Icon</Text>
            <View style={styles.iconRow}>
              {availableIcons.map((ic) => (
                <TouchableOpacity 
                  key={ic} 
                  style={[styles.iconButton, selectedIcon === ic && styles.iconButtonSelected]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedIcon(ic);
                  }}
                >
                  <Ionicons name={ic as any} size={24} color={selectedIcon === ic ? Colors.primary : Colors.textLight} />
                </TouchableOpacity>
              ))}
            </View>
`;

content = content.replace(
  `            <TextInput`,
  `${iconSelectorCode}\n            <TextInput`
);

content = content.replace(
  `<View style={styles.modalContent}>`,
  `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>`
);
content = content.replace(
  `</View>\n        </View>\n      </Modal>`,
  `</KeyboardAvoidingView>\n        </View>\n      </Modal>`
);

content = content.replace(
  `<Ionicons name="bookmark" size={24} color={Colors.white} />`,
  `<Ionicons name={isSaving ? "checkmark" : "bookmark"} size={24} color={Colors.white} />`
);


// 7. Add Styles
content += `\n
const extraStyles = StyleSheet.create({
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  partnerMarkerContainer: {
    borderColor: Colors.secondary || '#FF2D55',
  },
  markerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  markerFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 10,
    marginTop: -5,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonSelected: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
});
`;

content = content.replace('const styles = StyleSheet.create({', 'const styles = StyleSheet.create({\n  ...extraStyles,');

fs.writeFileSync(mapPath, content);
console.log("Successfully updated map.tsx");
