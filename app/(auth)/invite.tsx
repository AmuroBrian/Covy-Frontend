import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import apiClient from '../../src/api/axios';
import { Colors } from '../../src/theme/colors';

export default function InviteScreen() {
  const { signOut, checkPartnerStatus } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

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
  subtitle: { fontSize: 16, color: Colors.textLight, textAlign: 'center', marginBottom: 40, lineHeight: 22 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 20, fontSize: 24, letterSpacing: 5, color: Colors.text, textAlign: 'center', marginBottom: 30 },
  primaryButton: { backgroundColor: Colors.primary, padding: 18, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  logoutButton: { marginTop: 20, padding: 15, alignItems: 'center' },
  logoutButtonText: { color: Colors.textLight, fontSize: 16, fontWeight: '600' },
});
