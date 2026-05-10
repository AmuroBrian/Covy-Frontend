import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';

export default function AboutScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

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

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, padding: 30, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.primary, marginBottom: 20 },
  text: { fontSize: 16, color: colors.text, textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  versionContainer: { padding: 10, backgroundColor: colors.surface, borderRadius: 10 },
  versionText: { color: colors.textLight, fontWeight: '600' },
});
