import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { auth, db } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import { useThemeColors } from '../theme';

export default function SignIn() {
  const { login } = useContext(AuthContext);
  const C = useThemeColors();

  /* ── state ─────────────────────────────── */
  const [mode, setMode] = useState('signin');          // <-- plain JS, no generic
  const [email, setEmail] = useState('');
  const [pw, setPw]       = useState('');
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');

  const reset = () => { setEmail(''); setPw(''); setName(''); setPhone(''); };

  /* ── sign-up ───────────────────────────── */
  const signUp = async () => {
    if (!name.trim())             return Alert.alert('Name required');
    if (!email.includes('@'))     return Alert.alert('Invalid email');
    if (pw.length < 6)            return Alert.alert('Password ≥ 6 chars');
    if (!phone.trim())            return Alert.alert('Phone required');

    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email.trim(), pw);
      const user = userCredential.user;
      
      // Store additional user data in Firestore
      await db.collection('users').doc(user.uid).set({
        fullName: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        avatar: null,
        createdAt: new Date()
      });

      // Initialize user's workout logs and chat messages
      await db.collection('users').doc(user.uid).collection('workout_logs').doc('init').set({});
      await db.collection('users').doc(user.uid).collection('chat_messages').doc('init').set({});

      Alert.alert('Success', 'Account created successfully!');
      reset(); setMode('signin');
    } catch (error) {
      Alert.alert('Sign Up Error', error.message);
    }
  };

  /* ── sign-in ───────────────────────────── */
  const signIn = async () => {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email.trim(), pw);
      const user = userCredential.user;
      login(user.uid);
    } catch (error) {
      Alert.alert('Sign In Error', error.message);
    }
  };

  /* ── styles ────────────────────────────── */
  const S = StyleSheet.create({
    wrap:{ flex:1, padding:24, justifyContent:'center', backgroundColor:C.bg },
    title:{ fontSize:32, fontWeight:'600', marginBottom:24, alignSelf:'center', color:C.primary },
    input:{ height:48, borderColor:C.border, borderWidth:1, borderRadius:8,
            paddingHorizontal:12, marginBottom:16, backgroundColor:C.card, color:C.text },
    btn:{ height:48, borderRadius:8, backgroundColor:C.primary,
          alignItems:'center', justifyContent:'center', marginBottom:12 },
    btnTxt:{ color:'#fff', fontSize:18, fontWeight:'500' },
    link:{ color:C.primary, fontSize:14, textAlign:'center', marginTop:8 },
  });

  /* ── UI ────────────────────────────────── */
  return (
    <KeyboardAvoidingView
      style={S.wrap}
      behavior={Platform.select({ ios:'padding', android:'height' })}
    >
      <Text style={S.title}>{mode === 'signin' ? 'Welcome Back' : 'Create Account'}</Text>

      {mode === 'signup' && (
        <>
          <TextInput
            style={S.input}
            placeholder="Full Name"
            placeholderTextColor={C.textSoft}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={S.input}
            placeholder="Phone Number"
            placeholderTextColor={C.textSoft}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </>
      )}

      <TextInput
        style={S.input}
        placeholder="Email"
        placeholderTextColor={C.textSoft}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={S.input}
        placeholder={mode === 'signin' ? 'Password (min 6 chars)' : 'Create Password (min 6 chars)'}
        placeholderTextColor={C.textSoft}
        secureTextEntry
        value={pw}
        onChangeText={setPw}
      />

      {mode === 'signin' ? (
        <>
          <TouchableOpacity style={S.btn} onPress={signIn}>
            <Text style={S.btnTxt}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { reset(); setMode('signup'); }}>
            <Text style={S.link}>Don’t have an account? Sign Up</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity style={S.btn} onPress={signUp}>
            <Text style={S.btnTxt}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { reset(); setMode('signin'); }}>
            <Text style={S.link}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
