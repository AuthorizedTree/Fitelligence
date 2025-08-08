// mobile-app/firebase.js

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// ← Paste your Web config here:
const firebaseConfig = {
    apiKey: "AIzaSyArVyfupRTgYXFUzLZjsB96lbTmhXMd-Qs",
    authDomain: "athletic-fitness-f70a0.firebaseapp.com",
    projectId: "athletic-fitness-f70a0",
    storageBucket: "athletic-fitness-f70a0.firebasestorage.app",
    messagingSenderId: "22231007026",
    appId: "1:22231007026:android:bca32951dab1d681c1a12b"
};

// Initialize if not already
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export the compat namespaces
export const auth = firebase.auth();
export const db   = firebase.firestore();
