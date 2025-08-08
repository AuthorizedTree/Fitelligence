// mobile-app/screens/Diary.js

import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { DataContext } from '../context/DataContext';

const screenWidth = Dimensions.get('window').width - 32;

export default function Diary() {
  const { user } = useContext(AuthContext);
  const { workoutLogs, clearLogs, syncStatus } = useContext(DataContext);

  const [sections, setSections] = useState([]);
  const [weeklyData, setWeeklyData] = useState({ labels: [], data: [] });
  const [streakCount, setStreakCount] = useState(0);

  useEffect(() => {
    const processLogs = () => {
      const logs = workoutLogs;

      // Group by date
      const byDate = {};
      logs.forEach((l) => {
        byDate[l.date] = (byDate[l.date] || 0) + (l.reps || 0);
      });

      // SectionList data
      const sectionArr = Object.keys(byDate)
        .sort((a, b) => b.localeCompare(a))
        .map((date) => ({
          title: date,
          data: logs.filter((x) => x.date === date),
        }));
      setSections(sectionArr);

      // Build last 7 days chart
      const today = new Date();
      const labels = [];
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        data.push(byDate[key] || 0);
      }
      setWeeklyData({ labels, data });

      // Compute streak: count consecutive days up to today
      let streak = 0;
      let curr = new Date();
      while (true) {
        const key = curr.toISOString().split('T')[0];
        if (byDate[key]) {
          streak++;
          curr.setDate(curr.getDate() - 1);
        } else {
          break;
        }
      }
      setStreakCount(streak);
    };

    processLogs();
  }, [workoutLogs]);

  const clearAllLogs = () => {
    Alert.alert(
      'Clear All History?',
      'This will delete every logged workout for this account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearLogs();
              setSections([]);
              setWeeklyData({ labels: [], data: [] });
              setStreakCount(0);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear logs');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Workout Diary</Text>
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

      {/* Streak Badge (only if streak ≥ 5 days) */}
      {streakCount >= 5 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 {streakCount}-day streak!</Text>
        </View>
      )}

      {/* Weekly Chart */}
      {weeklyData.labels.length > 0 && (
        <BarChart
          data={{
            labels: weeklyData.labels,
            datasets: [{ data: weeklyData.data }],
          }}
          width={screenWidth}
          height={200}
          fromZero
          chartConfig={{
            backgroundGradientFrom: '#f8fafd',
            backgroundGradientTo: '#f8fafd',
            color: (opacity = 1) => `rgba(70,127,208,${opacity})`,
            labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
            style: { borderRadius: 8 },
          }}
          style={styles.chart}
        />
      )}

      {/* History SectionList */}
      <SectionList
        sections={sections}
        keyExtractor={(_, idx) => String(idx)}
        renderSectionHeader={({ section }) => {
          const total = section.data.reduce((sum, e) => sum + (e.reps || 0), 0);
          return (
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>{section.title}</Text>
              <Text style={styles.sectionTotal}>Total: {total} reps</Text>
            </View>
          );
        }}
        renderItem={({ item }) => (
          <View style={styles.entry}>
            <Text style={styles.exercise}>{item.exercise}</Text>
            <Text style={styles.reps}>{item.reps} reps</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No workouts logged yet.</Text>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* Clear Button */}
      <TouchableOpacity onPress={clearAllLogs} style={styles.clearBtn}>
        <Text style={styles.clearBtnText}>Clear All History</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafd', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#467fd0',
  },
  syncIndicator: { flexDirection: 'row', alignItems: 'center' },
  syncText: { fontSize: 12, marginLeft: 4, fontWeight: '500' },
  streakBadge: {
    backgroundColor: '#fffae6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 12,
  },
  streakText: {
    color: '#e67e22',
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#e9eefb',
    padding: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  sectionHeader: { fontSize: 18, fontWeight: '600', color: '#467fd0' },
  sectionTotal: { fontSize: 16, fontWeight: '600', color: '#467fd0' },
  entry: {
    backgroundColor: '#fff',
    marginTop: 4,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exercise: { fontSize: 16, color: '#222' },
  reps: { fontSize: 16, color: '#444' },
  empty: { textAlign: 'center', marginTop: 32, color: '#888' },
  clearBtn: {
    marginTop: 16,
    backgroundColor: '#e33',
    padding: 12,
    borderRadius: 8,
  },
  clearBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
