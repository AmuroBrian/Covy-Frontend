import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Colors } from '../../../src/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MapScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const openSidebar = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      />

      {/* Floating Search Bar */}
      <View style={[styles.searchContainer, { top: insets.top + 10 }]}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search location..."
          placeholderTextColor={Colors.textLight}
        />
      </View>

      {/* Upper Left Rounded Component (Status / Battery) */}
      <View style={[styles.topLeftComponent, { top: insets.top + 70 }]}>
        <Text style={styles.statusText}>🔋 100%</Text>
      </View>

      {/* Upper Right Profile Component (Opens Sidebar) */}
      <TouchableOpacity 
        style={[styles.topRightComponent, { top: insets.top + 70 }]} 
        onPress={openSidebar}
      >
        <Text style={styles.profileText}>P</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  searchContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: Colors.white,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  searchInput: {
    fontSize: 16,
    color: Colors.text,
  },
  topLeftComponent: {
    position: 'absolute',
    left: 20,
    backgroundColor: Colors.white,
    padding: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  topRightComponent: {
    position: 'absolute',
    right: 20,
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  profileText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 18,
  },
});
