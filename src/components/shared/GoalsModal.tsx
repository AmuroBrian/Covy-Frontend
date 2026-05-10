import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { getGoals, createGoal, deleteGoal, updateGoal } from '../../api/shared.api';
import { useRealtime } from '../../context/RealtimeContext';

interface GoalsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function GoalsModal({ visible, onClose }: GoalsModalProps) {
  const { colors } = useTheme();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTargetAmount, setNewTargetAmount] = useState('');
  const [activeLoggingGoal, setActiveLoggingGoal] = useState<any>(null);
  const [logAmount, setLogAmount] = useState('');
  const { lastSharedUpdate } = useRealtime();
  
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getGoals();
      setGoals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) fetchData();
  }, [visible, lastSharedUpdate]);

  const handleCreateGoal = async () => {
    if (!newTitle.trim()) return;
    try {
      const amt = newTargetAmount ? parseFloat(newTargetAmount) : undefined;
      const newGoal = await createGoal(newTitle.trim(), newDesc.trim(), undefined, amt);
      setGoals([newGoal, ...goals]);
      setNewTitle('');
      setNewDesc('');
      setNewTargetAmount('');
    } catch (err) {
      Alert.alert('Error', 'Failed to create goal');
    }
  };

  const submitLogAmount = async () => {
    if (!activeLoggingGoal || !logAmount.trim()) return;
    const addAmt = parseFloat(logAmount);
    if (isNaN(addAmt) || addAmt <= 0) return;

    const newProgress = Math.min((activeLoggingGoal.progress || 0) + addAmt, activeLoggingGoal.targetAmount);
    const isCompleted = newProgress >= activeLoggingGoal.targetAmount;
    
    // Optimistic UI Update
    setGoals(prev => prev.map(g => g.id === activeLoggingGoal.id ? { ...g, progress: newProgress, isCompleted } : g));
    setActiveLoggingGoal(null);
    setLogAmount('');

    try {
      await updateGoal(activeLoggingGoal.id, { progress: newProgress, isCompleted });
    } catch (err) {
      fetchData();
    }
  };

  const handleToggleGoal = async (goal: any) => {
    try {
      setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, isCompleted: !g.isCompleted } : g));
      await updateGoal(goal.id, { isCompleted: !goal.isCompleted });
    } catch (err) {
      fetchData();
    }
  };

  const handleDeleteGoal = async (id: string) => {
    Alert.alert('Delete Goal', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteGoal(id);
          setGoals(goals.filter(g => g.id !== id));
        } catch (err) {
          Alert.alert('Error', 'Failed to delete goal');
        }
      }}
    ]);
  };

  const renderGoal = ({ item }: { item: any }) => (
    <View style={[styles.goalCard, item.isCompleted && styles.goalCardCompleted]}>
      
      <View style={styles.goalHeader}>
        <View style={styles.goalHeaderLeft}>
           <TouchableOpacity onPress={() => handleToggleGoal(item)} style={styles.checkboxLarge}>
             <Ionicons name={item.isCompleted ? "checkmark-circle" : "ellipse-outline"} size={32} color={item.isCompleted ? colors.success : colors.primary} />
           </TouchableOpacity>
           <View style={styles.goalHeaderText}>
             <Text style={[styles.goalTitle, item.isCompleted && styles.completedTitleText]}>{item.title}</Text>
             {item.description ? (
               <Text style={[styles.goalDesc, item.isCompleted && styles.completedDescText]}>{item.description}</Text>
             ) : null}
           </View>
        </View>
        
        <TouchableOpacity onPress={() => handleDeleteGoal(item.id)} style={styles.goalDeleteBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.textLight} />
        </TouchableOpacity>
      </View>

      {item.targetAmount ? (
         <View style={[styles.goalProgressSection, item.isCompleted && styles.goalProgressSectionCompleted]}>
            <View style={styles.progressHeader}>
              <View style={{ marginBottom: 15 }}>
                <Text style={[styles.progressAmountSaved, item.isCompleted && { color: colors.success }]}>₱{(item.progress || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                <Text style={styles.progressAmountTarget}>of ₱{item.targetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </View>
              
              {!item.isCompleted ? (
                <TouchableOpacity onPress={() => setActiveLoggingGoal(item)} style={styles.addFundsBtn}>
                  <Ionicons name="add" size={20} color={colors.white} />
                  <Text style={styles.addFundsText}>Log</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.completedBadge}>
                   <Ionicons name="trophy" size={18} color={colors.white} />
                   <Text style={styles.completedBadgeText}>ACHIEVED</Text>
                </View>
              )}
            </View>
            
            <View style={[styles.progressBarTrack, item.isCompleted && { backgroundColor: colors.success + '33' }]}>
               <View style={[styles.progressBarFill, { width: `${Math.min(((item.progress || 0) / item.targetAmount) * 100, 100)}%` }, item.isCompleted && { backgroundColor: colors.success }]} />
            </View>
         </View>
      ) : null}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shared Goals</Text>
          <View style={{ width: 28 }} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={goals}
            keyExtractor={item => item.id}
            renderItem={renderGoal}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.createGoalSection}>
                <View style={styles.createGoalHeader}>
                   <Ionicons name="rocket-outline" size={24} color={colors.primary} />
                   <Text style={styles.createGoalTitle}>Start a new goal</Text>
                </View>
                
                <TextInput
                  style={styles.premiumInput}
                  placeholder="What are we aiming for? (e.g. Hawaii Trip)"
                  placeholderTextColor="#A0A0A0"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
                <TextInput
                  style={[styles.premiumInput, { height: 80, paddingTop: 15 }]}
                  placeholder="Add some details... why is this important?"
                  placeholderTextColor="#A0A0A0"
                  value={newDesc}
                  onChangeText={setNewDesc}
                  multiline
                />
                
                <View style={styles.targetRow}>
                  <View style={styles.targetInputWrapper}>
                     <Text style={styles.currencyPrefix}>₱</Text>
                     <TextInput
                       style={styles.targetInput}
                       placeholder="Target Amount"
                       placeholderTextColor="#A0A0A0"
                       keyboardType="numeric"
                       value={newTargetAmount}
                       onChangeText={setNewTargetAmount}
                     />
                  </View>
                  <TouchableOpacity style={styles.premiumCreateBtn} onPress={handleCreateGoal}>
                    <Ionicons name="arrow-forward" size={24} color={colors.white} />
                  </TouchableOpacity>
                </View>
              </View>
            }
          />
        )}

        {activeLoggingGoal && (
          <View style={styles.overlayContainer}>
             <View style={styles.logModal}>
                <Text style={styles.logModalTitle}>Log Savings</Text>
                <Text style={styles.logModalSubtitle}>How much did you save for {activeLoggingGoal.title}?</Text>
                
                <View style={styles.logInputContainer}>
                   <Text style={styles.currencyPrefix}>₱</Text>
                   <TextInput
                     style={styles.logInput}
                     placeholder="Amount (e.g., 500)"
                     placeholderTextColor="#A0A0A0"
                     keyboardType="numeric"
                     value={logAmount}
                     onChangeText={setLogAmount}
                     autoFocus
                   />
                </View>

                <View style={styles.logActions}>
                   <TouchableOpacity style={styles.logCancelBtn} onPress={() => { setActiveLoggingGoal(null); setLogAmount(''); }}>
                      <Text style={styles.logCancelText}>Cancel</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.logSubmitBtn} onPress={submitLogAmount}>
                      <Text style={styles.logSubmitText}>Add Funds</Text>
                   </TouchableOpacity>
                </View>
             </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  closeBtn: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  listContent: { padding: 20, paddingBottom: 50 },
  
  createGoalSection: { backgroundColor: colors.surface, padding: 25, borderRadius: 28, marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 4 },
  createGoalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  createGoalTitle: { fontSize: 20, fontWeight: '900', color: colors.text, marginLeft: 10 },
  premiumInput: { backgroundColor: colors.background, borderRadius: 16, paddingHorizontal: 20, height: 56, marginBottom: 15, fontSize: 16, color: colors.text },
  targetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  targetInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 16, paddingHorizontal: 20, height: 56, marginRight: 15 },
  currencyPrefix: { fontSize: 18, fontWeight: 'bold', color: colors.textLight, marginRight: 8 },
  targetInput: { flex: 1, fontSize: 16, color: colors.text },
  premiumCreateBtn: { backgroundColor: colors.primary, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10 },

  goalCard: { backgroundColor: colors.surface, borderRadius: 28, padding: 25, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 15, elevation: 5 },
  goalCardCompleted: { backgroundColor: colors.success + '0A', borderColor: colors.success + '66', borderWidth: 1 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalHeaderLeft: { flexDirection: 'row', flex: 1, alignItems: 'flex-start' },
  checkboxLarge: { marginRight: 15, marginTop: 2 },
  goalHeaderText: { flex: 1 },
  goalTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4 },
  goalDesc: { fontSize: 15, color: colors.textLight, lineHeight: 22 },
  goalDeleteBtn: { padding: 8, backgroundColor: colors.background, borderRadius: 20, marginLeft: 10 },
  completedTitleText: { color: colors.success },
  completedDescText: { color: colors.success, opacity: 0.8 },

  goalProgressSection: { marginTop: 25, backgroundColor: colors.primary + '0D', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '26' },
  goalProgressSectionCompleted: { backgroundColor: colors.success + '1A', borderColor: colors.success + '4D' },
  progressHeader: { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 15 },
  progressAmountSaved: { fontSize: 32, fontWeight: '900', color: colors.primary, letterSpacing: -1 },
  progressAmountTarget: { fontSize: 15, color: colors.textLight, fontWeight: '600', marginTop: 2 },
  
  addFundsBtn: { flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  addFundsText: { color: colors.white, fontWeight: 'bold', marginLeft: 4, fontSize: 15 },
  
  completedBadge: { flexDirection: 'row', backgroundColor: colors.success, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignItems: 'center', shadowColor: colors.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  completedBadgeText: { color: colors.white, fontWeight: '900', marginLeft: 6, fontSize: 13, letterSpacing: 1 },
  
  progressBarTrack: { height: 16, backgroundColor: colors.primary + '26', borderRadius: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 8 },

  overlayContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  logModal: { backgroundColor: colors.surface, padding: 25, borderRadius: 24, width: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  logModalTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 5 },
  logModalSubtitle: { fontSize: 15, color: colors.textLight, marginBottom: 20 },
  logInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 16, paddingHorizontal: 20, height: 60, marginBottom: 25 },
  logInput: { flex: 1, fontSize: 20, color: colors.text, fontWeight: '600' },
  logActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  logCancelBtn: { paddingVertical: 12, paddingHorizontal: 20, marginRight: 10 },
  logCancelText: { color: colors.textLight, fontWeight: 'bold', fontSize: 16 },
  logSubmitBtn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  logSubmitText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
});
