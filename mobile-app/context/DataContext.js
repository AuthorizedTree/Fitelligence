// mobile-app/context/DataContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { AuthContext } from './AuthContext';

export const DataContext = createContext({
  routines: [],
  workoutLogs: [],
  chatLogs: [],
  mealPlans: {},
  addRoutine: async () => {},
  deleteRoutine: async () => {},
  logWorkout: async () => {},
  clearLogs: async () => {},
  saveChatLogs: async () => {},
  clearChatLogs: async () => {},
  saveMealPlan: async () => {},
  syncStatus: 'offline', // 'offline', 'syncing', 'synced'
});

export const DataProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [routines, setRoutines] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [chatLogs, setChatLogs] = useState([]);
  const [mealPlans, setMealPlans] = useState({});
  const [syncStatus, setSyncStatus] = useState('offline');

  // Local storage keys
  const ROUTINES_KEY = user ? `@${user.email}:routines` : null;
  const LOGS_KEY = user ? `@${user.email}:workout_logs` : null;
  const CHAT_KEY = user ? `@${user.email}:chat_messages` : null;
  const MEAL_PLAN_KEY = user ? `@${user.email}:meal_plan` : null;

  // Firestore collections
  const getUserRoutinesRef = () => user ? db.collection('users').doc(user.uid).collection('routines') : null;
  const getUserLogsRef = () => user ? db.collection('users').doc(user.uid).collection('workoutLogs') : null;
  const getUserChatRef = () => user ? db.collection('users').doc(user.uid).collection('chatLogs') : null;
  const getUserMealPlanRef = () => user ? db.collection('users').doc(user.uid).collection('mealPlans') : null;

  // Load data from AsyncStorage on mount and user change
  useEffect(() => {
    if (!user || !ROUTINES_KEY || !LOGS_KEY || !CHAT_KEY || !MEAL_PLAN_KEY) return;

    const loadLocalData = async () => {
      try {
        // Load routines
        const routinesRaw = await AsyncStorage.getItem(ROUTINES_KEY);
        const localRoutines = routinesRaw ? JSON.parse(routinesRaw) : [];
        setRoutines(localRoutines);

        // Load workout logs
        const logsRaw = await AsyncStorage.getItem(LOGS_KEY);
        const localLogs = logsRaw ? JSON.parse(logsRaw) : [];
        setWorkoutLogs(localLogs);

        // Load chat logs
        const chatRaw = await AsyncStorage.getItem(CHAT_KEY);
        const localChat = chatRaw ? JSON.parse(chatRaw) : [];
        setChatLogs(localChat);

        // Load meal plans
        const mealRaw = await AsyncStorage.getItem(MEAL_PLAN_KEY);
        const localMeals = mealRaw ? JSON.parse(mealRaw) : {};
        setMealPlans(localMeals);
      } catch (error) {
        console.error('Error loading local data:', error);
      }
    };

    loadLocalData();
  }, [user, ROUTINES_KEY, LOGS_KEY, CHAT_KEY, MEAL_PLAN_KEY]);

  // Sync with Firestore when user is authenticated
  useEffect(() => {
    if (!user) {
      setSyncStatus('offline');
      return;
    }

    const syncWithFirestore = async () => {
      try {
        setSyncStatus('syncing');

        // Check network connectivity by testing Firestore
        await db.enableNetwork();

        // Sync routines
        await syncRoutines();
        
        // Sync workout logs
        await syncWorkoutLogs();

        // Sync chat logs
        await syncChatLogs();

        // Sync meal plans
        await syncMealPlans();

        setSyncStatus('synced');
      } catch (error) {
        console.error('Firestore sync error:', error);
        setSyncStatus('offline');
        
        // Try to work offline
        try {
          await db.disableNetwork();
        } catch (disableError) {
          console.error('Failed to disable network:', disableError);
        }
      }
    };

    // Initial sync with delay to allow for auth state to settle
    const timeoutId = setTimeout(() => {
      syncWithFirestore();
    }, 1000);

    // Set up real-time listeners
    const routinesUnsubscribe = setupRoutinesListener();
    const logsUnsubscribe = setupLogsListener();
    const chatUnsubscribe = setupChatListener();
    const mealPlanUnsubscribe = setupMealPlanListener();

    return () => {
      clearTimeout(timeoutId);
      routinesUnsubscribe?.();
      logsUnsubscribe?.();
      chatUnsubscribe?.();
      mealPlanUnsubscribe?.();
    };
  }, [user]);

  const syncRoutines = async () => {
    if (!user) return;

    try {
      const routinesRef = getUserRoutinesRef();
      if (!routinesRef) return;

      // Get local routines
      const localRoutines = routines.length > 0 ? routines : JSON.parse(await AsyncStorage.getItem(ROUTINES_KEY) || '[]');
      
      // Get remote routines
      const snapshot = await routinesRef.get();
      const remoteRoutines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Merge data (local takes precedence if both exist)
      const mergedRoutines = [...localRoutines];
      
      for (const remoteRoutine of remoteRoutines) {
        const existsLocally = localRoutines.find(r => r.name === remoteRoutine.name);
        if (!existsLocally) {
          mergedRoutines.push(remoteRoutine);
        }
      }

      // Upload any local-only routines to Firestore
      for (const localRoutine of localRoutines) {
        const existsRemotely = remoteRoutines.find(r => r.name === localRoutine.name);
        if (!existsRemotely) {
          await routinesRef.add({
            ...localRoutine,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      // Update local state and storage
      setRoutines(mergedRoutines);
      await AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(mergedRoutines));

    } catch (error) {
      console.error('Error syncing routines:', error);
    }
  };

  const syncWorkoutLogs = async () => {
    if (!user) return;

    try {
      const logsRef = getUserLogsRef();
      if (!logsRef) return;

      // Get local logs
      const localLogs = workoutLogs.length > 0 ? workoutLogs : JSON.parse(await AsyncStorage.getItem(LOGS_KEY) || '[]');
      
      // Get remote logs
      const snapshot = await logsRef.get();
      const remoteLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Merge data (combine both, remove duplicates)
      const mergedLogs = [...localLogs];
      
      for (const remoteLog of remoteLogs) {
        const isDuplicate = localLogs.find(l => 
          l.exercise === remoteLog.exercise && 
          l.date === remoteLog.date && 
          l.reps === remoteLog.reps
        );
        if (!isDuplicate) {
          mergedLogs.push(remoteLog);
        }
      }

      // Upload any local-only logs to Firestore
      for (const localLog of localLogs) {
        const existsRemotely = remoteLogs.find(r => 
          r.exercise === localLog.exercise && 
          r.date === localLog.date && 
          r.reps === localLog.reps
        );
        if (!existsRemotely) {
          await logsRef.add({
            ...localLog,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Update local state and storage
      setWorkoutLogs(mergedLogs);
      await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(mergedLogs));

    } catch (error) {
      console.error('Error syncing workout logs:', error);
    }
  };

  const setupRoutinesListener = () => {
    if (!user) return null;

    const routinesRef = getUserRoutinesRef();
    if (!routinesRef) return null;

    return routinesRef.onSnapshot((snapshot) => {
      const remoteRoutines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Update local state if different from remote
      setRoutines(prevRoutines => {
        const hasChanges = JSON.stringify(prevRoutines) !== JSON.stringify(remoteRoutines);
        if (hasChanges) {
          AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(remoteRoutines));
          return remoteRoutines;
        }
        return prevRoutines;
      });
    }, (error) => {
      console.error('Routines listener error:', error);
    });
  };

  const setupLogsListener = () => {
    if (!user) return null;

    const logsRef = getUserLogsRef();
    if (!logsRef) return null;

    return logsRef.onSnapshot((snapshot) => {
      const remoteLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Update local state if different from remote
      setWorkoutLogs(prevLogs => {
        const hasChanges = JSON.stringify(prevLogs) !== JSON.stringify(remoteLogs);
        if (hasChanges) {
          AsyncStorage.setItem(LOGS_KEY, JSON.stringify(remoteLogs));
          return remoteLogs;
        }
        return prevLogs;
      });
    }, (error) => {
      console.error('Workout logs listener error:', error);
    });
  };

  const syncChatLogs = async () => {
    if (!user) return;

    try {
      const chatRef = getUserChatRef();
      if (!chatRef) return;

      // Get local chat logs
      const localChats = chatLogs.length > 0 ? chatLogs : JSON.parse(await AsyncStorage.getItem(CHAT_KEY) || '[]');
      
      // Get remote chat logs
      const snapshot = await chatRef.get();
      const remoteChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Merge data (combine both, remove duplicates)
      const mergedChats = [...localChats];
      
      for (const remoteChat of remoteChats) {
        const isDuplicate = localChats.find(l => 
          l.id === remoteChat.id || 
          (l.text === remoteChat.text && l.sender === remoteChat.sender) ||
          // Special handling for greeting messages
          (l.sender === 'bot' && remoteChat.sender === 'bot' && 
           (l.text.includes('Welcome to FitnessCoach') || remoteChat.text.includes('Welcome to FitnessCoach')))
        );
        if (!isDuplicate) {
          mergedChats.push(remoteChat);
        }
      }

      // Upload any local-only chats to Firestore
      for (const localChat of localChats) {
        const existsRemotely = remoteChats.find(r => 
          r.id === localChat.id || 
          (r.text === localChat.text && r.sender === localChat.sender) ||
          // Special handling for greeting messages
          (localChat.sender === 'bot' && r.sender === 'bot' && 
           (localChat.text.includes('Welcome to FitnessCoach') || r.text.includes('Welcome to FitnessCoach')))
        );
        if (!existsRemotely) {
          await chatRef.add({
            ...localChat,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Update local state and storage
      setChatLogs(mergedChats);
      await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(mergedChats));

    } catch (error) {
      console.error('Error syncing chat logs:', error);
    }
  };

  const syncMealPlans = async () => {
    if (!user) return;

    try {
      const mealPlanRef = getUserMealPlanRef();
      if (!mealPlanRef) return;

      // Get local meal plans
      const localMeals = Object.keys(mealPlans).length > 0 ? mealPlans : JSON.parse(await AsyncStorage.getItem(MEAL_PLAN_KEY) || '{}');
      
      // Get remote meal plans
      const snapshot = await mealPlanRef.get();
      const remoteMeals = {};
      snapshot.docs.forEach(doc => {
        remoteMeals[doc.id] = doc.data();
      });

      // Merge data (local takes precedence if both exist)
      const mergedMeals = { ...remoteMeals, ...localMeals };

      // Upload any local-only meal plans to Firestore
      for (const [key, value] of Object.entries(localMeals)) {
        if (!remoteMeals[key]) {
          await mealPlanRef.doc(key).set({
            ...value,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // Update local state and storage
      setMealPlans(mergedMeals);
      await AsyncStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(mergedMeals));

    } catch (error) {
      console.error('Error syncing meal plans:', error);
    }
  };

  const setupChatListener = () => {
    if (!user) return null;

    const chatRef = getUserChatRef();
    if (!chatRef) return null;

    return chatRef.onSnapshot((snapshot) => {
      const remoteChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Update local state if different from remote
      setChatLogs(prevChats => {
        const hasChanges = JSON.stringify(prevChats) !== JSON.stringify(remoteChats);
        if (hasChanges) {
          AsyncStorage.setItem(CHAT_KEY, JSON.stringify(remoteChats));
          return remoteChats;
        }
        return prevChats;
      });
    }, (error) => {
      console.error('Chat logs listener error:', error);
    });
  };

  const setupMealPlanListener = () => {
    if (!user) return null;

    const mealPlanRef = getUserMealPlanRef();
    if (!mealPlanRef) return null;

    return mealPlanRef.onSnapshot((snapshot) => {
      const remoteMeals = {};
      snapshot.docs.forEach(doc => {
        remoteMeals[doc.id] = doc.data();
      });
      
      // Update local state if different from remote
      setMealPlans(prevMeals => {
        const hasChanges = JSON.stringify(prevMeals) !== JSON.stringify(remoteMeals);
        if (hasChanges) {
          AsyncStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(remoteMeals));
          return remoteMeals;
        }
        return prevMeals;
      });
    }, (error) => {
      console.error('Meal plan listener error:', error);
    });
  };

  const addRoutine = async (routine) => {
    try {
      const newRoutine = {
        ...routine,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add to local state and storage immediately for offline support
      const updatedRoutines = [...routines, newRoutine];
      setRoutines(updatedRoutines);
      await AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(updatedRoutines));

      // Try to add to Firestore if user is authenticated
      if (user && syncStatus !== 'offline') {
        try {
          const routinesRef = getUserRoutinesRef();
          if (routinesRef) {
            await routinesRef.add(newRoutine);
            setSyncStatus('synced');
          }
        } catch (firestoreError) {
          console.warn('Failed to sync routine to Firestore, saved locally:', firestoreError);
          setSyncStatus('offline');
        }
      }

    } catch (error) {
      console.error('Error adding routine:', error);
      throw error;
    }
  };

  const deleteRoutine = async (routineName) => {
    try {
      // Remove from local state and storage immediately for offline support
      const updatedRoutines = routines.filter(r => r.name !== routineName);
      setRoutines(updatedRoutines);
      await AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(updatedRoutines));

      // Try to remove from Firestore if user is authenticated
      if (user && syncStatus !== 'offline') {
        try {
          const routinesRef = getUserRoutinesRef();
          if (routinesRef) {
            const snapshot = await routinesRef.where('name', '==', routineName).get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            setSyncStatus('synced');
          }
        } catch (firestoreError) {
          console.warn('Failed to delete routine from Firestore, removed locally:', firestoreError);
          setSyncStatus('offline');
        }
      }

    } catch (error) {
      console.error('Error deleting routine:', error);
      throw error;
    }
  };

  const logWorkout = async (logs) => {
    try {
      const newLogs = logs.map(log => ({
        ...log,
        createdAt: new Date().toISOString()
      }));

      // Add to local state and storage immediately for offline support
      const updatedLogs = [...workoutLogs, ...newLogs];
      setWorkoutLogs(updatedLogs);
      await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));

      // Try to add to Firestore if user is authenticated
      if (user && syncStatus !== 'offline') {
        try {
          const logsRef = getUserLogsRef();
          if (logsRef) {
            const batch = db.batch();
            newLogs.forEach(log => {
              const docRef = logsRef.doc();
              batch.set(docRef, log);
            });
            await batch.commit();
            setSyncStatus('synced');
          }
        } catch (firestoreError) {
          console.warn('Failed to sync workout logs to Firestore, saved locally:', firestoreError);
          setSyncStatus('offline');
        }
      }

    } catch (error) {
      console.error('Error logging workout:', error);
      throw error;
    }
  };

  const clearLogs = async () => {
    try {
      // Clear local state and storage immediately for offline support
      setWorkoutLogs([]);
      await AsyncStorage.removeItem(LOGS_KEY);

      // Try to clear from Firestore if user is authenticated
      if (user && syncStatus !== 'offline') {
        try {
          const logsRef = getUserLogsRef();
          if (logsRef) {
            const snapshot = await logsRef.get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            setSyncStatus('synced');
          }
        } catch (firestoreError) {
          console.warn('Failed to clear logs from Firestore, cleared locally:', firestoreError);
          setSyncStatus('offline');
        }
      }

    } catch (error) {
      console.error('Error clearing logs:', error);
      throw error;
    }
  };

  const saveChatLogs = async (messages) => {
    try {
      // Add to local state and storage immediately for offline support
      setChatLogs(messages);
      await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(messages));

      // Try to add to Firestore if user is authenticated
      if (user && syncStatus !== 'offline') {
        try {
          const chatRef = getUserChatRef();
          if (chatRef) {
            // Clear existing chat logs and add new ones
            const snapshot = await chatRef.get();
            const batch = db.batch();
            
            // Delete existing messages
            snapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            
            // Add new messages
            messages.forEach(message => {
              const docRef = chatRef.doc();
              batch.set(docRef, {
                ...message,
                createdAt: new Date().toISOString()
              });
            });
            
            await batch.commit();
            setSyncStatus('synced');
          }
        } catch (firestoreError) {
          console.warn('Failed to sync chat logs to Firestore, saved locally:', firestoreError);
          setSyncStatus('offline');
        }
      }

    } catch (error) {
      console.error('Error saving chat logs:', error);
      throw error;
    }
  };

  const clearChatLogs = async () => {
    try {
      // Clear local state and storage immediately for offline support
      setChatLogs([]);
      await AsyncStorage.setItem(CHAT_KEY, JSON.stringify([]));

      // Try to clear from Firestore if user is authenticated
      if (user && syncStatus !== 'offline') {
        try {
          const chatRef = getUserChatRef();
          if (chatRef) {
            const snapshot = await chatRef.get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            setSyncStatus('synced');
          }
        } catch (firestoreError) {
          console.warn('Failed to clear chat logs from Firestore, cleared locally:', firestoreError);
          setSyncStatus('offline');
        }
      }

    } catch (error) {
      console.error('Error clearing chat logs:', error);
      throw error;
    }
  };

  const saveMealPlan = async (planData) => {
    try {
      // Add to local state and storage immediately for offline support
      setMealPlans(planData);
      await AsyncStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(planData));

      // Try to add to Firestore if user is authenticated
      if (user && syncStatus !== 'offline') {
        try {
          const mealPlanRef = getUserMealPlanRef();
          if (mealPlanRef) {
            for (const [key, value] of Object.entries(planData)) {
              await mealPlanRef.doc(key).set({
                ...value,
                updatedAt: new Date().toISOString()
              });
            }
            setSyncStatus('synced');
          }
        } catch (firestoreError) {
          console.warn('Failed to sync meal plan to Firestore, saved locally:', firestoreError);
          setSyncStatus('offline');
        }
      }

    } catch (error) {
      console.error('Error saving meal plan:', error);
      throw error;
    }
  };

  return (
    <DataContext.Provider value={{
      routines,
      workoutLogs,
      chatLogs,
      mealPlans,
      addRoutine,
      deleteRoutine,
      logWorkout,
      clearLogs,
      saveChatLogs,
      clearChatLogs,
      saveMealPlan,
      syncStatus,
    }}>
      {children}
    </DataContext.Provider>
  );
};