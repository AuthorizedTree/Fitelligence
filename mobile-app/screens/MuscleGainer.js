// mobile-app/screens/MuscleGainer.js

import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';

export default function MuscleGainer() {
  const { user } = useContext(AuthContext);
  const PROFILE_KEY = `@${user.email}:profile`;
  const MACRO_KEY   = `@${user.email}:macro_targets`;

  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge]       = useState('');
  const [cal, setCal]       = useState(null);
  const [p, setP]           = useState(null);
  const [c, setC]           = useState(null);
  const [f, setF]           = useState(null);

  const calculate = async () => {
    const w = +weight, h = +height, a = +age;
    if (!w || !h || !a) return Alert.alert('Invalid','Fill all fields.');
    // Mifflin-St Jeor BMR + light activity
    const bmr = 10*w + 6.25*h - 5*a + 5;
    const tdee = bmr * 1.2;
    const target = tdee - 500;              // fat loss deficit
    const protCals = w * 1.6 * 4;           // 1.6g protein per kg
    const fatCals  = target * 0.25;         // 25% of calories
    const carbCals = target - protCals - fatCals;

    const protG = protCals / 4;
    const fatG  = fatCals  / 9;
    const carbG = carbCals / 4;

    setCal(Math.round(target));
    setP(Math.round(protG*10)/10);
    setF(Math.round(fatG*10)/10);
    setC(Math.round(carbG*10)/10);

    // Persist into AsyncStorage
    const macroTargets = {
      calories: Math.round(target),
      protein:  Math.round(protG*10)/10,
      fat:      Math.round(fatG*10)/10,
      carbs:    Math.round(carbG*10)/10
    };
    try {
      await AsyncStorage.setItem(MACRO_KEY, JSON.stringify(macroTargets));
    } catch (e) {
      console.warn('Failed saving macros', e);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Calorie & Macro Calculator</Text>

      <Text style={styles.label}>Weight (kg)</Text>
      <TextInput style={styles.input} keyboardType="numeric"
        value={weight} onChangeText={setWeight} placeholder="70" />

      <Text style={styles.label}>Height (cm)</Text>
      <TextInput style={styles.input} keyboardType="numeric"
        value={height} onChangeText={setHeight} placeholder="175" />

      <Text style={styles.label}>Age (yrs)</Text>
      <TextInput style={styles.input} keyboardType="numeric"
        value={age} onChangeText={setAge} placeholder="30" />

      <TouchableOpacity style={styles.button} onPress={calculate}>
        <Text style={styles.buttonText}>Calculate</Text>
      </TouchableOpacity>

      {cal !== null && (
        <View style={styles.results}>
          <Text style={styles.res}>Calories/day: {cal} kcal</Text>
          <Text style={styles.res}>Protein: {p} g</Text>
          <Text style={styles.res}>Carbs: {c} g</Text>
          <Text style={styles.res}>Fat: {f} g</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:{ padding:24, backgroundColor:'#f8fafd' },
  title:{ fontSize:26,fontWeight:'700',color:'#467fd0',textAlign:'center',marginBottom:24 },
  label:{ fontSize:16,marginTop:12,marginBottom:6,color:'#333' },
  input:{ height:44,borderColor:'#ccc',borderWidth:1,borderRadius:8,paddingHorizontal:12,backgroundColor:'#fff' },
  button:{ marginTop:20,backgroundColor:'#467fd0',borderRadius:8,paddingVertical:14,alignItems:'center' },
  buttonText:{ color:'#fff',fontSize:16,fontWeight:'600' },
  results:{ marginTop:28,backgroundColor:'#fff',padding:20,borderRadius:10,elevation:2,shadowColor:'#000',shadowOpacity:0.05,shadowRadius:3,shadowOffset:{width:0,height:1} },
  res:{ fontSize:16,marginBottom:8,color:'#333' }
});
