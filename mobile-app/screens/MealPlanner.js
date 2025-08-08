// mobile-app/screens/MealPlanner.js

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { DataContext } from '../context/DataContext';
import { Ionicons } from '@expo/vector-icons';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const { width } = Dimensions.get('window');
const MEAL_RATIOS = { breakfast: 0.25, lunch: 0.35, dinner: 0.40 };

// Build a 7-day plan based on macros
const buildDefaultPlan = (m) => {
  const p = {};
  DAYS.forEach((_, i) => {
    p[i] = {};
    Object.entries(MEAL_RATIOS).forEach(([meal, ratio]) => {
      p[i][meal] = {
        name: meal[0].toUpperCase() + meal.slice(1),
        cals: Math.round(m.calories * ratio),
        protein: Math.round(m.protein * ratio * 10) / 10,
        carbs: Math.round(m.carbs * ratio * 10) / 10,
        fat: Math.round(m.fat * ratio * 10) / 10,
      };
    });
  });
  return p;
};

export default function MealPlanner() {
  const { user } = useContext(AuthContext);
  const { mealPlans, saveMealPlan, syncStatus } = useContext(DataContext);
  const PLAN_KEY = `@${user.email}:meal_plan`;
  const MACRO_KEY = `@${user.email}:macro_targets`;
  const FAV_KEY = `@${user.email}:meal_favorites`;

  const [macros, setMacros] = useState({ calories: 1, protein: 1, carbs: 1, fat: 1 });
  const [plan, setPlan] = useState(buildDefaultPlan(macros));
  const [favorites, setFavorites] = useState([]);
  const [modal, setModal] = useState({ visible: false, day: null, meal: null });
  const [mealName, setMealName] = useState('');
  const [mealCals, setMealCals] = useState('');
  const [mealProt, setMealProt] = useState('');
  const [mealCarb, setMealCarb] = useState('');
  const [mealFat, setMealFat] = useState('');

  useEffect(() => {
    (async () => {
      // Load macros
      const rawMacro = await AsyncStorage.getItem(MACRO_KEY);
      const m = rawMacro ? JSON.parse(rawMacro) : macros;
      setMacros(m);

      // Load or init plan from DataContext
      if (mealPlans.plan) {
        setPlan(mealPlans.plan);
      } else {
        const defaults = buildDefaultPlan(m);
        const mealData = { plan: defaults, macros: m, favorites: [] };
        await saveMealPlan(mealData);
        setPlan(defaults);
      }

      // Load favorites from DataContext
      if (mealPlans.favorites) {
        setFavorites(mealPlans.favorites);
      }
    })();
  }, [mealPlans, saveMealPlan]);

  const getTotals = (i) => {
    const { breakfast, lunch, dinner } = plan[i];
    return {
      cals: breakfast.cals + lunch.cals + dinner.cals,
      protein: breakfast.protein + lunch.protein + dinner.protein,
      carbs: breakfast.carbs + lunch.carbs + dinner.carbs,
      fat: breakfast.fat + lunch.fat + dinner.fat,
    };
  };

  const weeklyTotal = DAYS.reduce((sum, _, i) => sum + getTotals(i).cals, 0);
  const dailyTarget = macros.calories;

  const clearPlan = () => {
    Alert.alert(
      'Reset Meal Plan?',
      'This will overwrite your week with defaults based on your current macros.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const rawMacro = await AsyncStorage.getItem(MACRO_KEY);
              const m = rawMacro ? JSON.parse(rawMacro) : macros;
              setMacros(m);
              const def = buildDefaultPlan(m);
              const mealData = { ...mealPlans, plan: def, macros: m };
              await saveMealPlan(mealData);
              setPlan(def);
            } catch (error) {
              Alert.alert('Error', 'Failed to reset meal plan');
            }
          },
        },
      ]
    );
  };

  const openModal = (dayIdx, mealType) => {
    const itm = plan[dayIdx][mealType];
    setMealName(itm.name);
    setMealCals(String(itm.cals));
    setMealProt(String(itm.protein));
    setMealCarb(String(itm.carbs));
    setMealFat(String(itm.fat));
    setModal({ visible: true, day: dayIdx, meal: mealType });
  };

  const saveMeal = async () => {
    if (!mealName.trim()) return Alert.alert('Please enter a meal name.');
    const { day, meal } = modal;
    const updated = { ...plan };
    updated[day][meal] = {
      name: mealName.trim(),
      cals: parseInt(mealCals, 10) || 0,
      protein: parseInt(mealProt, 10) || 0,
      carbs: parseInt(mealCarb, 10) || 0,
      fat: parseInt(mealFat, 10) || 0,
    };
    
    try {
      const mealData = { ...mealPlans, plan: updated };
      await saveMealPlan(mealData);
      setPlan(updated);
      setModal({ visible: false, day: null, meal: null });
    } catch (error) {
      Alert.alert('Error', 'Failed to save meal');
    }
  };

  const toggleFavorite = async () => {
    const key = mealName.trim();
    if (!key) return;
    const exists = favorites.some((f) => f.name === key);
    const newFavs = exists
      ? favorites.filter((f) => f.name !== key)
      : [
          ...favorites,
          {
            name: key,
            cals: parseInt(mealCals, 10) || 0,
            protein: parseInt(mealProt, 10) || 0,
            carbs: parseInt(mealCarb, 10) || 0,
            fat: parseInt(mealFat, 10) || 0,
          },
        ];
    
    try {
      const mealData = { ...mealPlans, favorites: newFavs };
      await saveMealPlan(mealData);
      setFavorites(newFavs);
    } catch (error) {
      console.warn('Failed to save favorites');
    }
  };

  // Map labels to the correct key in pct
  const progressKeys = ['cals', 'protein', 'carbs', 'fat'];
  const progressLabels = ['Calories', 'Protein', 'Carbohydrates', 'Fat'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meal Planner</Text>
        <View style={styles.syncIndicator}>
          <Ionicons 
            name={syncStatus === 'synced' ? 'cloud-done' : syncStatus === 'syncing' ? 'cloud-upload' : 'cloud-offline'} 
            size={16} 
            color={syncStatus === 'synced' ? '#4CAF50' : syncStatus === 'syncing' ? '#FF9800' : '#757575'} 
          />
          <Text style={[styles.syncText, { color: syncStatus === 'synced' ? '#4CAF50' : syncStatus === 'syncing' ? '#FF9800' : '#757575' }]}>
            {syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Offline'}
          </Text>
        </View>
      </View>
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>Weekly Total: {weeklyTotal} kcal</Text>
        <Text style={[styles.headerText, { marginLeft: 20 }]}>Daily Target: {dailyTarget} kcal</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={clearPlan}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {DAYS.map((day, idx) => {
          const t = getTotals(idx);
          const pct = {
            cals: Math.min(t.cals / dailyTarget, 1),
            protein: Math.min(t.protein / macros.protein, 1),
            carbs: Math.min(t.carbs / macros.carbs, 1),
            fat: Math.min(t.fat / macros.fat, 1),
          };

          return (
            <View key={idx} style={styles.card}>
              <Text style={styles.dayHeader}>{day}</Text>

              <View style={styles.chipRow}>
                <Text style={styles.chip}>{t.cals}/{dailyTarget} kcal</Text>
                <Text style={styles.chip}>{t.protein}/{macros.protein}g P</Text>
                <Text style={styles.chip}>{t.carbs}/{macros.carbs}g C</Text>
                <Text style={styles.chip}>{t.fat}/{macros.fat}g F</Text>
              </View>

              {['breakfast', 'lunch', 'dinner'].map((me) => {
                const itm = plan[idx][me];
                return (
                  <TouchableOpacity
                    key={me}
                    style={styles.mealRow}
                    onPress={() => openModal(idx, me)}
                  >
                    <Text style={styles.mealLabel}>
                      {me.charAt(0).toUpperCase() + me.slice(1)}
                    </Text>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName}>{itm.name}</Text>
                      <Text style={styles.nutriText}>
                        {itm.cals} kcal • {itm.protein}g P • {itm.carbs}g C • {itm.fat}g F
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#467fd0" />
                  </TouchableOpacity>
                );
              })}

              <View style={styles.progressGroup}>
                {progressKeys.map((key, i) => (
                  <View key={key} style={{ marginTop: 8 }}>
                    <Text style={styles.progressLabel}>{progressLabels[i]}</Text>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${pct[key] * 100}%` }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal transparent visible={modal.visible} animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {`${DAYS[modal.day]} – ${modal.meal?.charAt(0).toUpperCase() + modal.meal?.slice(1)}`}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.favScroll}>
              {favorites.map((f, index) => (
                <TouchableOpacity
                  key={`${f.name}-${index}`}
                  style={styles.favChip}
                  onPress={() => {
                    setMealName(f.name);
                    setMealCals(String(f.cals));
                    setMealProt(String(f.protein));
                    setMealCarb(String(f.carbs));
                    setMealFat(String(f.fat));
                  }}
                >
                  <Ionicons name="star" size={16} color="#fc0" />
                  <Text style={styles.favText}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.favToggle} onPress={toggleFavorite}>
              <Ionicons
                name={favorites.some((f) => f.name === mealName) ? 'star' : 'star-outline'}
                size={24}
                color="#fc0"
              />
              <Text style={styles.favToggleText}>
                {favorites.some((f) => f.name === mealName) ? 'Unfavorite' : 'Favorite'}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Meal name"
              placeholderTextColor="#999"
              value={mealName}
              onChangeText={setMealName}
            />
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, styles.flex]}
                placeholder={`Calories: ${Math.round(dailyTarget * MEAL_RATIOS[modal.meal] || 0)}`}
                placeholderTextColor="#999"
                value={mealCals}
                onChangeText={setMealCals}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.flex]}
                placeholder={`Protein: ${Math.round(macros.protein * MEAL_RATIOS[modal.meal] || 0)}`}
                placeholderTextColor="#999"
                value={mealProt}
                onChangeText={setMealProt}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, styles.flex]}
                placeholder={`Carbohydrates: ${Math.round(macros.carbs * MEAL_RATIOS[modal.meal] || 0)}`}
                placeholderTextColor="#999"
                value={mealCarb}
                onChangeText={setMealCarb}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.flex]}
                placeholder={`Fat: ${Math.round(macros.fat * MEAL_RATIOS[modal.meal] || 0)}`}
                placeholderTextColor="#999"
                value={mealFat}
                onChangeText={setMealFat}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnSave} onPress={saveMeal}>
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setModal({ visible: false, day: null, meal: null })}
              >
                <Text style={[styles.btnText, { color: '#e33' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const BAR_HEIGHT = 6;
const CARD_WIDTH = width - 32;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafd', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#467fd0' },
  syncIndicator: { flexDirection: 'row', alignItems: 'center' },
  syncText: { fontSize: 12, marginLeft: 4, fontWeight: '500' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerText: { fontSize: 16, color: '#333' },
  clearBtn: { marginLeft: 16, backgroundColor: '#e33', padding: 6, borderRadius: 6 },

  scroll: { paddingBottom: 24 },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
  },
  dayHeader: { fontSize: 18, fontWeight: '600', color: '#467fd0', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: {
    backgroundColor: '#eef5fc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 6,
    fontSize: 12,
    color: '#467fd0',
  },

  mealRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mealLabel: { width: 80, fontSize: 14, fontWeight: '600', color: '#333' },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 14, color: '#222' },
  nutriText: { fontSize: 12, color: '#666', marginTop: 2 },

  progressGroup: { marginTop: 12 },
  progressLabel: { fontSize: 12, color: '#555', marginTop: 8 },
  barBg: {
    height: BAR_HEIGHT,
    backgroundColor: '#eee',
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  barFill: { height: BAR_HEIGHT, backgroundColor: '#467fd0' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 12 },

  favScroll: { maxHeight: 40, marginBottom: 12 },
  favChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8dc',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  favText: { marginLeft: 4, fontSize: 13, color: '#444' },

  favToggle: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginBottom: 12 },
  favToggleText: { marginLeft: 6, fontSize: 14, color: '#444' },

  input: {
    height: 44,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
    color: '#333',
  },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  flex: { flex: 1, marginRight: 8 },

  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  btnSave: { backgroundColor: '#467fd0', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  btnCancel: { paddingVertical: 10, paddingHorizontal: 24 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
