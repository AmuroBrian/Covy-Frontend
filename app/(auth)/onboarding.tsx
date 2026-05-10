import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import apiClient from '../../src/api/axios';
import { useTheme } from '../../src/theme/ThemeContext';

export default function OnboardingScreen() {
  const { checkPartnerStatus } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      Alert.alert('Missing Info', 'Please enter your name.');
      return;
    }
    if (!gender) {
      Alert.alert('Missing Info', 'Please select your gender.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.patch('/users/profile', { displayName, gender });
      // Fetch the updated profile to satisfy the AuthGuard and progress to invite screen
      await checkPartnerStatus();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const genders = ['Male', 'Female', 'Other'];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>Let's set up your personal profile before you invite your partner.</Text>

      <Text style={styles.label}>What should we call you?</Text>
      <TextInput
        style={styles.input}
        placeholder="Your name or nickname"
        placeholderTextColor={colors.textLight}
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={30}
      />

      <Text style={styles.label}>Select your gender</Text>
      <View style={styles.genderContainer}>
        {genders.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.genderButton, gender === g && styles.genderButtonSelected]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Continue</Text>}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 30, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.text, marginBottom: 10 },
  subtitle: { fontSize: 16, color: colors.textLight, marginBottom: 40, lineHeight: 24 },
  label: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 10 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 18, fontSize: 18, color: colors.text, marginBottom: 30 },
  genderContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  genderButton: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 15, borderRadius: 12, alignItems: 'center', marginHorizontal: 5 },
  genderButtonSelected: { backgroundColor: colors.primary + '15', borderColor: colors.primary },
  genderText: { fontSize: 16, color: colors.textLight, fontWeight: '600' },
  genderTextSelected: { color: colors.primary, fontWeight: 'bold' },
  primaryButton: { backgroundColor: colors.primary, padding: 18, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
});
