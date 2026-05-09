import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../src/theme/colors';
import { useAuth } from '../../src/context/AuthContext';

export default function SettingsScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>App Settings</Text>
      
      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, backgroundColor: Colors.background },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 40 },
  logoutButton: { backgroundColor: Colors.error, padding: 15, borderRadius: 10, alignItems: 'center' },
  logoutText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
});
