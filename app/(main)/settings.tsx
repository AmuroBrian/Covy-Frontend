import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../../src/theme/colors';
import { useAuth } from '../../src/context/AuthContext';

export default function SettingsScreen() {
  const { signOut, profile } = useAuth();

  const handleCopyCode = async () => {
    if (profile?.inviteCode) {
      await Clipboard.setStringAsync(profile.inviteCode);
      Alert.alert('Copied!', 'Your invite code has been copied to clipboard.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>App Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Partner Connection</Text>
        <Text style={styles.myCodeLabel}>Your Invite Code:</Text>
        <TouchableOpacity style={styles.myCodeBox} onPress={handleCopyCode}>
          <Text style={styles.myCodeText}>{profile?.inviteCode || '------'}</Text>
          <Text style={styles.copyText}>TAP TO COPY</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, backgroundColor: Colors.background },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 40 },
  section: { backgroundColor: Colors.white, padding: 20, borderRadius: 15, marginBottom: 30, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 20 },
  myCodeLabel: { fontSize: 14, color: Colors.textLight, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  myCodeBox: { backgroundColor: Colors.primary + '15', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary + '30', width: '100%', alignItems: 'center' },
  myCodeText: { fontSize: 24, fontWeight: 'bold', color: Colors.primary, letterSpacing: 5 },
  copyText: { fontSize: 12, color: Colors.primary, marginTop: 5, fontWeight: 'bold' },
  logoutButton: { backgroundColor: Colors.error, padding: 15, borderRadius: 10, alignItems: 'center' },
  logoutText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
});
