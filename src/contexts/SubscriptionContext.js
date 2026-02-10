import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { firestore } from '../firebase';
import { useAuth } from './AuthContext';
import { DAYS_IN_MONTH } from '../constants';
import { calculatePrice, calculateDiscountedMonthly, clampDuration } from '../pricing';

const SubscriptionContext = createContext();

export function useSubscriptions() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }) {
  const [mainServices, setMainServices] = useState([]);
  const [availableSubscriptions, setAvailableSubscriptions] = useState([]);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  // Récupérer les services principaux disponibles avec une gestion d'erreur améliorée
  useEffect(() => {
    let isMounted = true;
    const fetchServices = async () => {
      try {
        setLoading(true);
        const servicesSnapshot = await firestore.collection('services').get();
        
        if (!isMounted) return;
        
        const servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setMainServices(servicesData);
        setError(null);
      } catch (err) {
        console.error("Erreur lors du chargement des services:", err);
        if (isMounted) {
          setError(err.message || "Erreur de chargement des services");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchServices();
    
    // Nettoyage pour éviter les fuites de mémoire
    return () => {
      isMounted = false;
    };
  }, []);

  // Récupérer les abonnements de l'utilisateur avec gestion des erreurs améliorée
  useEffect(() => {
    let unsubscribe = () => {};
    
    if (!currentUser) {
      setUserSubscriptions([]);
      setLoading(false);
      return () => {};
    }

    try {
      setLoading(true);
      
      unsubscribe = firestore.collection('userSubscriptions')
        .where('userId', '==', currentUser.uid)
        .onSnapshot(snapshot => {
          const subscriptionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUserSubscriptions(subscriptionsData);
          setLoading(false);
          setError(null);
        }, err => {
          console.error("Erreur lors de l'écoute des abonnements:", err);
          setError(err.message || "Erreur de chargement des abonnements utilisateur");
          setLoading(false);
        });
    } catch (err) {
      console.error("Erreur lors de la configuration de l'écoute des abonnements:", err);
      setError(err.message || "Erreur de configuration des abonnements");
      setLoading(false);
    }

    // Nettoyage à la désinscription
    return () => unsubscribe();
  }, [currentUser]);

  // Obtenir les abonnements disponibles pour un service avec une meilleure validation
  const getAvailableSubscriptions = useCallback(async (serviceId) => {
    if (!serviceId) {
      setError("ID de service manquant");
      return [];
    }
    
    try {
      setLoading(true);
      
      // Vérifier d'abord si le service existe
      const serviceDoc = await firestore.collection('services').doc(serviceId).get();
      
      if (!serviceDoc.exists) {
        throw new Error("Service non trouvé");
      }
      
      // Récupérer tous les abonnements actifs pour ce service
      const subscriptionsSnapshot = await firestore
        .collection('services')
        .doc(serviceId)
        .collection('subscriptions')
        .where('isActive', '==', true)
        .get();
      
      // Filtrer pour ne garder que ceux qui ont des places disponibles
      const availableSubs = subscriptionsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(sub => (sub.currentUsers || 0) < (sub.maxUsers || 0));
      
      setAvailableSubscriptions(availableSubs);
      setError(null);
      setLoading(false);
      return availableSubs;
    } catch (error) {
      console.error('Erreur lors de la récupération des abonnements:', error);
      setError(error.message || "Erreur de récupération des abonnements disponibles");
      setLoading(false);
      return [];
    }
  }, []);

  // Délègue le calcul à la fonction pure partagée (src/pricing.js)
  const calculateProRatedPrice = useCallback((basePrice, duration) => {
    return calculatePrice(basePrice, duration);
  }, []);

  // Acheter un abonnement avec une gestion des erreurs améliorée et une vérification en temps réel
  const purchaseSubscription = useCallback(async (serviceId, subscriptionId, paymentId, duration, isRecurring = false) => {
    if (!currentUser) {
      throw new Error("Vous devez être connecté pour effectuer cette action");
    }
    
    if (!serviceId || !subscriptionId || !paymentId || !duration) {
      throw new Error("Paramètres manquants pour l'achat de l'abonnement");
    }
    
    try {
      setLoading(true);
      
      // Récupérer les détails du service
      const serviceDoc = await firestore.collection('services').doc(serviceId).get();
      
      if (!serviceDoc.exists) {
        throw new Error('Service non trouvé');
      }
      
      const serviceData = serviceDoc.data();
      
      // Récupérer les détails de l'abonnement
      const subscriptionDoc = await firestore
        .collection('services')
        .doc(serviceId)
        .collection('subscriptions')
        .doc(subscriptionId)
        .get();
      
      if (!subscriptionDoc.exists) {
        throw new Error('Abonnement non trouvé');
      }
      
      const subscriptionData = subscriptionDoc.data();
      
      // Vérifier s'il y a des places disponibles
      if ((subscriptionData.currentUsers || 0) >= (subscriptionData.maxUsers || 0)) {
        throw new Error('Cet abonnement est complet. Veuillez choisir un autre abonnement.');
      }
      
      const safeDuration = isRecurring ? DAYS_IN_MONTH : clampDuration(duration);
      const startDate = new Date();
      const expiryDate = new Date(startDate.getTime() + (safeDuration * 24 * 60 * 60 * 1000));
      const proratedPrice = isRecurring
        ? calculateDiscountedMonthly(subscriptionData.price)
        : calculatePrice(subscriptionData.price, safeDuration);
      
      if (proratedPrice <= 0) {
        throw new Error("Erreur de calcul du prix. Veuillez réessayer.");
      }
      
      // Transaction Firestore pour assurer l'atomicité
      return firestore.runTransaction(async (transaction) => {
        // Récupérer le document à jour dans la transaction
        const freshSubDoc = await transaction.get(subscriptionDoc.ref);
        
        if (!freshSubDoc.exists) {
          throw new Error("L'abonnement n'existe plus");
        }
        
        const freshSubData = freshSubDoc.data();
        
        // Revérifier dans la transaction s'il y a des places disponibles
        if ((freshSubData.currentUsers || 0) >= (freshSubData.maxUsers || 0)) {
          throw new Error('Cet abonnement est maintenant complet. Veuillez choisir un autre abonnement.');
        }
        
        // Créer l'entrée utilisateur à ajouter à l'abonnement
        const userEntry = {
          userId: currentUser.uid,
          displayName: currentUser.displayName || 'Utilisateur',
          email: currentUser.email,
          joinedAt: startDate,
          expiryDate: expiryDate,
          paymentId: paymentId,
          duration: duration,
          isRecurring: isRecurring
        };
        
        // Mettre à jour l'abonnement
        transaction.update(subscriptionDoc.ref, {
          currentUsers: ((freshSubData.currentUsers || 0) + 1),
          users: [...(freshSubData.users || []), userEntry]
        });
        
        // Créer l'entrée d'abonnement utilisateur
        const userSubscriptionRef = firestore.collection('userSubscriptions').doc();
        
        const userSubscriptionData = {
          userId: currentUser.uid,
          serviceId: serviceId,
          serviceName: serviceData.name,
          subscriptionId: subscriptionId,
          subscriptionName: subscriptionData.name || serviceData.name,
          accessType: subscriptionData.accessType || 'account',
          email: subscriptionData.accessType === 'account' ? subscriptionData.email : null,
          password: subscriptionData.accessType === 'account' ? subscriptionData.password : null,
          invitationLink: subscriptionData.accessType === 'invitation' ? subscriptionData.invitationLink : null,
          accessLink: subscriptionData.accessLink || null,
          startDate: startDate,
          expiryDate: expiryDate,
          isActive: true,
          isRecurring: isRecurring,
          paymentId: paymentId,
          originalPrice: subscriptionData.price,
          proratedPrice: proratedPrice,
          duration: duration,
          nextBillingDate: isRecurring ? new Date(startDate.getTime() + (DAYS_IN_MONTH * 24 * 60 * 60 * 1000)) : null,
          createdAt: startDate
        };
        
        transaction.set(userSubscriptionRef, userSubscriptionData);
        
        return {
          userSubscriptionId: userSubscriptionRef.id,
          ...userSubscriptionData
        };
      });
    } catch (error) {
      console.error('Erreur lors de l\'achat de l\'abonnement:', error);
      setError(error.message || "Erreur lors de l'achat de l'abonnement");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [calculateProRatedPrice, currentUser]);

  // Admin Functions - avec validation améliorée
  const addService = useCallback(async (serviceData) => {
    if (!serviceData || !serviceData.name) {
      throw new Error("Données de service invalides");
    }
    
    try {
      // Validation des données requises
      if (!serviceData.name || !serviceData.description) {
        throw new Error("Le nom et la description sont requis");
      }
      
      return firestore.collection('services').add({
        ...serviceData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du service:', error);
      setError(error.message || "Erreur lors de l'ajout du service");
      throw error;
    }
  }, []);

  const updateService = useCallback(async (serviceId, serviceData) => {
    if (!serviceId || !serviceData) {
      throw new Error("ID de service ou données manquants");
    }
    
    try {
      // Vérifier si le service existe
      const serviceDoc = await firestore.collection('services').doc(serviceId).get();
      
      if (!serviceDoc.exists) {
        throw new Error("Service non trouvé");
      }
      
      return firestore.collection('services').doc(serviceId).update({
        ...serviceData,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du service:', error);
      setError(error.message || "Erreur lors de la mise à jour du service");
      throw error;
    }
  }, []);

  const deleteService = useCallback(async (serviceId) => {
    if (!serviceId) {
      throw new Error("ID de service manquant");
    }
    
    try {
      // Vérifier si le service existe
      const serviceDoc = await firestore.collection('services').doc(serviceId).get();
      
      if (!serviceDoc.exists) {
        throw new Error("Service non trouvé");
      }
      
      return firestore.collection('services').doc(serviceId).delete();
    } catch (error) {
      console.error('Erreur lors de la suppression du service:', error);
      setError(error.message || "Erreur lors de la suppression du service");
      throw error;
    }
  }, []);

  const addSubscription = useCallback(async (serviceId, subscriptionData) => {
    if (!serviceId || !subscriptionData) {
      throw new Error("ID de service ou données d'abonnement manquants");
    }
    
    try {
      // Vérifier si le service existe
      const serviceDoc = await firestore.collection('services').doc(serviceId).get();
      
      if (!serviceDoc.exists) {
        throw new Error("Service non trouvé");
      }
      
      // Validation des données requises
      if (!subscriptionData.name || !subscriptionData.price || !subscriptionData.maxUsers) {
        throw new Error("Nom, prix et nombre maximum d'utilisateurs requis");
      }
      
      return firestore
        .collection('services')
        .doc(serviceId)
        .collection('subscriptions')
        .add({
          ...subscriptionData,
          currentUsers: 0,
          users: [],
          createdAt: new Date(),
          updatedAt: new Date()
        });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'abonnement:', error);
      setError(error.message || "Erreur lors de l'ajout de l'abonnement");
      throw error;
    }
  }, []);

  const updateSubscription = useCallback(async (serviceId, subscriptionId, subscriptionData) => {
    if (!serviceId || !subscriptionId || !subscriptionData) {
      throw new Error("Paramètres manquants pour la mise à jour de l'abonnement");
    }
    
    try {
      // Vérifier si l'abonnement existe
      const subscriptionDoc = await firestore
        .collection('services')
        .doc(serviceId)
        .collection('subscriptions')
        .doc(subscriptionId)
        .get();
      
      if (!subscriptionDoc.exists) {
        throw new Error("Abonnement non trouvé");
      }
      
      return firestore
        .collection('services')
        .doc(serviceId)
        .collection('subscriptions')
        .doc(subscriptionId)
        .update({
          ...subscriptionData,
          updatedAt: new Date()
        });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'abonnement:', error);
      setError(error.message || "Erreur lors de la mise à jour de l'abonnement");
      throw error;
    }
  }, []);

  const deleteSubscription = useCallback(async (serviceId, subscriptionId) => {
    if (!serviceId || !subscriptionId) {
      throw new Error("ID de service ou d'abonnement manquant");
    }
    
    try {
      // Vérifier si l'abonnement existe
      const subscriptionDoc = await firestore
        .collection('services')
        .doc(serviceId)
        .collection('subscriptions')
        .doc(subscriptionId)
        .get();
      
      if (!subscriptionDoc.exists) {
        throw new Error("Abonnement non trouvé");
      }
      
      // Vérifier s'il y a des utilisateurs actifs
      const subscriptionData = subscriptionDoc.data();
      
      if (subscriptionData.currentUsers > 0) {
        throw new Error("Impossible de supprimer un abonnement avec des utilisateurs actifs");
      }
      
      return firestore
        .collection('services')
        .doc(serviceId)
        .collection('subscriptions')
        .doc(subscriptionId)
        .delete();
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'abonnement:', error);
      setError(error.message || "Erreur lors de la suppression de l'abonnement");
      throw error;
    }
  }, []);

  // Fonction pour rafraîchir les services
  const refreshServices = useCallback(async () => {
    try {
      setLoading(true);
      const servicesSnapshot = await firestore.collection('services').get();
      
      const servicesData = servicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMainServices(servicesData);
      setError(null);
    } catch (err) {
      console.error("Erreur lors du rechargement des services:", err);
      setError(err.message || "Erreur de rechargement des services");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fonction pour nettoyer les erreurs
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    mainServices,
    availableSubscriptions,
    userSubscriptions,
    loading,
    error,
    getAvailableSubscriptions,
    purchaseSubscription,
    calculateProRatedPrice,
    refreshServices,
    clearError,
    // Admin functions
    addService,
    updateService,
    deleteService,
    addSubscription,
    updateSubscription,
    deleteSubscription
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}