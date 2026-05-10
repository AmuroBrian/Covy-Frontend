import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAvoidingView, Platform, ScrollView, Image as RNImage, Animated } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Svg, { Circle, ClipPath, Defs, Image as SvgImage } from 'react-native-svg';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../../src/context/AuthContext';
import MapView, { PROVIDER_GOOGLE, Region, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import apiClient from '../../../src/api/axios';
import { useNavigation, useRouter } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRealtime } from '../../../src/context/RealtimeContext';

import NudgeButton from '../../../src/components/shared/NudgeButton';

const getActivityFromSpeed = (speed?: number | null) => {
  if (speed === undefined || speed === null || speed < 1.0) return null;
  if (speed < 6.5) return 'Walking';
  return 'Driving';
};

const getActivityIcon = (activity: string | null) => {
  if (activity === 'Walking') return 'walk';
  if (activity === 'Driving') return 'car';
  return null;
};

const AvatarMarker = ({ coordinate, uri, fallbackColor, speed, onPress }: { coordinate: any, uri?: string, fallbackColor: string, speed?: number, onPress?: (e: any) => void }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const activity = getActivityFromSpeed(speed);
  const icon = getActivityIcon(activity);
  
  return (
    <Marker 
      coordinate={coordinate} 
      tracksViewChanges={!isLoaded}
      onPress={onPress}
      zIndex={activity ? 999 : 1}
    >
      <View style={{ width: 50, height: 50, justifyContent: 'center', alignItems: 'center' }}>
        {uri ? (
          <RNImage 
            source={{ uri }} 
            style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: fallbackColor }}
            onLoad={() => setIsLoaded(true)}
          />
        ) : (
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: fallbackColor, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' }}>
            <Ionicons name="person" size={24} color="white" />
          </View>
        )}
        
        {icon && (
          <View style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 24,
            height: 24,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: 'white',
            backgroundColor: activity === 'Driving' ? '#0ea5e9' : '#10b981'
          }}>
            <Ionicons name={icon as any} size={14} color="white" />
          </View>
        )}
      </View>
    </Marker>
  );
};

