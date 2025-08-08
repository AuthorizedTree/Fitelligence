// mobile-app/screens/Profile.js

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

export default function Profile({ navigation }) {
  /** ------------------------------------------------------------------ *
   *  Auth context – we just need `logout()` now.                        *
   * ------------------------------------------------------------------- */
  const { user, logout } = useContext(AuthContext);

  const PROFILE_KEY = `@${user.email}:profile`;
  const CRED_KEY    = `user:${user.email}`;

  const [avatarUri, setAvatarUri]           = useState(null);
  const [fullName, setFullName]             = useState('');
  const [age, setAge]                       = useState('');
  const [phone, setPhone]                   = useState('');
  const [storedPassword, setStoredPassword] = useState('');
  const [showStored, setShowStored]         = useState(false);

  const [showReset, setShowReset]           = useState(false);
  const [currentPwdInput, setCurrentPwdInput] = useState('');
  const [newPwd, setNewPwd]                 = useState('');
  const [confirmPwd, setConfirmPwd]         = useState('');

  /* ──────────────────────────────────────────────────────────────── */
  /*  Load profile & saved password                                  */
  /* ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      const rawP = await AsyncStorage.getItem(PROFILE_KEY);
      if (rawP) {
        const p = JSON.parse(rawP);
        setAvatarUri(p.avatarUri);
        setFullName(p.fullName);
        setAge(String(p.age));
        setPhone(p.phone);
      }
      const rawC = await AsyncStorage.getItem(CRED_KEY);
      if (rawC) setStoredPassword(JSON.parse(rawC).password);
    })();
  }, []);

  /* ──────────────────────────────────────────────────────────────── */
  /*  Image picker helpers                                           */
  /* ──────────────────────────────────────────────────────────────── */
  async function pickImage(fromCamera) {
    const perm = fromCamera
      ? ImagePicker.requestCameraPermissionsAsync()
      : ImagePicker.requestMediaLibraryPermissionsAsync();
    if ((await perm).status !== 'granted') {
      return Alert.alert('Permission needed', 'Please allow access.');
    }
    const launch = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const result = await launch({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  }

  const showPhotoOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Take Photo', 'Choose from Library', 'Cancel'], cancelButtonIndex: 2 },
        idx => { if (idx === 0) pickImage(true); else if (idx === 1) pickImage(false); }
      );
    } else {
      Alert.alert('Select Photo', '', [
        { text: 'Take Photo',          onPress: () => pickImage(true)  },
        { text: 'Choose from Library', onPress: () => pickImage(false) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  /* ──────────────────────────────────────────────────────────────── */
  /*  Save profile + password                                        */
  /* ──────────────────────────────────────────────────────────────── */
  const saveProfile = async () => {
    if (!fullName || !age || !phone) {
      return Alert.alert('Missing fields', 'Name, age & phone are required.');
    }
    const profile = { avatarUri, fullName, age: parseInt(age, 10), phone };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    Alert.alert('Success', 'Profile saved.');
  };

  const savePassword = async () => {
    if (!currentPwdInput)                 return Alert.alert('Enter current password');
    if (currentPwdInput !== storedPassword) return Alert.alert('Incorrect', 'Current password is wrong.');
    if (newPwd.length < 6)               return Alert.alert('Too short', 'New must be ≥6 chars.');
    if (newPwd !== confirmPwd)           return Alert.alert('Mismatch', 'Passwords do not match.');

    await AsyncStorage.setItem(CRED_KEY, JSON.stringify({ password: newPwd }));
    setStoredPassword(newPwd);
    setCurrentPwdInput(''); setNewPwd(''); setConfirmPwd(''); setShowReset(false);
    Alert.alert('Success', 'Password updated.');
  };

  /* ──────────────────────────────────────────────────────────────── */
  /*  Logout – just call global `logout()`                           */
  /* ──────────────────────────────────────────────────────────────── */
  const handleLogout = () => {
    Alert.alert('Log out?', 'You will return to the Welcome screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          // Any per-user cleanup you want:
          // AsyncStorage.removeItem(PROFILE_KEY);
          logout();           // ➜ user ⇒ null  ➜ AppRoutes shows Welcome
        },
      },
    ]);
  };

  /* ──────────────────────────────────────────────────────────────── */
  /*  Header back button                                             */
  /* ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    navigation.setOptions({
      headerTitle: 'Profile',
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
      ),
    });
  }, []);

  /* ──────────────────────────────────────────────────────────────── */
  /*  UI                                                             */
  /* ──────────────────────────────────────────────────────────────── */
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Avatar */}
      <View style={styles.photoSection}>
        <TouchableOpacity onPress={showPhotoOptions}>
          {avatarUri
            ? <Image source={{ uri: avatarUri }} style={styles.avatar} />
            : <View style={styles.avatarPlaceholder}><Ionicons name="person" size={48} color="#888" /></View>}
          <View style={styles.cameraBadge}><Ionicons name="camera" size={16} color="#fff" /></View>
        </TouchableOpacity>
      </View>

      {/* Profile fields */}
      <Text style={styles.label}>Full Name</Text>
      <TextInput style={styles.input} placeholder="Your full name" value={fullName} onChangeText={setFullName} />

      <Text style={styles.label}>Age</Text>
      <TextInput style={styles.input} placeholder="Age" keyboardType="numeric" value={age} onChangeText={setAge} />

      <Text style={styles.label}>Phone Number</Text>
      <TextInput style={styles.input} placeholder="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

      <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}><Text style={styles.saveTxt}>Save</Text></TouchableOpacity>

      {/* Password display */}
      <View style={styles.divider} />
      <Text style={styles.label}>Current Password</Text>
      <View style={styles.pwdRow}>
        <TextInput style={[styles.input, { flex: 1 }]} value={storedPassword} secureTextEntry={!showStored} editable={false} />
        <TouchableOpacity onPress={() => setShowStored(!showStored)}><Text style={styles.showTxt}>{showStored ? 'Hide' : 'Show'}</Text></TouchableOpacity>
      </View>

      {/* Reset password */}
      <TouchableOpacity style={styles.resetToggle} onPress={() => setShowReset(!showReset)}>
        <Text style={styles.resetToggleText}>{showReset ? 'Cancel Reset' : 'Reset Password'}</Text>
      </TouchableOpacity>

      {showReset && (
        <>
          <Text style={styles.label}>Current Password</Text>
          <TextInput style={styles.input} placeholder="••••••" secureTextEntry value={currentPwdInput} onChangeText={setCurrentPwdInput} />
          <Text style={styles.label}>New Password</Text>
          <TextInput style={styles.input} placeholder="••••••" secureTextEntry value={newPwd} onChangeText={setNewPwd} />
          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput style={styles.input} placeholder="••••••" secureTextEntry value={confirmPwd} onChangeText={setConfirmPwd} />

          <TouchableOpacity style={styles.saveBtn} onPress={savePassword}><Text style={styles.saveTxt}>Save Password</Text></TouchableOpacity>
        </>
      )}

      {/* Log-out button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutTxt}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  Styles                                                         */
/* ──────────────────────────────────────────────────────────────── */
const AVATAR_SIZE = 100;

const styles = StyleSheet.create({
  container:{ padding:20, backgroundColor:'#fff' },
  photoSection:{ alignItems:'center', marginVertical:20 },
  avatar:{ width:AVATAR_SIZE, height:AVATAR_SIZE, borderRadius:AVATAR_SIZE/2 },
  avatarPlaceholder:{ width:AVATAR_SIZE, height:AVATAR_SIZE, borderRadius:AVATAR_SIZE/2, backgroundColor:'#eee', alignItems:'center', justifyContent:'center' },
  cameraBadge:{ position:'absolute', bottom:0, right:AVATAR_SIZE/2-16, backgroundColor:'#467fd0', padding:4, borderRadius:12 },
  label:{ marginTop:12, fontSize:14, color:'#444' },
  input:{ height:44, borderWidth:1, borderColor:'#ccc', borderRadius:8, paddingHorizontal:12, marginTop:6, backgroundColor:'#fafafa' },
  saveBtn:{ marginTop:20, backgroundColor:'#467fd0', paddingVertical:12, borderRadius:8 },
  saveTxt:{ color:'#fff', textAlign:'center', fontWeight:'600' },
  divider:{ height:1, backgroundColor:'#ddd', marginVertical:20 },
  pwdRow:{ flexDirection:'row', alignItems:'center' },
  showTxt:{ color:'#467fd0', fontWeight:'500', marginLeft:8 },
  resetToggle:{ marginVertical:10 },
  resetToggleText:{ color:'#467fd0', fontWeight:'500' },
  logoutBtn:{ marginTop:30 },
  logoutTxt:{ color:'#d00', textAlign:'center', fontWeight:'600' },
});
