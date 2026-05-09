import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Colors } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/api/supabase';
import apiClient from '../../src/api/axios';
import { decode } from 'base64-arraybuffer';
import { Image } from 'expo-image';
import { Alert, ActivityIndicator } from 'react-native';

function CustomDrawerContent(props: any) {
  const { profile, signOut, checkPartnerStatus } = useAuth();
  const [uploading, setUploading] = React.useState(false);

  const handleUploadAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (result.canceled || !result.assets[0].base64) return;

      setUploading(true);
      const base64FileData = result.assets[0].base64;
      // We store it under profile.id/picture.jpg to match {userId}/picture
      const filePath = `${profile?.id}/picture.jpg`;

      const { data, error } = await supabase.storage
        .from('profilepictures')
        .upload(filePath, decode(base64FileData), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('profilepictures')
        .getPublicUrl(filePath);

      // Force cache bust by adding a timestamp
      const bustUrl = `${publicUrl}?t=${Date.now()}`;

      await apiClient.patch('/users/profile', {
        displayName: profile?.displayName,
        gender: profile?.gender,
        avatarUrl: bustUrl,
      });

      await checkPartnerStatus(); // Refresh profile context
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'Failed to upload profile picture.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        {/* Custom Header */}
        <View style={styles.drawerHeader}>
          <TouchableOpacity onPress={handleUploadAvatar} disabled={uploading}>
            {uploading ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator color={Colors.white} />
              </View>
            ) : profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person-circle" size={80} color={Colors.primary} />
            )}
          </TouchableOpacity>
          <Text style={styles.appName}>Covy</Text>
          <Text style={styles.userName}>{profile?.displayName || 'User'}</Text>
        </View>

        {/* Default Drawer Items */}
        <View style={styles.drawerItemsContainer}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      {/* Sign Out Button at Bottom */}
      <View style={styles.bottomDrawerSection}>
        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={22} color={Colors.error || '#FF3B30'} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function MainLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: Colors.primary,
        drawerInactiveTintColor: Colors.text,
        drawerLabelStyle: { fontSize: 16, fontWeight: '500', marginLeft: -10 },
      }}
    >
      <Drawer.Screen
        name="tabs"
        options={{
          drawerLabel: 'Map & Chat',
          title: 'Map & Chat',
          drawerIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: 'Settings',
          title: 'Settings',
          drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="about"
        options={{
          drawerLabel: 'About Us',
          title: 'About Us',
          drawerIcon: ({ color, size }) => <Ionicons name="information-circle-outline" size={size} color={color} />,
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    backgroundColor: Colors.primary + '10',
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 10,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 10,
  },
  userName: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 5,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerItemsContainer: {
    paddingHorizontal: 10,
  },
  bottomDrawerSection: {
    marginBottom: 15,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    padding: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error || '#FF3B30',
    marginLeft: 15,
  },
});
