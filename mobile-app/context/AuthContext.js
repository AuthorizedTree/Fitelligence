// mobile-app/context/AuthContext.js

import React, { createContext, useState, useEffect } from 'react';
import { auth } from '../firebase';

// AuthContext shares current user and login/logout
export const AuthContext = createContext({
  user: null,
  login: async () => {},
  logout: async () => {}
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified
        });
      } else {
        setUser(null);
      }
    });

    return unsubscribe;
  }, []);

  // Login: Firebase handles the state
  const login = async (uid) => {
    // Firebase auth state listener will handle setting the user
  };

  // Logout: sign out from Firebase
  const logout = async () => {
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
