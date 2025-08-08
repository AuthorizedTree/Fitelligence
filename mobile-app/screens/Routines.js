// mobile-app/screens/Routines.js
//
// Routines  +  Weekly Reminder  +  Motivation Quote  +  Haptic “success” on log
// -----------------------------------------------------------------------------

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Alert,
  StyleSheet,
  Platform,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { DataContext } from '../context/DataContext';

/* ───────────────────── 1. Data constants ───────────────────── */
const EXERCISES = [
  // (same 100-item list as before; trimmed for brevity)
  'Push-ups','Squats','Lunges','Burpees','Jumping Jacks','Mountain Climbers','Plank',
  /* … */                                   'Calf Jump','Broad Jump',
];

const QUOTES = [
  'No pain, no gain!',
  'Sweat is fat crying.',
  'Great things never come from comfort zones.',
  'Little progress is still progress.',
  'Your body can stand almost anything; it’s your mind you have to convince.',
  'Push yourself because no one else is going to do it for you.',
  'It’s a slow process, but quitting won’t speed it up.',
  'Today’s accomplishments were yesterday’s impossibilities.',
  'One workout at a time, one day at a time.',
  'Strive for progress, not perfection.',
];

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* ───────────────────── 2. Component ─────────────────────────── */
export default function Routines() {
  const { user } = useContext(AuthContext);
  const { routines, workoutLogs, addRoutine, deleteRoutine, logWorkout, syncStatus } = useContext(DataContext);
  const navigation = useNavigation();

  /* — state — */
  const [quote,    setQuote]      = useState('');
  const [refreshing,setRefreshing]= useState(false);

  /* modal state */
  const [modalVisible,setModalVisible]=useState(false);
  const [name,setName]           =useState('');
  const [selected,setSelected]   =useState({});
  const [dayFlags,setDayFlags]   =useState(Array(7).fill(false));
  const [time,setTime]           =useState(new Date(0,0,0,7,0));
  const [showTime,setShowTime]   =useState(false);

  /* ── random quote helpers ── */
  const randQuote = () => QUOTES[Math.floor(Math.random()*QUOTES.length)];
  const refreshQuote = () => setQuote(randQuote());

  /* ── on mount ── */
  useEffect(()=>{
    refreshQuote();
    (async()=>{
      const {status}=await Notifications.getPermissionsAsync();
      if(status!=='granted'){ await Notifications.requestPermissionsAsync(); }
    })();
  },[]);

  /* ── routines are now managed by DataContext ── */

  /* ── UI toggles ── */
  const toggleSelect = ex=>setSelected(p=>({...p,[ex]:!p[ex]}));
  const toggleDay    = i=>setDayFlags(a=>a.map((v,idx)=>idx===i?!v:v));

  /* ── notification utils ── */
  const scheduleForRoutine = async name=>{
    const ids=[];
    for(let i=0;i<7;i++){
      if(!dayFlags[i]) continue;
      ids.push(await Notifications.scheduleNotificationAsync({
        content:{title:'Workout Reminder',body:`Time for "${name}" 💪`,sound:true},
        trigger:{weekday:i+1,hour:time.getHours(),minute:time.getMinutes(),repeats:true},
      }));
    }
    return ids;
  };
  const cancelNotifArray = ids=>Promise.all(ids.map(id=>Notifications.cancelScheduledNotificationAsync(id)));

  /* ── save routine ── */
  const saveRoutine = async ()=>{
    if(!name.trim())             return Alert.alert('Error', 'Name required');
    
    // Check for duplicate routine names
    const existingRoutine = routines.find(r => r.name.toLowerCase() === name.trim().toLowerCase());
    if(existingRoutine)          return Alert.alert('Error', 'A routine with this name already exists');
    
    const list=EXERCISES.filter(ex=>selected[ex]);
    if(!list.length)             return Alert.alert('Error', 'Select at least one exercise');
    if(!dayFlags.includes(true)) return Alert.alert('Error', 'Select at least one day');

    try {
      const notifIds=await scheduleForRoutine(name.trim());
      const newRoutine={name:name.trim(),exercises:list,days:dayFlags,time:time.toISOString(),notifIds};
      await addRoutine(newRoutine);

      // Clear form and close modal
      setName('');
      setSelected({});
      setDayFlags(Array(7).fill(false));
      setTime(new Date(0,0,0,7,0));
      setModalVisible(false);
      
      Alert.alert('Success', 'Routine created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save routine');
    }
  };

  /* ── delete routine ── */
  const deleteRoutineHandler = routine=>{
    Alert.alert('Delete?',`Remove "${routine.name}"?`,[
      {text:'Cancel',style:'cancel'},
      {text:'Delete',style:'destructive',onPress:async()=>{
        try {
          await cancelNotifArray(routine.notifIds);
          await deleteRoutine(routine.name);
        } catch (error) {
          Alert.alert('Error', 'Failed to delete routine');
        }
      }}
    ]);
  };

  /* ── check if routine is logged today ── */
  const isRoutineLoggedToday = (routine) => {
    const today = new Date().toISOString().split('T')[0];
    return routine.exercises.every(exercise => 
      workoutLogs.some(log => 
        log.exercise === exercise && 
        log.date === today
      )
    );
  };

  /* ── log routine + haptic ── */
  const logRoutineHandler = async routine=>{
    // Check if routine is already logged today
    if (isRoutineLoggedToday(routine)) {
      Alert.alert('Already Logged', `${routine.name} has already been completed today!`);
      return;
    }

    try {
      const today=new Date().toISOString().split('T')[0];
      const logs=routine.exercises.map(ex=>({exercise:ex,reps:15,date:today}));
      await logWorkout(logs);

      // 🔔 Haptic feedback
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}

      Alert.alert('Success', `${routine.name} logged successfully!`, [
        { 
          text: 'View Diary', 
          onPress: () => navigation.navigate('Diary')
        },
        { 
          text: 'OK', 
          style: 'cancel'
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to log routine');
    }
  };

  /* ── pull-to-refresh just changes quote ── */
  const onRefresh = async ()=>{
    setRefreshing(true); refreshQuote(); setRefreshing(false);
  };

  /* ── UI ── */
  return(
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Routines</Text>
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

      <TouchableOpacity onPress={refreshQuote}>
        <Text style={styles.quote}>"{quote}"</Text>
      </TouchableOpacity>

      <FlatList
        data={routines}
        keyExtractor={r=>r.id || r.name}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
        ListEmptyComponent={<Text style={styles.empty}>No routines yet.</Text>}
        renderItem={({item})=>{
          const isCompleted = isRoutineLoggedToday(item);
          return (
            <View style={[styles.routine, isCompleted && styles.routineCompleted]}>
              <View style={{flex:1}}>
                <View style={{flexDirection:'row', alignItems:'center'}}>
                  <Text style={[styles.routineName, isCompleted && styles.routineNameCompleted]}>
                    {item.name} ({item.exercises.length})
                  </Text>
                  {isCompleted && <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={{marginLeft:8}}/>}
                </View>
                <Text style={[styles.scheduleTxt, isCompleted && styles.scheduleCompletedTxt]}>
                  {(item.days??[]).map((v,i)=>(v?DAYS[i]:null)).filter(Boolean).join(', ')||'— no reminder —'}
                  {'  ·  '}
                  {new Date(item.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                </Text>
              </View>
              <View style={styles.rowBtns}>
                <TouchableOpacity 
                  style={[styles.logBtn, isCompleted && styles.logBtnCompleted]} 
                  onPress={()=>logRoutineHandler(item)}
                  disabled={isCompleted}
                >
                  <Ionicons name={isCompleted ? "checkmark-done" : "checkmark"} size={18} color="#fff"/>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={()=>deleteRoutineHandler(item)}>
                  <Ionicons name="trash" size={18} color="#fff"/>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        contentContainerStyle={{paddingBottom:24}}
      />

      <TouchableOpacity style={styles.addBtn} onPress={()=>setModalVisible(true)}>
        <Text style={styles.addText}>+ New Routine</Text>
      </TouchableOpacity>

      {/* ───────── Modal ───────── */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Create Routine</Text>
          <TextInput style={styles.input} placeholder="Routine Name" value={name} onChangeText={setName}/>

          <Text style={styles.selectTitle}>Reminder Days:</Text>
          <View style={styles.dayRow}>
            {DAYS.map((d,i)=>(
              <TouchableOpacity key={d} style={[styles.dayChip,dayFlags[i]&&styles.dayChipActive]} onPress={()=>toggleDay(i)}>
                <Text style={[styles.dayTxt,dayFlags[i]&&styles.dayTxtActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.timeBtn} onPress={()=>setShowTime(true)}>
            <Ionicons name="time-outline" size={18} color="#467fd0"/>
            <Text style={styles.timeTxt}>{time.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</Text>
          </TouchableOpacity>
          {showTime && (
            <DateTimePicker
              mode="time"
              value={time}
              onChange={(_,dt)=>{setShowTime(false);if(dt) setTime(dt);}}
            />
          )}

          <Text style={styles.selectTitle}>Select Exercises:</Text>
          <FlatList
            data={EXERCISES}
            keyExtractor={ex=>ex}
            renderItem={({item})=>(
              <View style={styles.selectItem}>
                <Text style={styles.selectName}>{item}</Text>
                <Switch value={!!selected[item]} onValueChange={()=>toggleSelect(item)}/>
              </View>
            )}
            style={styles.selectList}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={saveRoutine}>
            <Text style={styles.saveText}>Save Routine</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={()=>setModalVisible(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

/* ───────── Styles ───────── */
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#f8fafd',padding:16},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:18,marginBottom:8},
  title:{fontSize:26,fontWeight:'bold',color:'#467fd0'},
  syncIndicator:{flexDirection:'row',alignItems:'center'},
  syncText:{fontSize:12,marginLeft:4,fontWeight:'500'},
  quote:{fontSize:14,fontStyle:'italic',textAlign:'center',color:'#555',marginBottom:12},

  routine:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',
    backgroundColor:'#fff',padding:14,borderRadius:10,marginBottom:10,elevation:2},
  routineCompleted:{backgroundColor:'#f0f8f0',borderLeftWidth:4,borderLeftColor:'#4CAF50'},
  routineName:{fontSize:16,fontWeight:'500'},
  routineNameCompleted:{color:'#4CAF50',textDecorationLine:'line-through'},
  scheduleTxt:{fontSize:12,color:'#666',marginTop:2},
  scheduleCompletedTxt:{color:'#4CAF50'},
  rowBtns:{flexDirection:'row'},
  logBtn:{backgroundColor:'#467fd0',borderRadius:8,paddingHorizontal:12,paddingVertical:6,marginRight:6},
  logBtnCompleted:{backgroundColor:'#4CAF50',opacity:0.6},
  delBtn:{backgroundColor:'#d22',borderRadius:8,paddingHorizontal:12,paddingVertical:6},

  addBtn:{backgroundColor:'#467fd0',padding:14,borderRadius:8,alignItems:'center',marginTop:12},
  addText:{color:'#fff',fontSize:16,fontWeight:'600'},
  empty:{textAlign:'center',marginTop:32,color:'#888'},

  modalContainer:{flex:1,padding:20,backgroundColor:'#f8fafd'},
  modalTitle:{fontSize:24,fontWeight:'bold',marginBottom:12,textAlign:'center'},
  input:{borderWidth:1,borderColor:'#ccc',borderRadius:8,padding:10,marginBottom:12,backgroundColor:'#fff'},

  selectTitle:{fontSize:16,fontWeight:'600',marginVertical:8},

  dayRow:{flexDirection:'row',flexWrap:'wrap',marginBottom:12},
  dayChip:{borderWidth:1,borderColor:'#467fd0',borderRadius:14,paddingHorizontal:10,paddingVertical:4,margin:2},
  dayChipActive:{backgroundColor:'#467fd0'},
  dayTxt:{fontSize:12,color:'#467fd0'},
  dayTxtActive:{color:'#fff'},

  timeBtn:{flexDirection:'row',alignItems:'center',marginBottom:12},
  timeTxt:{marginLeft:4,color:'#467fd0',fontWeight:'500'},

  selectList:{flex:1},
  selectItem:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',
    backgroundColor:'#fff',padding:12,marginBottom:4,borderRadius:8},
  selectName:{fontSize:15},

  saveBtn:{backgroundColor:'#467fd0',padding:14,borderRadius:8,alignItems:'center',marginVertical:8},
  saveText:{color:'#fff',fontSize:16,fontWeight:'600'},
  cancelBtn:{alignItems:'center',padding:12},
  cancelText:{color:'#467fd0',fontSize:16},
});
