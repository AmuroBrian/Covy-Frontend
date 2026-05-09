import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { getChecklists, createChecklist, deleteChecklist, addChecklistItem, updateChecklistItem, deleteChecklistItem } from '../../api/shared.api';
import { useRealtime } from '../../context/RealtimeContext';

interface ChecklistsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ChecklistsModal({ visible, onClose }: ChecklistsModalProps) {
  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [newItemNames, setNewItemNames] = useState<{ [key: string]: string }>({});
  const { lastSharedUpdate } = useRealtime();

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getChecklists();
      setChecklists(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) fetchData();
  }, [visible, lastSharedUpdate]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      const newList = await createChecklist(newListName.trim());
      setChecklists([newList, ...checklists]);
      setNewListName('');
    } catch (err) {
      Alert.alert('Error', 'Failed to create list');
    }
  };

  const handleDeleteList = async (id: string) => {
    Alert.alert('Delete List', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteChecklist(id);
          setChecklists(checklists.filter(c => c.id !== id));
        } catch (err) {
          Alert.alert('Error', 'Failed to delete list');
        }
      }}
    ]);
  };

  const handleAddItem = async (checklistId: string) => {
    const title = newItemNames[checklistId]?.trim();
    if (!title) return;
    try {
      const newItem = await addChecklistItem(checklistId, title);
      setChecklists(prev => prev.map(c => {
        if (c.id === checklistId) {
          return { ...c, items: [...(c.items || []), newItem] };
        }
        return c;
      }));
      setNewItemNames({ ...newItemNames, [checklistId]: '' });
    } catch (err) {
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const handleToggleItem = async (checklistId: string, item: any) => {
    try {
      // Optimistic update
      setChecklists(prev => prev.map(c => {
        if (c.id === checklistId) {
          return { ...c, items: c.items.map((i: any) => i.id === item.id ? { ...i, isCompleted: !i.isCompleted } : i) };
        }
        return c;
      }));
      await updateChecklistItem(item.id, { isCompleted: !item.isCompleted });
    } catch (err) {
      fetchData(); // revert on fail
    }
  };

  const handleDeleteItem = async (checklistId: string, itemId: string) => {
    try {
      await deleteChecklistItem(itemId);
      setChecklists(prev => prev.map(c => {
        if (c.id === checklistId) {
          return { ...c, items: c.items.filter((i: any) => i.id !== itemId) };
        }
        return c;
      }));
    } catch (err) {
      Alert.alert('Error', 'Failed to delete item');
    }
  };

  const renderChecklist = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <TouchableOpacity onPress={() => handleDeleteList(item.id)}>
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.itemsContainer}>
        {item.items?.map((task: any) => (
          <View key={task.id} style={styles.taskRow}>
            <TouchableOpacity onPress={() => handleToggleItem(item.id, task)} style={styles.checkbox}>
              <Ionicons name={task.isCompleted ? "checkmark-circle" : "ellipse-outline"} size={24} color={task.isCompleted ? Colors.success : Colors.textLight} />
            </TouchableOpacity>
            <Text style={[styles.taskText, task.isCompleted && styles.taskCompleted]}>{task.title}</Text>
            <TouchableOpacity onPress={() => handleDeleteItem(item.id, task.id)}>
              <Ionicons name="close" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.addTaskContainer}>
        <TextInput
          style={styles.addTaskInput}
          placeholder="Add new item..."
          placeholderTextColor="#A0A0A0"
          value={newItemNames[item.id] || ''}
          onChangeText={(text) => setNewItemNames({ ...newItemNames, [item.id]: text })}
          onSubmitEditing={() => handleAddItem(item.id)}
        />
        <TouchableOpacity style={styles.addButton} onPress={() => handleAddItem(item.id)}>
          <Ionicons name="add" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checklists</Text>
          <View style={{ width: 28 }} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={checklists}
            keyExtractor={item => item.id}
            renderItem={renderChecklist}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.createContainer}>
                <TextInput
                  style={styles.createInput}
                  placeholder="New Checklist Title..."
                  placeholderTextColor="#A0A0A0"
                  value={newListName}
                  onChangeText={setNewListName}
                  onSubmitEditing={handleCreateList}
                />
                <TouchableOpacity style={styles.createBtn} onPress={handleCreateList}>
                  <Text style={styles.createBtnText}>Create</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white },
  closeBtn: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  listContent: { padding: 20 },
  createContainer: { flexDirection: 'row', marginBottom: 20 },
  createInput: { flex: 1, backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 15, height: 48, marginRight: 10, borderWidth: 1, borderColor: Colors.border },
  createBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  createBtnText: { color: Colors.white, fontWeight: 'bold' },
  card: { backgroundColor: Colors.white, borderRadius: 15, padding: 15, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  itemsContainer: { marginBottom: 15 },
  taskRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  checkbox: { marginRight: 10 },
  taskText: { flex: 1, fontSize: 16, color: Colors.text },
  taskCompleted: { textDecorationLine: 'line-through', color: Colors.textLight },
  addTaskContainer: { flexDirection: 'row', alignItems: 'center' },
  addTaskInput: { flex: 1, backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 15, height: 40, marginRight: 10 },
  addButton: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }
});
