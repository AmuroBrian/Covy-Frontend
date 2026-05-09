const fs = require('fs');
const path = require('path');

const mapPath = path.resolve('/Volumes/inspire/softwaredev/covy-project/covy-frontend/app/(main)/tabs/map.tsx');
let content = fs.readFileSync(mapPath, 'utf8');

// If already patched incorrectly, we don't need to do it again, but since it failed midway, let's just make it robust.

if (!content.includes('Alert } from')) {
  content = content.replace(
    \`import { KeyboardAvoidingView, Platform, ScrollView, Image as RNImage, Animated } from 'react-native';\`,
    \`import { KeyboardAvoidingView, Platform, ScrollView, Image as RNImage, Animated, Alert } from 'react-native';\`
  );
}

if (!content.includes('editPlaceId')) {
  content = content.replace(
    \`const [placeLabel, setPlaceLabel] = useState('');\`,
    \`const [placeLabel, setPlaceLabel] = useState('');\n  const [editPlaceId, setEditPlaceId] = useState<string | null>(null);\`
  );
}

const handlersCode = \`
  const handleDeletePlace = (placeId: string) => {
    Alert.alert(
      "Delete Location",
      "Are you sure you want to permanently remove this location?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await apiClient.delete(\\\`/saved-places/\\\${placeId}\\\`);
            closeSheet();
            fetchSavedPlaces();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to delete location.');
          }
        }}
      ]
    );
  };

  const handleEditPlaceClick = (place: any) => {
    setEditPlaceId(place.id);
    setSelectedIcon(place.icon || 'home');
    setPlaceLabel(place.label);
    closeSheet();
    setModalVisible(true);
  };
\`;

if (!content.includes('handleDeletePlace')) {
  content = content.replace(
    \`const fetchSavedPlaces = async () => {\`,
    \`\${handlersCode}\\n  const fetchSavedPlaces = async () => {\`
  );
}

// Modify handleSavePlace
if (content.includes("await apiClient.post('/saved-places'")) {
  content = content.replace(
    /const handleSavePlace = async \(\) => \{[\s\S]*?try \{[\s\S]*?await apiClient\.post\('\/saved-places', \{[\s\S]*?label: placeLabel\.trim\(\) \|\| 'Custom Place',[\s\S]*?lat: region\.latitude,[\s\S]*?lng: region\.longitude,[\s\S]*?radius: 100,[\s\S]*?icon: selectedIcon,[\s\S]*?\}\);[\s\S]*?setModalVisible\(false\);[\s\S]*?setPlaceLabel\(''\);[\s\S]*?Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Success\);[\s\S]*?fetchSavedPlaces\(\); \/\/ refresh the map pins[\s\S]*?setTimeout\(\(\) => \{[\s\S]*?Alert\.alert\('Success', 'Location saved successfully!'\);[\s\S]*?\}, 500\);[\s\S]*?\} catch \(error: any\) \{/,
    \`const handleSavePlace = async () => {
    try {
      if (editPlaceId) {
        await apiClient.patch(\\\`/saved-places/\\\${editPlaceId}\\\`, {
          label: placeLabel.trim() || 'Custom Place',
          icon: selectedIcon,
        });
      } else {
        await apiClient.post('/saved-places', {
          label: placeLabel.trim() || 'Custom Place',
          lat: region.latitude,
          lng: region.longitude,
          radius: 100,
          icon: selectedIcon,
        });
      }
      
      setModalVisible(false);
      setPlaceLabel('');
      setEditPlaceId(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchSavedPlaces();
      
      setTimeout(() => {
        Alert.alert('Success', editPlaceId ? 'Location updated successfully!' : 'Location saved successfully!');
      }, 500);
    } catch (error: any) {\`
  );
}

// Fix Modal Cancel button to clear editPlaceId
content = content.replace(
  \`<TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>\`,
  \`<TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => { setModalVisible(false); setEditPlaceId(null); setPlaceLabel(''); }}>\`
);

content = content.replace(
  \`<Text style={styles.modalTitle}>Save Location</Text>\`,
  \`<Text style={styles.modalTitle}>{editPlaceId ? 'Edit Location' : 'Save Location'}</Text>\`
);

content = content.replace(
  \`<Text style={styles.saveButtonText}>Save</Text>\`,
  \`<Text style={styles.saveButtonText}>{editPlaceId ? 'Update' : 'Save'}</Text>\`
);

const actionRowCode = \`
            <View style={styles.sheetActionRow}>
              <TouchableOpacity style={[styles.sheetButtonSmall, { backgroundColor: Colors.textLight }]} onPress={() => handleEditPlaceClick(sheetData.data)}>
                <Ionicons name="pencil" size={18} color={Colors.white} />
                <Text style={styles.sheetButtonTextSmall}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetButtonSmall, { backgroundColor: Colors.secondary }]} onPress={() => handleDeletePlace(sheetData.data.id)}>
                <Ionicons name="trash" size={18} color={Colors.white} />
                <Text style={styles.sheetButtonTextSmall}>Delete</Text>
              </TouchableOpacity>
            </View>
\`;

if (!content.includes('sheetActionRow')) {
  content = content.replace(
    \`<View style={styles.sheetInfoRowLeft}>
              <Ionicons name="battery-full" size={16} color={Colors.textLight} />
              <Text style={styles.sheetSmallText}>Battery at Visit: 100%</Text>
            </View>\`,
    \`<View style={styles.sheetInfoRowLeft}>
              <Ionicons name="battery-full" size={16} color={Colors.textLight} />
              <Text style={styles.sheetSmallText}>Battery at Visit: 100%</Text>
            </View>
\${actionRowCode}\`
  );

  const newStyles = \`
  sheetActionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 15,
    marginTop: 15,
  },
  sheetButtonSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  sheetButtonTextSmall: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
\`;

  content = content.replace(
    \`  savedByText: {\`,
    \`\${newStyles}\\n  savedByText: {\`
  );
}

fs.writeFileSync(mapPath, content);
console.log("Successfully patched map.tsx for management flows with placeLabel");
