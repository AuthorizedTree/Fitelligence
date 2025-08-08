// mobile-app/screens/Exercises.js

import React, { useState, useContext, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

const EXERCISES = [
  "Push-ups","Squats","Lunges","Burpees","Jumping Jacks","Mountain Climbers","Plank",
  "Side Plank","Crunches","Sit-ups","Leg Raises","Russian Twists","Bicycle Crunches",
  "Tricep Dips","Bench Press","Overhead Press","Bicep Curls","Deadlift",
  "Romanian Deadlift","Bent-over Row","Pull-ups","Chin-ups","Lat Pulldown",
  "Seated Row","Leg Press","Leg Extension","Leg Curl","Calf Raises","Shoulder Press",
  "Lateral Raises","Front Raises","Rear Delt Fly","Chest Fly","Chest Press",
  "Incline Press","Decline Press","Dumbbell Rows","Kettlebell Swing","Sumo Squat",
  "Goblet Squat","Pistol Squat","Box Jump","Jump Squat","Split Squat",
  "Bulgarian Split Squat","Hip Thrust","Glute Bridge","Bicycle Kick","Superman",
  "Back Extension","Bird Dog","Flutter Kicks","Wall Sit","Stair Climber",
  "Skater Jumps","High Knees","Butt Kicks","Jump Rope","TRX Row","TRX Chest Press",
  "TRX Plank","TRX Pike","TRX Hamstring Curl","Farmers Walk","Shrugs","Woodchoppers",
  "Medicine Ball Slam","Medicine Ball Twist","Medicine Ball Push-up","Kettlebell Clean",
  "Kettlebell Snatch","Kettlebell Press","Turkish Get-Up","Windmill","Handstand",
  "Handstand Push-up","Diamond Push-up","Clapping Push-up","Decline Push-up",
  "Inverted Row","Power Clean","Hang Clean","Clean and Jerk","Snatch","Farmer’s Carry",
  "Sled Push","Sled Pull","Box Step-up","Hip Abduction","Hip Adduction",
  "Cable Crossover","Cable Row","Smith Machine Squat","Smith Machine Press",
  "Glute Kickback","Donkey Kick","Calf Jump","Broad Jump"
];

export default function Exercises() {
  const { user } = useContext(AuthContext);
  const STORAGE_KEY = `@${user.email}:workout_logs`;

  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [reps, setReps] = useState('');
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Ensure per-user storage exists
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw === null) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    });
  }, [STORAGE_KEY]);

  // Filter the list based on search term
  const filtered = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return EXERCISES.filter(name => name.toLowerCase().includes(lower));
  }, [searchTerm]);

  const openLogModal = (name) => {
    setSelectedExercise(name);
    setReps('15');
    setModalVisible(true);
  };

  const saveLog = async () => {
    if (!selectedExercise || !reps) return;
    setSaving(true);
    try {
      const log = { exercise: selectedExercise, reps: parseInt(reps, 10), date: today };
      const prevRaw = await AsyncStorage.getItem(STORAGE_KEY);
      const prev = prevRaw ? JSON.parse(prevRaw) : [];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...prev, log]));
      setModalVisible(false);
    } catch {
      alert('Failed to save!');
    }
    setSaving(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exercise Library</Text>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#888" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => openLogModal(item)}>
            <Ionicons name="barbell-outline" size={28} color="#467fd0" style={{ marginRight: 14 }} />
            <View>
              <Text style={styles.name}>{item}</Text>
              <Text style={styles.default}>Default: 15 reps</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No exercises match “{searchTerm}”.</Text>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{selectedExercise}</Text>
            <Text>Reps done:</Text>
            <TextInput
              style={styles.input}
              value={reps}
              onChangeText={setReps}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={saveLog}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginTop: 8 }}>
              <Text style={{ color: '#467fd0' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#f8fafd', padding:16 },
  title: { fontSize:26, fontWeight:'bold', textAlign:'center', marginVertical:18, color:'#467fd0' },
  searchContainer: {
    flexDirection:'row',
    alignItems:'center',
    backgroundColor:'#fff',
    borderRadius:8,
    paddingHorizontal:12,
    marginBottom:16,
    elevation:2
  },
  searchInput: {
    flex:1,
    height:40,
    fontSize:16
  },
  item: {
    backgroundColor:'#fff',
    flexDirection:'row',
    alignItems:'center',
    padding:16,
    marginBottom:10,
    borderRadius:12,
    elevation:2
  },
  name: { fontSize:18, fontWeight:'500' },
  default: { color:'#888', fontSize:13 },
  empty: { textAlign:'center', marginTop:32, color:'#888', fontSize:16 },
  modalBg: {
    flex:1,
    backgroundColor:'rgba(0,0,0,0.35)',
    justifyContent:'center',
    alignItems:'center'
  },
  modal: {
    backgroundColor:'#fff',
    padding:22,
    borderRadius:16,
    width:'80%',
    alignItems:'center'
  },
  modalTitle: { fontSize:21, fontWeight:'bold', marginBottom:12 },
  input: {
    width:80,
    height:42,
    borderColor:'#467fd0',
    borderWidth:1.3,
    borderRadius:8,
    textAlign:'center',
    marginVertical:12
  },
  saveBtn: {
    backgroundColor:'#467fd0',
    borderRadius:9,
    paddingVertical:10,
    paddingHorizontal:20
  },
  saveText: { color:'#fff', fontWeight:'bold' },
});
