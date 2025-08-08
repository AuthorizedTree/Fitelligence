import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme';

export default function Welcome({ navigation }) {
  const C = useThemeColors();
  const S=StyleSheet.create({
    wrap:{flex:1,backgroundColor:C.primary,alignItems:'center',justifyContent:'center',padding:36},
    title:{fontSize:30,color:'#fff',fontWeight:'bold',marginBottom:18,textAlign:'center'},
    sub:{fontSize:18,color:'#fff',marginBottom:36,textAlign:'center'},
    btn:{backgroundColor:'#fff',paddingHorizontal:32,paddingVertical:16,borderRadius:10},
    btnTxt:{color:C.primary,fontWeight:'bold',fontSize:18}
  });
  return (
    <View style={S.wrap}>
      <Text style={S.title}>Welcome to Workout Tracker!</Text>
      <Text style={S.sub}>Log reps, see progress, get stronger.</Text>
      <TouchableOpacity style={S.btn} onPress={()=>navigation.replace('SignIn')}>
        <Text style={S.btnTxt}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}