export default function MapScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const mapRef = useRef<MapView>(null);
  const { session, profile, checkPartnerStatus } = useAuth();
  const { pingLocation, partnerLocation: contextPartnerLocation, sendNudge } = useRealtime();
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);
  const [myBattery, setMyBattery] = useState<number>(100);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [partnerLocation, setPartnerLocation] = useState<{lat: number, lng: number, battery: number, isCharging?: boolean, speed?: number} | null>(null);
  interface SheetData { type: 'partner' | 'place'; data: any; address?: string; }
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const sheetAnim = useRef(new Animated.Value(400)).current;
  const router = useRouter();

  const styles = React.useMemo(() => createStyles(colors), [colors]);

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
  
  const myLocationRef = useRef<{lat: number, lng: number} | null>(null);
  const mySpeedRef = useRef<number | null>(null);

  useEffect(() => {
    myLocationRef.current = myLocation;
  }, [myLocation]);

  useEffect(() => {
    const syncBatteryTimer = setInterval(async () => {
      try {
        const bat = await Battery.getBatteryLevelAsync();
        const batState = await Battery.getBatteryStateAsync();
        const isDeviceCharging = batState === Battery.BatteryState.CHARGING || batState === Battery.BatteryState.FULL;
        const batPercent = bat >= 0 ? Math.round(bat * 100) : 100;
        
        setMyBattery(batPercent);
        setIsCharging(isDeviceCharging);

        if (myLocationRef.current) {
          pingLocation(myLocationRef.current.lat, myLocationRef.current.lng, batPercent, isDeviceCharging, mySpeedRef.current ?? undefined);
        }
      } catch (err) {}
    }, 10000); // Send battery status every 10 seconds regardless of movement

    return () => clearInterval(syncBatteryTimer);
  }, [pingLocation]);

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
        battery: contextPartnerLocation.battery ?? 100,
        isCharging: contextPartnerLocation.isCharging ?? false,
        speed: contextPartnerLocation.speed
      });
    }
  }, [contextPartnerLocation]);
  useEffect(() => {
    const fetchLatestPartnerLoc = async () => {
      try {
        const res = await apiClient.get('/locations/latest');
        if (res.data && res.data.latitude) {
          setPartnerLocation({ 
            lat: res.data.latitude, 
            lng: res.data.longitude, 
            battery: res.data.battery ?? 100,
            isCharging: res.data.isCharging ?? false,
            speed: res.data.speed
          });
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
          mySpeedRef.current = loc.coords.speed;
          pingLocation(loc.coords.latitude, loc.coords.longitude, batPercent, isDeviceCharging, loc.coords.speed ?? undefined);
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
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={false}
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
              <Ionicons name={(place.icon as any) || 'bookmark'} size={20} color={colors.white} />
            </View>
          </Marker>
        ))}

        {myLocation && (
          <AvatarMarker 
            coordinate={{ latitude: myLocation.lat, longitude: myLocation.lng }}
            uri={profile?.avatarUrl}
            fallbackColor={colors.primary}
            speed={mySpeedRef.current ?? undefined}
          />
        )}

        {partnerLocation && (
          <AvatarMarker 
            coordinate={{ latitude: partnerLocation.lat, longitude: partnerLocation.lng }}
            uri={profile?.couple?.users?.find((u: any) => u.id !== profile.id)?.avatarUrl}
            fallbackColor={colors.secondary}
            speed={partnerLocation.speed}
            onPress={(e) => {
              e.stopPropagation();
              const partnerProfile = profile?.couple?.users?.find((u: any) => u.id !== profile.id);
              openSheet({ type: 'partner', data: { ...partnerProfile, battery: partnerLocation.battery ?? 100, isCharging: partnerLocation.isCharging ?? false, speed: partnerLocation.speed } });
            }}
          />
        )}

      </MapView>

      <View style={styles.fixedCenterTarget} pointerEvents="none">
        <Animated.View style={[styles.targetMarker, { opacity: targetOpacity, transform: [{ scale: targetScale }] }]}>
          <Ionicons name="location" size={50} color={colors.primary} />
        </Animated.View>
      </View>

      <View style={[styles.topHeaderContainer, { top: insets.top + 10 }]}>
        <View style={styles.batteryContainer}>
          <Ionicons name={isCharging ? "battery-charging" : (myBattery > 20 ? "battery-full" : "battery-dead")} size={20} color={isCharging ? colors.success : (myBattery > 20 ? colors.primary : colors.secondary)} />
          <Text style={styles.statusText}>{myBattery}% {isCharging ? '(Charging)' : ''}</Text>
        </View>

        <TouchableOpacity onPress={openSidebar}>
          {profile?.avatarUrl ? (
            <ExpoImage source={{ uri: profile.avatarUrl }} style={styles.topHeaderAvatar} />
          ) : (
            <Ionicons name="person-circle" size={45} color={colors.primary} />
          )}
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
          <Ionicons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
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
          placeholderTextColor: colors.textLight,
        }}
        enablePoweredByContainer={false}
        keyboardShouldPersistTaps="always"
      />

      <View style={[styles.fabContainer, { bottom: insets.bottom + 90 }]}>
        <NudgeButton isFloating={true} style={{ marginBottom: 15 }} />

        <TouchableOpacity 
          style={styles.myLocationFab}
          onPress={handleGoToMyLocation}
        >
          <Ionicons name="navigate" size={24} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.saveFab}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="bookmark" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetAnim }], bottom: insets.bottom + 80 }]}>
        {sheetData?.type === 'partner' && (
          <View style={styles.sheetContent}>
            <ExpoImage source={{ uri: sheetData.data.avatarUrl }} style={styles.sheetAvatar} />
            <Text style={styles.sheetTitle}>{sheetData.data.displayName || 'Partner'}</Text>
            <View style={styles.sheetInfoRowCenter}>
              <Ionicons name={sheetData.data.isCharging ? "battery-charging" : "battery-half"} size={20} color={sheetData.data.isCharging ? colors.success : (sheetData.data.battery > 20 ? colors.primary : colors.secondary)} />
              <Text style={styles.sheetText}>{sheetData.data.battery}% Battery {sheetData.data.isCharging ? '(Charging)' : ''}</Text>
            </View>
            
            {getActivityFromSpeed(sheetData.data.speed) && (
              <View style={[styles.sheetInfoRowCenter, { marginTop: -10 }]}>
                <Ionicons name={getActivityIcon(getActivityFromSpeed(sheetData.data.speed)) as any} size={20} color={getActivityFromSpeed(sheetData.data.speed) === 'Driving' ? '#0ea5e9' : '#10b981'} />
                <Text style={styles.sheetText}>
                  {getActivityFromSpeed(sheetData.data.speed)}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.sheetButton} onPress={() => { closeSheet(); /* open chat logic */ }}>
              <Ionicons name="chatbubbles" size={20} color={colors.white} />
              <Text style={styles.sheetButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        )}

        {sheetData?.type === 'place' && (
          <View style={styles.sheetContentLeft}>
            <View style={styles.placeHeaderRow}>
              <View style={styles.placeIconCircleLarge}>
                <Ionicons name={sheetData.data.icon as any || 'bookmark'} size={32} color={colors.white} />
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
                  <Ionicons name="time" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.detailCardLabel}>Last Visited</Text>
                  <Text style={styles.detailCardValue}>Just now</Text>
                </View>
              </View>
              <View style={styles.premiumDetailCard}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="battery-half" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.detailCardLabel}>Last Battery</Text>
                  <Text style={styles.detailCardValue}>100%</Text>
                </View>
              </View>
            </View>

            <View style={styles.sheetActionRowPremium}>
              <TouchableOpacity style={[styles.sheetButtonPremium, { backgroundColor: colors.border }]} onPress={() => handleEditPlaceClick(sheetData.data)}>
                <Ionicons name="pencil" size={18} color={colors.text} />
                <Text style={[styles.sheetButtonTextPremium, { color: colors.text }]}>Edit Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetButtonPremium, { backgroundColor: colors.error }]} onPress={() => handleDeletePlace(sheetData.data.id)}>
                <Ionicons name="trash" size={18} color={colors.white} />
                <Text style={[styles.sheetButtonTextPremium, { color: colors.white }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeaderIconContainer}>
              <Ionicons name="location" size={32} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>{editPlaceId ? 'Edit Location' : 'Save Location'}</Text>
            <Text style={styles.modalSubtitle}>Give this place a recognizable name and icon to get notified when your partner arrives.</Text>
            
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
                  <Ionicons name={ic as any} size={22} color={selectedIcon === ic ? colors.primary : colors.textLight} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="text-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Home, Gym, Cafe"
                placeholderTextColor={colors.textLight}
                value={placeLabel}
                onChangeText={setPlaceLabel}
                autoFocus
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => { setModalVisible(false); setEditPlaceId(null); setPlaceLabel(''); }}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonSave} 
                onPress={handleSavePlace}
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.modalButtonTextSave}>{editPlaceId ? 'Update' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  bottomSheet: {
    position: 'absolute',
    left: 15,
    right: 15,
    backgroundColor: colors.surface,
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
    borderColor: colors.primary,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
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
    color: colors.text,
    fontWeight: '600',
  },
  sheetButton: {
    backgroundColor: colors.primary,
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
    color: colors.white,
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
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  sheetTitleLeft: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  sheetSubtitleLeft: {
    fontSize: 14,
    color: colors.textLight,
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
    color: colors.text,
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
    backgroundColor: colors.border,
    width: '100%',
    marginVertical: 15,
  },
  savedByPremiumContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savedByAvatarPremium: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  savedByLabelPremium: {
    fontSize: 12,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  savedByTextPremium: {
    fontSize: 15,
    color: colors.text,
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
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 16,
    gap: 10,
  },
  detailIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCardLabel: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailCardValue: {
    fontSize: 14,
    color: colors.text,
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
    backgroundColor: colors.border,
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
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },

  savedByText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },

  markerOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    backgroundColor: colors.surface,
  },
  myMarkerOuter: {
    borderColor: colors.primary,
  },
  partnerMarkerOuter: {
    borderColor: colors.secondary,
  },
  svgMarkerWrapper: {
    width: 48,
    height: 48,
    backgroundColor: 'transparent',
  },
  markerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    resizeMode: 'cover',
  },
  markerFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  savedPlaceMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
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

  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
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
    color: colors.text,
    marginLeft: 5,
  },
  topHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  textInputContainer: {
    backgroundColor: colors.surface,
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
    color: colors.text,
    backgroundColor: 'transparent',
    height: 48,
    borderRadius: 25,
  },
  searchListView: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  iconButtonSelected: {
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    marginRight: 12,
  },
  modalButtonTextCancel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSave: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonTextSave: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  }
});
