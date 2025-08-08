// mobile-app/screens/Calendar.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CalendarScreen() {
  const STORAGE_KEY = '@calendar_entries';
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState({});
  const [type, setType] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  // Load entries once
  useEffect(() => {
    (async () => {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) setEntries(JSON.parse(json));
    })();
  }, []);

  // Save on change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  // Compute marked dates
  const markedDates = Object.keys(entries).reduce((acc, date) => {
    acc[date] = { marked: true, dotColor: '#467fd0' };
    return acc;
  }, {});
  // Ensure selected date is styled
  markedDates[selectedDate] = {
    ...(markedDates[selectedDate] || {}),
    selected: true,
    selectedColor: '#467fd0'
  };

  const dayEntries = entries[selectedDate] || [];

  const handleSaveEntry = () => {
    if (!type.trim() || !duration.trim()) {
      return alert('Please enter both type and duration.');
    }
    const newEntry = { type, duration, notes };
    setEntries(prev => {
      const list = prev[selectedDate] || [];
      return { ...prev, [selectedDate]: [...list, newEntry] };
    });
    setType(''); setDuration(''); setNotes('');
  };

  const renderItem = ({ item }) => (
    <View style={styles.entry}>
      <Text style={styles.entryText}>• {item.type} — {item.duration} min</Text>
      {item.notes ? <Text style={styles.notes}>Notes: {item.notes}</Text> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={90}
    >
      <Calendar
        onDayPress={day => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        style={styles.calendar}
      />

      <Text style={styles.heading}>Entries for {selectedDate}</Text>
      <FlatList
        data={dayEntries}
        keyExtractor={(item, i) => `${selectedDate}-${i}`}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.noEntry}>No entries yet.</Text>}
        contentContainerStyle={styles.listContainer}
      />

      <Text style={styles.heading}>Add Entry</Text>
      <TextInput
        style={styles.input}
        placeholder="Type (Workout or Meal)"
        value={type}
        onChangeText={setType}
      />
      <TextInput
        style={styles.input}
        placeholder="Duration (minutes)"
        value={duration}
        onChangeText={setDuration}
        keyboardType="numeric"
      />
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <TouchableOpacity style={styles.button} onPress={handleSaveEntry}>
        <Text style={styles.buttonText}>Save Entry</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  calendar: { marginVertical: 16 },
  heading: { fontSize: 18, fontWeight: '600', marginHorizontal: 16, marginTop: 8 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 16 },
  noEntry: { fontSize: 14, color: '#666', marginVertical: 8 },
  entry: { backgroundColor: '#eef', padding: 12, borderRadius: 8, marginBottom: 8 },
  entryText: { fontSize: 16 },
  notes: { fontSize: 14, color: '#444', marginTop: 4 },
  input: {
    height: 48,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fafafa'
  },
  button: {
    height: 48,
    margin: 16,
    borderRadius: 8,
    backgroundColor: '#467fd0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '500' },
});
