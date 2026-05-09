import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { supabase } from '../../src/api/supabase';
import { Colors } from '../../src/theme/colors';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Ensure the browser session can close correctly
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (isSignUp: boolean) => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      Alert.alert('Authentication Failed', error.message);
    }
    setLoading(false);
  };

  const handleFacebookLogin = async () => {
    try {
      const returnUrl = Linking.createURL('/(auth)/login');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: returnUrl,
          skipBrowserRedirect: true, // Required for React Native
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open the browser for the OAuth flow
        const result = await WebBrowser.openAuthSessionAsync(data.url, returnUrl);
        
        if (result.type === 'success' && result.url) {
          // Parse the access_token and refresh_token from the URL hash
          const hashFragment = result.url.split('#')[1];
          if (hashFragment) {
            const params = hashFragment.split('&').reduce((acc, current) => {
              const [key, value] = current.split('=');
              acc[key] = value;
              return acc;
            }, {} as Record<string, string>);

            if (params.access_token && params.refresh_token) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: params.access_token,
                refresh_token: params.refresh_token,
              });
              if (sessionError) throw sessionError;
            }
          }
        }
      }
    } catch (e: any) {
      Alert.alert('Facebook Login Failed', e.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../../assets/images/covylogo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>Your hearts, perfectly synced.</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor={Colors.textLight}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textLight}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={() => handleAuth(false)} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? 'Please wait...' : 'Login'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => handleAuth(true)} disabled={loading}>
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.facebookButton} onPress={handleFacebookLogin} disabled={loading}>
          <Text style={styles.facebookButtonText}>Continue with Facebook</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  logoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 180, height: 180, borderRadius: 30, marginBottom: 20 },
  tagline: { color: Colors.white, fontSize: 18, fontWeight: '600', opacity: 0.9 },
  formContainer: { backgroundColor: Colors.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16, fontSize: 16, color: Colors.text, marginBottom: 15 },
  primaryButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  primaryButtonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 5 },
  secondaryButtonText: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },
  facebookButton: { backgroundColor: '#1877F2', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  facebookButtonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
});
