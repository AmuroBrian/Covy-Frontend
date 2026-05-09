import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../../src/theme/colors';

export default function SharedScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Shared Space</Text>
      
      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardEmoji}>✅</Text>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>Checklists</Text>
          <Text style={styles.cardSubtitle}>Groceries, chores, and shared tasks.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardEmoji}>🎯</Text>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>Goals</Text>
          <Text style={styles.cardSubtitle}>Track your shared milestones together.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardEmoji}>💰</Text>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>Finance</Text>
          <Text style={styles.cardSubtitle}>Manage shared budgets and expenses.</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.primary, marginBottom: 20 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    alignItems: 'center',
  },
  cardEmoji: { fontSize: 30, marginRight: 15 },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 5 },
  cardSubtitle: { fontSize: 14, color: Colors.textLight },
});
