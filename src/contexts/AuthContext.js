import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { auth, firestore } from '../firebase';

// Fonction utilitaire pour traduire les codes d'erreur Firebase en messages d'erreur français
const translateFirebaseError = (errorCode) => {
  const errorMessages = {
    // Erreurs d'authentification
    'auth/email-already-in-use': 'Cette adresse email est déjà utilisée par un autre compte.',
    'auth/invalid-email': 'L\'adresse email n\'est pas valide.',
    'auth/user-disabled': 'Ce compte utilisateur a été désactivé.',
    'auth/user-not-found': 'Aucun utilisateur ne correspond à cette adresse email.',
    'auth/wrong-password': 'Le mot de passe est incorrect.',
    'auth/weak-password': 'Le mot de passe est trop faible. Il doit contenir au moins 6 caractères.',
    'auth/requires-recent-login': 'Cette opération est sensible et nécessite une authentification récente. Veuillez vous reconnecter.',
    'auth/too-many-requests': 'Trop de tentatives de connexion. Veuillez réessayer plus tard.',
    'auth/operation-not-allowed': 'Cette opération n\'est pas autorisée.',
    'auth/account-exists-with-different-credential': 'Un compte existe déjà avec la même adresse email mais des identifiants de connexion différents.',
    'auth/invalid-credential': 'Les identifiants fournis sont incorrects ou ont expiré.',
    'auth/invalid-verification-code': 'Le code de vérification est invalide.',
    'auth/invalid-verification-id': 'L\'identifiant de vérification est invalide.',
    'auth/expired-action-code': 'Le code d\'action a expiré.',
    'auth/invalid-action-code': 'Le code d\'action est invalide.',
    'auth/network-request-failed': 'La connexion réseau a échoué. Vérifiez votre connexion internet.',
    
    // Erreurs Firestore
    'permission-denied': 'Vous n\'avez pas les autorisations nécessaires pour effectuer cette action.',
    'not-found': 'Le document demandé n\'existe pas.',
    'already-exists': 'Le document que vous essayez de créer existe déjà.',
    
    // Erreurs génériques
    'internal': 'Une erreur interne s\'est produite. Veuillez réessayer.'
  };
  
  return errorMessages[errorCode] || `Une erreur s'est produite (${errorCode}).`;
};

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
    if (!email || !password || !name) {
      const errorMessage = "Tous les champs sont requis.";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
    
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
      const errorMessage = translateFirebaseError(error.code) || 'Échec de la création du compte.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Fonction de connexion avec meilleure gestion des erreurs
  const login = useCallback(async (email, password) => {
    if (!email || !password) {
      const errorMessage = "L'email et le mot de passe sont requis.";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
    
    try {
      setError(null);
      return await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      // Pour des raisons de sécurité, on ne précise pas si c'est le mot de passe ou l'email qui est incorrect
      let errorMessage = 'Email ou mot de passe incorrect.';
      
      if (error.code !== 'auth/wrong-password' && error.code !== 'auth/user-not-found') {
        errorMessage = translateFirebaseError(error.code) || 'Échec de la connexion.';
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
      const errorMessage = 'Échec de la déconnexion. Veuillez réessayer.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Fonction pour réinitialiser le mot de passe
  const resetPassword = useCallback(async (email) => {
    if (!email) {
      const errorMessage = "L'adresse email est requise.";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
    
    try {
      setError(null);
      await auth.sendPasswordResetEmail(email);
      return true;
    } catch (error) {
      const errorMessage = translateFirebaseError(error.code) || 'Échec de la réinitialisation du mot de passe.';
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
        throw new Error('Vous devez être connecté pour effectuer cette action.');
      }
      
      const updates = {
        updatedAt: new Date()
      };
      
      // Mettre à jour le profil dans Firebase Auth si nécessaire
      if (userData.displayName) {
        await currentUser.updateProfile({ displayName: userData.displayName });
        updates.name = userData.displayName;
      }
      
      // Mettre à jour l'email si nécessaire
      if (userData.email && userData.email !== currentUser.email) {
        try {
          // Cette opération peut nécessiter une reconnexion récente
          await currentUser.updateEmail(userData.email);
          updates.email = userData.email;
        } catch (error) {
          if (error.code === 'auth/requires-recent-login') {
            throw new Error('Pour des raisons de sécurité, veuillez vous reconnecter avant de changer votre adresse email.');
          } else {
            throw error;
          }
        }
      }
      
      // Mettre à jour les autres champs dans Firestore
      if (userData.name) {
        updates.name = userData.name;
      }
      
      // Seulement mettre à jour si des données ont changé
      if (Object.keys(updates).length > 1) { // Plus de 1 car updatedAt est toujours présent
        await firestore.collection('users').doc(currentUser.uid).update(updates);
      }
      
      return true;
    } catch (error) {
      const errorMessage = translateFirebaseError(error.code) || error.message || 'Échec de la mise à jour du profil.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser]);

  // Fonction pour mettre à jour le mot de passe de l'utilisateur
  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    if (!currentPassword || !newPassword) {
      const errorMessage = "Les deux mots de passe sont requis.";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
    
    if (newPassword.length < 6) {
      const errorMessage = "Le nouveau mot de passe doit contenir au moins 6 caractères.";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
    
    try {
      setError(null);
      
      // Vérifier si l'utilisateur est connecté
      if (!currentUser) {
        throw new Error('Vous devez être connecté pour effectuer cette action.');
      }
      
      // Vérifier le mot de passe actuel en essayant de se reconnecter
      const credential = auth.EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      
      await currentUser.reauthenticateWithCredential(credential);
      
      // Mettre à jour le mot de passe
      await currentUser.updatePassword(newPassword);
      
      return true;
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        const errorMessage = "Le mot de passe actuel est incorrect.";
        setError(errorMessage);
        throw new Error(errorMessage);
      } else {
        const errorMessage = translateFirebaseError(error.code) || 'Échec de la mise à jour du mot de passe.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
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
    updatePassword,
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