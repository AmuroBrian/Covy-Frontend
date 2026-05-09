import api from './axios';

// ==========================================
// Checklists
// ==========================================

export const getChecklists = async () => {
  const response = await api.get('/checklists');
  return response.data;
};

export const createChecklist = async (title: string) => {
  const response = await api.post('/checklists', { title });
  return response.data;
};

export const deleteChecklist = async (id: string) => {
  const response = await api.delete(`/checklists/${id}`);
  return response.data;
};

export const addChecklistItem = async (checklistId: string, title: string, assignedToId?: string, dueDate?: string) => {
  const response = await api.post(`/checklists/${checklistId}/items`, { title, assignedToId, dueDate });
  return response.data;
};

export const updateChecklistItem = async (itemId: string, updates: { isCompleted?: boolean; title?: string; assignedToId?: string; dueDate?: string }) => {
  const response = await api.patch(`/checklists/items/${itemId}`, updates);
  return response.data;
};

export const deleteChecklistItem = async (itemId: string) => {
  const response = await api.delete(`/checklists/items/${itemId}`);
  return response.data;
};

// ==========================================
// Goals
// ==========================================

export const getGoals = async () => {
  const response = await api.get('/goals');
  return response.data;
};

export const createGoal = async (title: string, description?: string, targetDate?: string, targetAmount?: number) => {
  const response = await api.post('/goals', { title, description, targetDate, targetAmount });
  return response.data;
};

export const updateGoal = async (id: string, updates: { title?: string; description?: string; isCompleted?: boolean; targetDate?: string; progress?: number; targetAmount?: number }) => {
  const response = await api.patch(`/goals/${id}`, updates);
  return response.data;
};

export const deleteGoal = async (id: string) => {
  const response = await api.delete(`/goals/${id}`);
  return response.data;
};

