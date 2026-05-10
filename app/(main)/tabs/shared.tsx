import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../../src/theme/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getChecklists, getGoals } from '../../../src/api/shared.api';
import ChecklistsModal from '../../../src/components/shared/ChecklistsModal';
import GoalsModal from '../../../src/components/shared/GoalsModal';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useRealtime } from '../../../src/context/RealtimeContext';

export default function SharedScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const { lastSharedUpdate } = useRealtime();
  
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  
  // Metrics
  const [checklistsCount, setChecklistsCount] = useState(0);
  const [goalsStats, setGoalsStats] = useState({ completed: 0, total: 0 });

  // Modal States
  const [isChecklistsOpen, setChecklistsOpen] = useState(false);
  const [isGoalsOpen, setGoalsOpen] = useState(false);

  const fetchMetrics = async () => {
    try {
      // Fetch checklists
      const cData = await getChecklists();
      setChecklistsCount(cData.length);

      // Fetch goals
      const gData = await getGoals();
      const completed = gData.filter((g: any) => g.isCompleted).length;
      setGoalsStats({ completed, total: gData.length });
    } catch (e) {
      console.log('Failed to fetch shared metrics', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMetrics();
    }, [])
  );

  useEffect(() => {
    fetchMetrics();
  }, [lastSharedUpdate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.headerTitle}>Shared Space</Text>
        <Text style={styles.headerSubtitle}>Manage your life together</Text>
        
        {/* Checklists Card */}
        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => setChecklistsOpen(true)}>
          <View style={styles.cardTop}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="list" size={24} color={colors.primary} />
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </View>
          <Text style={styles.cardTitle}>Checklists</Text>
          <Text style={styles.cardSubtitle}>
            {checklistsCount === 0 ? 'No active lists' : `${checklistsCount} lists available`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => setGoalsOpen(true)}>
          <View style={styles.cardTop}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(76, 201, 240, 0.1)' }]}>
              <Ionicons name="flag" size={24} color="#4CC9F0" />
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </View>
          <Text style={styles.cardTitle}>Goals</Text>
          
          <View style={styles.metricRow}>
            <Text style={styles.cardSubtitle}>
              {goalsStats.total === 0 ? 'No active goals' : `${goalsStats.completed} of ${goalsStats.total} completed`}
            </Text>
            {goalsStats.total > 0 && (
              <View style={styles.miniProgressContainer}>
                <View style={[styles.miniProgressBar, { width: `${(goalsStats.completed / goalsStats.total) * 100}%`, backgroundColor: "#4CC9F0" }]} />
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Pet Card */}
        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => router.push('/(main)/shared/pet' as any)}>
          <View style={styles.cardTop}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
              <Ionicons name="paw" size={24} color="#FF6B6B" />
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </View>
          <Text style={styles.cardTitle}>Our Pet</Text>
          <Text style={styles.cardSubtitle}>Play, feed, and interact!</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Feature Modals */}
      <ChecklistsModal visible={isChecklistsOpen} onClose={() => { setChecklistsOpen(false); fetchMetrics(); }} />
      <GoalsModal visible={isGoalsOpen} onClose={() => { setGoalsOpen(false); fetchMetrics(); }} />
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: colors.text, marginTop: 10 },
  headerSubtitle: { fontSize: 16, color: colors.textLight, marginBottom: 30, marginTop: 5 },
  
  card: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
  cardSubtitle: { fontSize: 15, color: colors.textLight },
  
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniProgressContainer: {
    width: 60,
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniProgressBar: {
    height: '100%',
    borderRadius: 3,
  }
});
