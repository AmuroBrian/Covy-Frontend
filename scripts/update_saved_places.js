const fs = require('fs');
const path = require('path');

const mapPath = path.resolve('/Volumes/inspire/softwaredev/covy-project/covy-frontend/app/(main)/tabs/map.tsx');
let content = fs.readFileSync(mapPath, 'utf8');

// 1. Add state
content = content.replace(
  `const [partnerLocation, setPartnerLocation] = useState<{lat: number, lng: number} | null>(null);`,
  `const [partnerLocation, setPartnerLocation] = useState<{lat: number, lng: number} | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);`
);

// 2. Add fetch function
const fetchCode = `
  const fetchSavedPlaces = async () => {
    try {
      const res = await apiClient.get('/saved-places');
      if (res.data) {
        setSavedPlaces(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch saved places', err);
    }
  };

  useEffect(() => {
    fetchSavedPlaces();
  }, []);
`;

content = content.replace(
  `  // Poll profile every 30 seconds`,
  `${fetchCode}\n  // Poll profile every 30 seconds`
);

// 3. Update handleSavePlace to refresh list
content = content.replace(
  `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {`,
  `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchSavedPlaces(); // refresh the map pins
      setTimeout(() => {`
);

// 4. Render the markers inside MapView
const markersCode = `
        {/* Saved Places Markers */}
        {savedPlaces.map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={place.label}
          >
            <View style={styles.savedPlaceMarker}>
              <Ionicons name={(place.icon as any) || 'bookmark'} size={20} color={Colors.white} />
            </View>
          </Marker>
        ))}

        {/* User Marker (Stays at GPS location) */}`;

content = content.replace(
  `{/* User Marker (Stays at GPS location) */}`,
  markersCode
);

// 5. Add styles
const styleCode = `  savedPlaceMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },`;

content = content.replace(
  `  targetMarker: {`,
  `${styleCode}\n  targetMarker: {`
);

fs.writeFileSync(mapPath, content);
console.log("Successfully updated map.tsx with saved places rendering");
