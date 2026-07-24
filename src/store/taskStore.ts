import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from './safeStorage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export type Pillar = {
  id: string;
  name: string;
  isArchived?: boolean;
};

export type Tag = {
  id: string;
  pillarId: string;
  name: string; 
  type: 'earner' | 'burner';
  isArchived?: boolean;
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
  pillars: Pillar[];
  
  // Task Actions
  addTask: (task: Omit<Task, 'id' | 'completed' | 'dateCreated'>) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string, isManual?: boolean) => void;
  moveToIcebox: (id: string) => void;
  activateFromIcebox: (id: string) => void;
  
  // Pillar Actions
  addPillar: (name: string) => void;
  updatePillarName: (id: string, name: string) => void;
  archivePillar: (id: string) => void;
  
  // Tag (Journey) Actions
  addTag: (tag: Omit<Tag, 'id'>) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  archiveTag: (id: string) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],
      pillars: [
        { id: 'office', name: 'Office' },
        { id: 'health', name: 'Health' },
        { id: 'personal', name: 'Personal' }
      ],
      tags: [
        { id: uuidv4(), pillarId: 'office', name: 'Deep Work', type: 'earner' },
        { id: uuidv4(), pillarId: 'health', name: 'Fitness', type: 'earner' },
        { id: uuidv4(), pillarId: 'personal', name: 'Gaming', type: 'burner' }
      ],
      
      addTask: (task) => {
        const id = uuidv4();
        set((state) => ({
          tasks: [...state.tasks, { 
            ...task, 
            id,
            completed: false,
            dateCreated: new Date().toISOString().split('T')[0]
          }]
        }));
        return id;
      },
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id)
      })),
      toggleTask: (id, isManual = true) => set((state) => {
        const task = state.tasks.find(t => t.id === id);
        if (!task) return state;

        const isCompleting = !task.completed;

        if (isManual) {
          const tag = state.tags.find(t => t.id === task.tagId);
          
          // Require stores dynamically inside to avoid circular dependencies if any
          const { useEconomyStore } = require('./economyStore');
          const { useMacroGoalStore } = require('./macroGoalStore');
          
          const economyState = useEconomyStore.getState();
          const macroState = useMacroGoalStore.getState();

          if (isCompleting) {
            // Payout
            if (tag?.type === 'earner') {
              const conversion = economyState.getConversionRate();
              const hoursEarned = Math.round(task.estimatedMinutes * conversion.multiplier);
              economyState.addHours(hoursEarned);
              economyState.incrementStreak();
              economyState.incrementCompletedTasks();

              if (task.macroGoalId) {
                macroState.applyLeafProgress(task.macroGoalId, task.estimatedMinutes);
              }
            } else if (tag?.type === 'burner') {
              economyState.spendHours(task.estimatedMinutes);
            }
          } else {
            // Revert
            if (tag?.type === 'earner') {
              const conversion = economyState.getConversionRate();
              const hoursEarned = Math.round(task.estimatedMinutes * conversion.multiplier);
              economyState.removeHours(hoursEarned);
              economyState.decrementCompletedTasks();

              if (task.macroGoalId) {
                macroState.revokeLeafProgress(task.macroGoalId, task.estimatedMinutes);
              }
            } else if (tag?.type === 'burner') {
              economyState.addHours(task.estimatedMinutes);
            }
          }
        }

        return {
          tasks: state.tasks.map(t => t.id === id ? { ...t, completed: isCompleting } : t)
        };
      }),
      moveToIcebox: (id) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, isIcebox: true } : t)
      })),
      activateFromIcebox: (id) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, isIcebox: false, dateCreated: new Date().toISOString().split('T')[0] } : t)
      })),
      
      // Pillar Actions
      addPillar: (name) => set((state) => {
        const activePillars = state.pillars.filter(p => !p.isArchived);
        if (activePillars.length >= 5) {
          console.warn("Max 5 active pillars allowed.");
          return state; // Do nothing if limit reached
        }
        return {
          pillars: [...state.pillars, { id: uuidv4(), name }]
        };
      }),
      updatePillarName: (id, name) => set((state) => ({
        pillars: state.pillars.map(p => p.id === id ? { ...p, name } : p)
      })),
      archivePillar: (id) => set((state) => ({
        pillars: state.pillars.map(p => p.id === id ? { ...p, isArchived: true } : p)
      })),

      // Tag Actions
      addTag: (tag) => set((state) => ({
        tags: [...state.tags, { ...tag, id: uuidv4() }]
      })),
      updateTag: (id, updates) => set((state) => ({
        tags: state.tags.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      archiveTag: (id) => set((state) => ({
        tags: state.tags.map(t => t.id === id ? { ...t, isArchived: true } : t)
      }))
    }),
    {
      name: 'earned-task-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
