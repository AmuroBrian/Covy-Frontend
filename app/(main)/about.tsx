import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../src/theme/colors';

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>About Covy</Text>
      <Text style={styles.text}>Covy is designed to keep your hearts perfectly synced, no matter the distance.</Text>
      
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.primary, marginBottom: 20 },
  text: { fontSize: 16, color: Colors.text, textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  versionContainer: { padding: 10, backgroundColor: Colors.surface, borderRadius: 10 },
  versionText: { color: Colors.textLight, fontWeight: '600' },
});
