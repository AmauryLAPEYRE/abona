import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { auth, firestore } from '../firebase';

// Création du contexte d'authentification
const AuthContext = createContext();

// Hook personnalisé pour utiliser le contexte d'authentification
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('user');
  const [error, setError] = useState(null);

  // Fonction d'inscription avec meilleure gestion des erreurs
  const register = useCallback(async (email, password, name) => {
    try {
      setError(null);
      // Création de l'utilisateur dans Firebase Auth
      const result = await auth.createUserWithEmailAndPassword(email, password);
      
      // Mise à jour du profil utilisateur avec son nom
      await result.user.updateProfile({ displayName: name });
      
      // Enregistrement des données utilisateur dans Firestore
      await firestore.collection('users').doc(result.user.uid).set({
        name,
        email,
        role: 'user',
        createdAt: new Date()
      });
      
      return result.user;
    } catch (error) {
      // Traduction des erreurs Firebase pour l'utilisateur
      let errorMessage = 'Échec de la création du compte';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Cette adresse email est déjà utilisée';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Adresse email invalide';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Le mot de passe est trop faible';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Fonction de connexion avec meilleure gestion des erreurs
  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      return await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      // Traduction des erreurs Firebase pour l'utilisateur
      let errorMessage = 'Échec de la connexion';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Email ou mot de passe incorrect';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Adresse email invalide';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Ce compte a été désactivé';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives de connexion. Veuillez réessayer plus tard';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Fonction de déconnexion avec gestion des erreurs
  const logout = useCallback(async () => {
    try {
      setError(null);
      await auth.signOut();
    } catch (error) {
      setError('Échec de la déconnexion');
      throw error;
    }
  }, []);

  // Fonction pour réinitialiser le mot de passe
  const resetPassword = useCallback(async (email) => {
    try {
      setError(null);
      await auth.sendPasswordResetEmail(email);
    } catch (error) {
      let errorMessage = 'Échec de la réinitialisation du mot de passe';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Aucun compte ne correspond à cette adresse email';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Adresse email invalide';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Fonction pour mettre à jour le profil utilisateur
  const updateProfile = useCallback(async (userData) => {
    try {
      setError(null);
      
      // Vérifier si l'utilisateur est connecté
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }
      
      // Mettre à jour le profil dans Firebase Auth
      if (userData.displayName) {
        await currentUser.updateProfile({ displayName: userData.displayName });
      }
      
      // Mettre à jour les données dans Firestore
      const userRef = firestore.collection('users').doc(currentUser.uid);
      const updateData = {};
      
      if (userData.name) updateData.name = userData.name;
      if (userData.email && userData.email !== currentUser.email) {
        // Si l'email change, il faut également le mettre à jour dans Firebase Auth
        await currentUser.updateEmail(userData.email);
        updateData.email = userData.email;
      }
      
      // Seulement mettre à jour si des données ont changé
      if (Object.keys(updateData).length > 0) {
        await userRef.update({
          ...updateData,
          updatedAt: new Date()
        });
      }
      
      return true;
    } catch (error) {
      let errorMessage = 'Échec de la mise à jour du profil';
      
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Veuillez vous reconnecter pour effectuer cette action';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser]);

  // Effet pour écouter les changements d'authentification
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      try {
        if (user) {
          // Récupérer les données utilisateur depuis Firestore
          const userDoc = await firestore.collection('users').doc(user.uid).get();
          
          if (userDoc.exists) {
            // Définir le rôle de l'utilisateur
            setUserRole(userDoc.data().role || 'user');
          } else {
            // Créer un document utilisateur s'il n'existe pas encore
            await firestore.collection('users').doc(user.uid).set({
              name: user.displayName || '',
              email: user.email,
              role: 'user',
              createdAt: new Date()
            });
            setUserRole('user');
          }
        } else {
          // Réinitialiser le rôle si déconnecté
          setUserRole('user');
        }
        
        // Mettre à jour l'utilisateur et l'état de chargement
        setCurrentUser(user);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
        setUserRole('user');
        setCurrentUser(user);
        setLoading(false);
      }
    });

    // Nettoyage de l'écouteur lors du démontage du composant
    return unsubscribe;
  }, []);

  // Valeurs exposées par le contexte
  const value = {
    currentUser,
    userRole,
    isAdmin: userRole === 'admin',
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
    loading,
    error,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}