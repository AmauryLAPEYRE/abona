import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, firestore } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('user');

  async function register(email, password, name) {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    await result.user.updateProfile({ displayName: name });
    await firestore.collection('users').doc(result.user.uid).set({
      name,
      email,
      role: 'user',
      createdAt: new Date()
    });
  }

  function login(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
  }

  function logout() {
    return auth.signOut();
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      if (user) {
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          setUserRole(userDoc.data().role);
        }
      } else {
        setUserRole('user');
      }
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    isAdmin: userRole === 'admin',
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}