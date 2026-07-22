import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from './safeStorage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export type Bucket = 'office' | 'health' | 'personal';

export type Tag = {
  id: string;
  bucket: Bucket;
  name: string; 
  type: 'earner' | 'burner';
}

export type Task = {
  id: string;
  title: string;
  tagId: string;
  macroGoalId?: string;
  estimatedMinutes: number; 
  completed: boolean;
  isIcebox: boolean;
  dateCreated: string;
}

interface TaskState {
  tasks: Task[];
  tags: Tag[];
  addTask: (task: Omit<Task, 'id' | 'completed' | 'dateCreated'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  moveToIcebox: (id: string) => void;
  activateFromIcebox: (id: string) => void;
  addTag: (tag: Omit<Tag, 'id'>) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],
      tags: [
        { id: uuidv4(), bucket: 'office', name: 'Deep Work', type: 'earner' },
        { id: uuidv4(), bucket: 'health', name: 'Fitness', type: 'earner' },
        { id: uuidv4(), bucket: 'personal', name: 'Gaming', type: 'burner' }
      ],
      addTask: (task) => set((state) => ({
        tasks: [...state.tasks, { 
          ...task, 
          id: uuidv4(),
          completed: false,
          dateCreated: new Date().toISOString().split('T')[0]
        }]
      })),
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id)
      })),
      toggleTask: (id) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      })),
      moveToIcebox: (id) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, isIcebox: true } : t)
      })),
      activateFromIcebox: (id) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, isIcebox: false, dateCreated: new Date().toISOString().split('T')[0] } : t)
      })),
      addTag: (tag) => set((state) => ({
        tags: [...state.tags, { ...tag, id: uuidv4() }]
      }))
    }),
    {
      name: 'earned-task-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
