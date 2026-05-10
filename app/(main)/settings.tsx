import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { signOut, profile, updatePreferences } = useAuth();
  const { colors } = useTheme();
  
  const prefs = profile?.preferences || {};
  
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const handleToggle = (key: string, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  const handleCopyCode = async () => {
    if (profile?.inviteCode) {
      await Clipboard.setStringAsync(profile.inviteCode);
      Alert.alert('Copied!', 'Your invite code has been copied to clipboard.');
    }
  };

  const renderSwitchRow = (icon: any, title: string, value: boolean, onValueChange: (val: boolean) => void) => (
    <View style={styles.switchRow}>
      <View style={styles.switchRowLeft}>
        <Ionicons name={icon} size={22} color={colors.primary} style={styles.rowIcon} />
        <Text style={styles.rowTitle}>{title}</Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onValueChange} 
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partner Connection</Text>
          <Text style={styles.myCodeLabel}>Your Invite Code:</Text>
          <TouchableOpacity style={styles.myCodeBox} onPress={handleCopyCode}>
            <Text style={styles.myCodeText}>{profile?.inviteCode || '------'}</Text>
            <Text style={styles.copyText}>TAP TO COPY</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {renderSwitchRow("notifications-outline", "Push Notifications", prefs.pushNotifs ?? true, (val) => handleToggle('pushNotifs', val))}
          {renderSwitchRow("heart-half-outline", "Nudge Alerts", prefs.nudgeNotifs ?? true, (val) => handleToggle('nudgeNotifs', val))}
          {renderSwitchRow("location-outline", "Partner Arrival Alerts", prefs.locationAlerts ?? false, (val) => handleToggle('locationAlerts', val))}
          {renderSwitchRow("battery-dead-outline", "Low Battery Alerts", prefs.batteryAlerts ?? true, (val) => handleToggle('batteryAlerts', val))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Data</Text>
          {renderSwitchRow("map-outline", "Share Real-Time Location", prefs.shareLocation ?? true, (val) => handleToggle('shareLocation', val))}
          {renderSwitchRow("battery-full-outline", "Share Battery Level", prefs.showBattery ?? true, (val) => handleToggle('showBattery', val))}
          {renderSwitchRow("checkmark-done-outline", "Read Receipts", prefs.readReceipts ?? true, (val) => handleToggle('readReceipts', val))}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          {renderSwitchRow("moon-outline", "Dark Mode", prefs.darkMode ?? false, (val) => handleToggle('darkMode', val))}
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: 25 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 25, marginTop: 10 },
  section: { backgroundColor: colors.surface, padding: 20, borderRadius: 15, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textLight, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  myCodeLabel: { fontSize: 13, color: colors.textLight, marginBottom: 8, letterSpacing: 0.5 },
  myCodeBox: { backgroundColor: colors.primary + '15', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '30', width: '100%', alignItems: 'center' },
  myCodeText: { fontSize: 26, fontWeight: 'bold', color: colors.primary, letterSpacing: 5 },
  copyText: { fontSize: 11, color: colors.primary, marginTop: 8, fontWeight: 'bold' },
  
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
  switchRowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { marginRight: 15 },
  rowTitle: { fontSize: 16, color: colors.text, fontWeight: '500' },
  
  logoutButton: { backgroundColor: colors.error, padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  logoutText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
});
