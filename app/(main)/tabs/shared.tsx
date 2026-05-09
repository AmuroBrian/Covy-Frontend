import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../src/theme/colors';

export default function SharedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Shared Goals & Finance (Under Construction)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  text: { color: Colors.text, fontSize: 18 },
});
