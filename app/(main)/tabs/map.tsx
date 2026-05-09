import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAvoidingView, Platform, ScrollView, Image as RNImage, Animated } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../../src/context/AuthContext';
import MapView, { PROVIDER_GOOGLE, Region, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import apiClient from '../../../src/api/axios';
import { useNavigation, useRouter } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Colors } from '../../../src/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRealtime } from '../../../src/context/RealtimeContext';

export default function MapScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { session, profile, checkPartnerStatus } = useAuth();
  const { pingLocation, partnerLocation: contextPartnerLocation } = useRealtime();
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);
  const [myBattery, setMyBattery] = useState<number>(100);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [partnerLocation, setPartnerLocation] = useState<{lat: number, lng: number, battery: number, isCharging?: boolean} | null>(null);
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
  };
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<string>('home');
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
  }, [isTargetVisible]);
  const availableIcons = ['home', 'briefcase', 'school', 'heart', 'star'];

  const [region, setRegion] = useState<Region>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [placeLabel, setPlaceLabel] = useState('');
  const [editPlaceId, setEditPlaceId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchedAddress, setSearchedAddress] = useState<string>('');

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to use the map.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const currentRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMyLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
      setRegion(currentRegion);
      mapRef.current?.animateToRegion(currentRegion, 1000);
    })();
  }, []);


  useEffect(() => {
    if (contextPartnerLocation) {
      setPartnerLocation({
        lat: contextPartnerLocation.lat,
        lng: contextPartnerLocation.lng,
        battery: contextPartnerLocation.battery || 100,
        isCharging: contextPartnerLocation.isCharging
      });
    }
  }, [contextPartnerLocation]);
  useEffect(() => {
    const fetchLatestPartnerLoc = async () => {
      try {
        const res = await apiClient.get('/locations/latest');
        if (res.data && res.data.latitude) {
          setPartnerLocation({ lat: res.data.latitude, lng: res.data.longitude, battery: res.data.battery || 100 });
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
        { accuracy: Location.Accuracy.Highest, timeInterval: 2000, distanceInterval: 1 },
        async (loc) => {
          const bat = await Battery.getBatteryLevelAsync();
          const batState = await Battery.getBatteryStateAsync();
          const isDeviceCharging = batState === Battery.BatteryState.CHARGING || batState === Battery.BatteryState.FULL;
          const batPercent = bat >= 0 ? Math.round(bat * 100) : 100;
          
          setMyBattery(batPercent);
          setIsCharging(isDeviceCharging);
          setMyLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          pingLocation(loc.coords.latitude, loc.coords.longitude, batPercent, isDeviceCharging);
        }
      );
    })();
    return () => { if (locationSubscription) locationSubscription.remove(); };
  }, []);


  
  const handleDeletePlace = (placeId: string) => {
    Alert.alert(
      "Delete Location",
      "Are you sure you want to permanently remove this location?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await apiClient.delete(`/saved-places/${placeId}`);
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

  // Poll profile every 30 seconds to catch partner avatar updates or status changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof checkPartnerStatus === 'function') {
        checkPartnerStatus();
      }
      fetchSavedPlaces(); // Pull any new places the partner saved
    }, 30000);
    return () => clearInterval(interval);
  }, [checkPartnerStatus]);

  const openSidebar = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleSavePlace = async () => {
    if (!placeLabel.trim()) {
      Alert.alert('Error', 'Please enter a label for this place.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
    try {
      if (editPlaceId) {
        await apiClient.patch(`/saved-places/${editPlaceId}`, {
          label: placeLabel,
          icon: selectedIcon,
        });
      } else {
        await apiClient.post('/saved-places', {
          label: placeLabel,
          lat: region.latitude,
          lng: region.longitude,
          radius: 50,
          icon: selectedIcon,
          address: searchedAddress || undefined,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchSavedPlaces();
      setTimeout(() => {
        setModalVisible(false);
        setPlaceLabel('');
        setEditPlaceId(null);
        setIsSaving(false);
      }, 500);
    } catch (error: any) {
      setIsSaving(false);
      Alert.alert('Save Failed', error?.response?.data?.message || 'Failed to save location.');
      console.error('Save Place Error:', error);
    }
  };

  const handleGoToMyLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow location access to use this feature.');
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    const currentRegion = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setMyLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
    setRegion(currentRegion);
    setIsTargetVisible(false);
    mapRef.current?.animateToRegion(currentRegion, 1000);
  };

  return (
    <View style={styles.container}>
      <MapView
        onPress={closeSheet}
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onRegionChangeComplete={(r) => setRegion(r)}
      >
        {savedPlaces.map((place) => (
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
                  const addressStr = `${addr.streetNumber || ''} ${addr.street || ''}, ${addr.city || ''}`.trim();
                  setSheetData(prev => prev?.data.id === place.id ? { ...prev, address: addressStr || 'Address not found' } as SheetData : prev);
                }
              } catch(err) {}
            }}
          >
            <View style={styles.savedPlaceMarker}>
              <Ionicons name={(place.icon as any) || 'bookmark'} size={20} color={Colors.white} />
            </View>
          </Marker>
        ))}

        {myLocation && (
          <Marker coordinate={{ latitude: myLocation.lat, longitude: myLocation.lng }}>
            <View style={styles.markerContainer}>
              {profile?.avatarUrl ? (
                <ExpoImage source={{ uri: profile.avatarUrl }} style={styles.markerAvatar} />
              ) : (
                <View style={styles.markerFallback}><Ionicons name="person" size={20} color="white" /></View>
              )}
            </View>
          </Marker>
        )}

        {partnerLocation && (
          <Marker 
            coordinate={{ latitude: partnerLocation.lat, longitude: partnerLocation.lng }}
            onPress={(e) => {
              e.stopPropagation();
              const partnerProfile = profile?.couple?.users?.find((u: any) => u.id !== profile.id);
              openSheet({ type: 'partner', data: { ...partnerProfile, battery: partnerLocation.battery || 100, isCharging: partnerLocation.isCharging } });
            }}
          >
            <View style={[styles.markerContainer, styles.partnerMarkerContainer]}>
              {profile?.couple?.users?.find((u: any) => u.id !== profile.id)?.avatarUrl ? (
                <ExpoImage source={{ uri: profile.couple.users.find((u: any) => u.id !== profile.id).avatarUrl }} style={styles.markerAvatar} />
              ) : (
                <View style={styles.markerFallback}><Ionicons name="heart" size={20} color="white" /></View>
              )}
            </View>
          </Marker>
        )}

      </MapView>

      <View style={styles.fixedCenterTarget} pointerEvents="none">
        <Animated.View style={[styles.targetMarker, { opacity: targetOpacity, transform: [{ scale: targetScale }] }]}>
          <Ionicons name="location" size={50} color={Colors.primary} />
        </Animated.View>
      </View>

      <View style={[styles.topHeaderContainer, { top: insets.top + 10 }]}>
        <View style={styles.batteryContainer}>
          <Ionicons name={isCharging ? "battery-charging" : (myBattery > 20 ? "battery-full" : "battery-dead")} size={20} color={isCharging ? '#4CD964' : (myBattery > 20 ? Colors.primary : Colors.secondary)} />
          <Text style={styles.statusText}>{myBattery}% {isCharging ? '(Charging)' : ''}</Text>
        </View>

        <TouchableOpacity onPress={openSidebar}>
          <Ionicons name="person-circle" size={45} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <GooglePlacesAutocomplete
        placeholder="Search location..."
        fetchDetails={true}
        onPress={(data, details = null) => {
          if (details?.geometry?.location) {
            const newRegion = {
              latitude: details.geometry.location.lat,
              longitude: details.geometry.location.lng,
              latitudeDelta: 0.002,
              longitudeDelta: 0.002,
            };
            setRegion(newRegion);
            setSearchedAddress(data.description || details.formatted_address || '');
            mapRef.current?.animateToRegion(newRegion, 1000);
            setTimeout(() => {
              setIsTargetVisible(true);
            }, 1000);
          }
        }}
        query={{
          key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
          language: 'en',
        }}
        onFail={(error) => {
          console.error('GooglePlacesAutocomplete Error:', error);
          Alert.alert('Search Error', 'Failed to fetch places. Please check your API key or network.');
        }}
        renderLeftButton={() => (
          <Ionicons name="search" size={20} color={Colors.textLight} style={styles.searchIcon} />
        )}
        styles={{
          container: {
            position: 'absolute',
            top: insets.top + 70,
            left: 20,
            right: 20,
            zIndex: 9999,
          },
          textInputContainer: styles.textInputContainer,
          textInput: styles.searchInput,
          listView: styles.searchListView,
          row: styles.searchRow,
        }}
        textInputProps={{
          placeholderTextColor: Colors.textLight,
        }}
        enablePoweredByContainer={false}
        keyboardShouldPersistTaps="always"
      />

      <View style={[styles.fabContainer, { bottom: insets.bottom + 90 }]}>
        <TouchableOpacity 
          style={styles.myLocationFab}
          onPress={handleGoToMyLocation}
        >
          <Ionicons name="navigate" size={24} color={Colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.saveFab}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="bookmark" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetAnim }], bottom: insets.bottom + 80 }]}>
        {sheetData?.type === 'partner' && (
          <View style={styles.sheetContent}>
            <ExpoImage source={{ uri: sheetData.data.avatarUrl }} style={styles.sheetAvatar} />
            <Text style={styles.sheetTitle}>{sheetData.data.displayName || 'Partner'}</Text>
            <View style={styles.sheetInfoRowCenter}>
              <Ionicons name={sheetData.data.isCharging ? "battery-charging" : "battery-half"} size={20} color={sheetData.data.isCharging ? '#4CD964' : (sheetData.data.battery > 20 ? Colors.primary : Colors.secondary)} />
              <Text style={styles.sheetText}>{sheetData.data.battery}% Battery {sheetData.data.isCharging ? '(Charging)' : ''}</Text>
            </View>
            <TouchableOpacity style={styles.sheetButton} onPress={() => { closeSheet(); router.push('/(main)/tabs/chat'); }}>
              <Ionicons name="chatbubbles" size={20} color={Colors.white} />
              <Text style={styles.sheetButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        )}

        {sheetData?.type === 'place' && (
          <View style={styles.sheetContentLeft}>
            <View style={styles.placeHeaderRow}>
              <View style={styles.placeIconCircleLarge}>
                <Ionicons name={sheetData.data.icon as any || 'bookmark'} size={32} color={Colors.white} />
              </View>
              <View style={styles.placeHeaderText}>
                <Text style={styles.sheetTitleLeft}>{sheetData.data.label}</Text>
                <Text style={styles.sheetSubtitleLeft} numberOfLines={2}>{sheetData.data.address || sheetData.address}</Text>
              </View>
            </View>

            {sheetData.data.user && (
              <View style={styles.savedByPremiumContainer}>
                <ExpoImage source={{ uri: sheetData.data.user.avatarUrl }} style={styles.savedByAvatarPremium} />
                <View>
                  <Text style={styles.savedByLabelPremium}>Saved by</Text>
                  <Text style={styles.savedByTextPremium}>{sheetData.data.user.displayName}</Text>
                </View>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.premiumDetailsGrid}>
              <View style={styles.premiumDetailCard}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="time" size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.detailCardLabel}>Last Visited</Text>
                  <Text style={styles.detailCardValue}>Just now</Text>
                </View>
              </View>
              <View style={styles.premiumDetailCard}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="battery-half" size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.detailCardLabel}>Last Battery</Text>
                  <Text style={styles.detailCardValue}>100%</Text>
                </View>
              </View>
            </View>

            <View style={styles.sheetActionRowPremium}>
              <TouchableOpacity style={[styles.sheetButtonPremium, { backgroundColor: '#EAEAEA' }]} onPress={() => handleEditPlaceClick(sheetData.data)}>
                <Ionicons name="pencil" size={18} color={Colors.text} />
                <Text style={[styles.sheetButtonTextPremium, { color: Colors.text }]}>Edit Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetButtonPremium, { backgroundColor: Colors.error }]} onPress={() => handleDeletePlace(sheetData.data.id)}>
                <Ionicons name="trash" size={18} color={Colors.white} />
                <Text style={[styles.sheetButtonTextPremium, { color: Colors.white }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editPlaceId ? 'Edit Location' : 'Save Location'}</Text>
            <Text style={styles.modalSubtitle}>Enter a label to save the current map center.</Text>
            
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

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Home, Gym, Favorite Cafe"
              placeholderTextColor={Colors.textLight}
              value={placeLabel}
              onChangeText={setPlaceLabel}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => { setModalVisible(false); setEditPlaceId(null); setPlaceLabel(''); }}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonSave} 
                onPress={handleSavePlace}
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.modalButtonTextSave}>{editPlaceId ? 'Update' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const extraStyles = StyleSheet.create({

  bottomSheet: {
    position: 'absolute',
    left: 15,
    right: 15,
    backgroundColor: Colors.white,
    borderRadius: 25,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
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
  placeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 15,
  },
  placeHeaderText: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    width: '100%',
    marginVertical: 15,
  },
  savedByPremiumContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  savedByAvatarPremium: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  savedByLabelPremium: {
    fontSize: 12,
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  savedByTextPremium: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '700',
  },
  premiumDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  premiumDetailCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 16,
    gap: 10,
  },
  detailIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(2, 212, 172, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCardLabel: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailCardValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '700',
  },
  sheetActionRowPremium: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  sheetButtonPremium: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  sheetButtonTextPremium: {
    fontSize: 15,
    fontWeight: '700',
  },
  savedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  savedByAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },

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

  savedByText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },

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
  savedPlaceMarker: {
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
  },
  targetMarker: {
    paddingBottom: 25, // offset to point exactly at center
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fixedCenterTarget: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
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

const styles = StyleSheet.create({
  ...extraStyles,
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topHeaderContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 5,
  },
  textInputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: 'transparent',
    height: 48,
    borderRadius: 25,
  },
  searchListView: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 15,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    zIndex: 9999,
  },
  searchRow: {
    padding: 13,
    minHeight: 44,
    flexDirection: 'row',
  },
  fabContainer: {
    position: 'absolute',
    left: 20,
    alignItems: 'center',
    gap: 15,
  },
  myLocationFab: {
    backgroundColor: Colors.white,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  saveFab: {
    backgroundColor: Colors.primary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    padding: 25,
    borderRadius: 16,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    color: Colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButtonCancel: {
    padding: 10,
    marginRight: 10,
  },
  modalButtonTextCancel: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSave: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonTextSave: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
