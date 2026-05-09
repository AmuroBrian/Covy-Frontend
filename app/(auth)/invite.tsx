import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../src/context/AuthContext';
import apiClient from '../../src/api/axios';
import { Colors } from '../../src/theme/colors';

export default function InviteScreen() {
  const { signOut, checkPartnerStatus, profile } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Automatically check if a partner connected to us every 5 seconds
    const interval = setInterval(() => {
      checkPartnerStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyCode = async () => {
    if (profile?.inviteCode) {
      await Clipboard.setStringAsync(profile.inviteCode);
      Alert.alert('Copied!', 'Your invite code has been copied to clipboard.');
    }
  };

  const handleConnect = async () => {
    if (!inviteCode || inviteCode.length < 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-character partner code.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/couples/connect', { inviteCode });
      // Refresh the auth state, which redirects the user if a partner is successfully linked
      await checkPartnerStatus();
    } catch (error: any) {
      Alert.alert('Connection Failed', error.response?.data?.message || 'Could not connect partner.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect with your Partner</Text>
      <Text style={styles.subtitle}>Enter your partner's 6-character invite code below to securely link your accounts.</Text>

      <View style={styles.myCodeContainer}>
        <Text style={styles.myCodeLabel}>Your Invite Code:</Text>
        <TouchableOpacity style={styles.myCodeBox} onPress={handleCopyCode}>
          <Text style={styles.myCodeText}>{profile?.inviteCode || '------'}</Text>
          <Text style={styles.copyText}>TAP TO COPY</Text>
        </TouchableOpacity>
        <View style={styles.waitingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.waitingText}>Waiting for partner to connect...</Text>
        </View>
      </View>

      <Text style={styles.orText}>— OR ENTER PARTNER'S CODE —</Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. A1B2C3"
        placeholderTextColor={Colors.textLight}
        autoCapitalize="characters"
        maxLength={6}
        value={inviteCode}
        onChangeText={setInviteCode}
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleConnect} disabled={loading}>
        {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryButtonText}>Connect Partner</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white, padding: 30, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: Colors.textLight, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  
  myCodeContainer: { marginBottom: 30, alignItems: 'center' },
  myCodeLabel: { fontSize: 14, color: Colors.textLight, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  myCodeBox: { backgroundColor: Colors.primary + '15', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary + '30', width: '100%', alignItems: 'center' },
  myCodeText: { fontSize: 28, fontWeight: 'bold', color: Colors.primary, letterSpacing: 8 },
  copyText: { fontSize: 12, color: Colors.primary, marginTop: 5, fontWeight: 'bold' },
  waitingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
  waitingText: { color: Colors.primary, marginLeft: 8, fontSize: 14, fontWeight: '500' },
  
  orText: { textAlign: 'center', color: Colors.textLight, marginBottom: 20, fontSize: 12, letterSpacing: 1 },
  
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 20, fontSize: 24, letterSpacing: 5, color: Colors.text, textAlign: 'center', marginBottom: 30 },
  primaryButton: { backgroundColor: Colors.primary, padding: 18, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  logoutButton: { marginTop: 20, padding: 15, alignItems: 'center' },
  logoutButtonText: { color: Colors.textLight, fontSize: 16, fontWeight: '600' },
});
