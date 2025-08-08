// mobile-app/screens/ExerciseLibrary.js

import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput, StyleSheet, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXERCISES = [
  { name: "Push-ups", reps: 20 },
  { name: "Jumping Jacks", reps: 30 },
  { name: "Crunches", reps: 25 },
  { name: "Squats", reps: 20 },
  { name: "Lunges", reps: 15 },
  { name: "Burpees", reps: 10 },
  { name: "Mountain Climbers", reps: 30 },
  { name: "Plank (sec)", reps: 60 },
  { name: "High Knees", reps: 30 },
  { name: "Leg Raises", reps: 15 },
  { name: "Sit-ups", reps: 20 },
  { name: "Russian Twists", reps: 20 },
  { name: "Supermans", reps: 15 },
  { name: "Tricep Dips", reps: 15 },
  { name: "Wall Sit (sec)", reps: 45 },
  { name: "Jump Rope", reps: 100 },
  { name: "Bicycle Crunches", reps: 20 },
  { name: "Butt Kicks", reps: 30 },
  { name: "Step-ups", reps: 20 },
  { name: "Shoulder Taps", reps: 20 },
];

const STORAGE_KEY = "@workout_entries";

export default function ExerciseLibrary() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [reps, setReps] = useState('');

  const openLogModal = (exercise) => {
    setSelectedExercise(exercise);
    setReps(String(exercise.reps));
    setModalVisible(true);
  };

  const logExercise = async () => {
    if (!reps || isNaN(Number(reps)) || Number(reps) < 1) {
      Alert.alert("Please enter a valid number of reps.");
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (!parsed[today]) parsed[today] = [];
      parsed[today].push({
        name: selectedExercise.name,
        reps: Number(reps)
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      setModalVisible(false);
      Alert.alert("Saved!", `${selectedExercise.name} (${reps} reps) logged for today.`);
    } catch (e) {
      Alert.alert("Error saving workout.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exercise Library</Text>
      <FlatList
        data={EXERCISES}
        keyExtractor={item => item.name}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.exercise} onPress={() => openLogModal(item)}>
            <Text style={styles.exerciseText}>{item.name}</Text>
            <Text style={styles.repsText}>{item.reps} reps</Text>
          </TouchableOpacity>
        )}
      />
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>
              {selectedExercise?.name}
            </Text>
            <Text style={{ marginTop: 16 }}>How many reps?</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={reps}
              onChangeText={setReps}
            />
            <TouchableOpacity style={styles.saveButton} onPress={logExercise}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: '#888', marginTop: 10 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  exercise: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  exerciseText: { fontSize: 18 },
  repsText: { fontSize: 16, color: "#888" },
  modalBackground: {
    flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)"
  },
  modalBox: {
    width: 280, backgroundColor: "#fff", borderRadius: 12, padding: 20, alignItems: "center"
  },
  input: {
    marginTop: 10, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, width: 100,
    textAlign: "center", fontSize: 18, padding: 6
  },
  saveButton: {
    marginTop: 18, backgroundColor: "#467fd0", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 30
  }
});
