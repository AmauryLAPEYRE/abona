import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { firestore } from '../firebase';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export function useSubscriptions() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }) {
  const [mainServices, setMainServices] = useState([]);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [loadingStates, setLoadingStates] = useState({
    services: true,
    userSubscriptions: true,
    operations: false
  });
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  
  // Cache pour les abonnements disponibles par service
  const availableSubscriptionsCache = useRef({});
  
  // Fonction pour mettre à jour les états de chargement individuellement
  const setLoading = useCallback((key, value) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Calcul de l'état de chargement global
  const loading = loadingStates.services || loadingStates.userSubscriptions || loadingStates.operations;

  // Récupérer les services principaux disponibles avec mise en cache
  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};
    
    const fetchServices = async () => {
      try {
        setLoading('services', true);
        
        // Établir un écouteur en temps réel pour les services
        unsubscribe = firestore.collection('services')
          .onSnapshot(snapshot => {
            if (!isMounted) return;
            
            const servicesData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            setMainServices(servicesData);
            setError(null);
            setLoading('services', false);
          }, err => {
            console.error("Erreur lors du chargement des services:", err);
            if (isMounted) {
              setError(err.message || "Erreur de chargement des services");
              setLoading('services', false);
            }
          });
      } catch (err) {
        console.error("Erreur lors de la configuration de l'écouteur des services:", err);
        if (isMounted) {
          setError(err.message || "Erreur de configuration des services");
          setLoading('services', false);
        }
      }
    };

    fetchServices();
    
    // Nettoyage pour éviter les fuites de mémoire
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [setLoading]);

  // Récupérer les abonnements de l'utilisateur avec gestion des erreurs améliorée
  useEffect(() => {
    let unsubscribe = () => {};
    let isMounted = true;
    
    if (!currentUser) {
      setUserSubscriptions([]);
      setLoading('userSubscriptions', false);
      return () => {};
    }

    try {
      setLoading('userSubscriptions', true);
      
      // Écouter les changements dans les abonnements de l'utilisateur
      unsubscribe = firestore.collection('userSubscriptions')
        .where('userId', '==', currentUser.uid)
        .onSnapshot(snapshot => {
          if (!isMounted) return;
          
          const subscriptionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Trier les abonnements par date d'expiration (les plus proches d'abord)
          subscriptionsData.sort((a, b) => {
            const dateA = a.expiryDate?.toDate() || new Date(0);
            const dateB = b.expiryDate?.toDate() || new Date(0);
            return dateA - dateB;
          });
          
          setUserSubscriptions(subscriptionsData);
          setLoading('userSubscriptions', false);
          setError(null);
        }, err => {
          console.error("Erreur lors de l'écoute des abonnements:", err);
          if (isMounted) {
            setError(err.message || "Erreur de chargement des abonnements utilisateur");
            setLoading('userSubscriptions', false);
          }
        });
    } catch (err) {
      console.error("Erreur lors de la configuration de l'écoute des abonnements:", err);
      if (isMounted) {
        setError(err.message || "Erreur de configuration des abonnements");
        setLoading('userSubscriptions', false);
      }
    }

    // Nettoyage à la désinscription
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentUser, setLoading]);

  // Obtenir les abonnements disponibles pour un service avec mise en cache
  const getAvailableSubscriptions = useCallback(async (serviceId) => {
    if (!serviceId) {
      setError("ID de service manquant");
      return [];
    }
    
    // Vérifier d'abord si nous avons des données en cache
    const cacheKey = `service_${serviceId}`;
    const cacheEntry = availableSubscriptionsCache.current[cacheKey];
    
    // Si les données en cache sont récentes (moins de 5 minutes), on les utilise
    if (cacheEntry && (Date.now() - cacheEntry.timestamp) < 5 * 60 * 1000) {
      return cacheEntry.data;
    }
    
    try {
      setLoading('operations', true);
      
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
      
      // Mettre en cache les résultats
      availableSubscriptionsCache.current[cacheKey] = {
        data: availableSubs,
        timestamp: Date.now()
      };
      
      setError(null);
      setLoading('operations', false);
      return availableSubs;
    } catch (error) {
      console.error('Erreur lors de la récupération des abonnements:', error);
      setError(error.message || "Erreur de récupération des abonnements disponibles");
      setLoading('operations', false);
      return [];
    }
  }, [setLoading]);

  // Calculer le prix proratisé avec une logique plus robuste
  const calculateProRatedPrice = useCallback((basePrice, duration) => {
    if (!basePrice || !duration || basePrice <= 0 || duration <= 0) {
      console.warn("Paramètres invalides pour le calcul du prix proratisé", { basePrice, duration });
      return 0;
    }
    
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dailyRate = basePrice / daysInMonth;
    
    // Limiter à 2 décimales et s'assurer que le résultat est un nombre
    const result = parseFloat((dailyRate * duration).toFixed(2));
    return isNaN(result) ? 0 : result;
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
      setLoading('operations', true);
      
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
      
      // Calculer le prix proratisé ou utiliser le prix mensuel complet
      const startDate = new Date();
      const expiryDate = new Date(startDate.getTime() + (duration * 24 * 60 * 60 * 1000));
      const proratedPrice = isRecurring 
        ? subscriptionData.price 
        : calculateProRatedPrice(subscriptionData.price, duration);
      
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
          nextBillingDate: isRecurring ? new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000)) : null,
          createdAt: startDate
        };
        
        transaction.set(userSubscriptionRef, userSubscriptionData);
        
        // Invalider le cache pour ce service
        delete availableSubscriptionsCache.current[`service_${serviceId}`];
        
        return {
          userSubscriptionId: userSubscriptionRef.id,
          ...userSubscriptionData
        };
      }).finally(() => {
        setLoading('operations', false);
      });
    } catch (error) {
      console.error('Erreur lors de l\'achat de l\'abonnement:', error);
      setError(error.message || "Erreur lors de l'achat de l'abonnement");
      setLoading('operations', false);
      throw error;
    }
  }, [calculateProRatedPrice, currentUser, setLoading]);

  // Fonction pour rafraîchir les services
  const refreshServices = useCallback(async () => {
    try {
      setLoading('services', true);
      
      // Vider le cache des abonnements
      availableSubscriptionsCache.current = {};
      
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
      setLoading('services', false);
    }
  }, [setLoading]);

  // Fonction pour nettoyer les erreurs
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // === Fonctions d'administration ===
  
  // Ajouter un service
  const addService = useCallback(async (serviceData) => {
    if (!serviceData || !serviceData.name) {
      throw new Error("Données de service invalides");
    }
    
    try {
      setLoading('operations', true);
      
      // Validation des données requises
      if (!serviceData.name || !serviceData.description) {
        throw new Error("Le nom et la description sont requis");
      }
      
      const result = await firestore.collection('services').add({
        ...serviceData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Rafraîchir automatiquement la liste des services
      refreshServices();
      
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du service:', error);
      setError(error.message || "Erreur lors de l'ajout du service");
      throw error;
    } finally {
      setLoading('operations', false);
    }
  }, [refreshServices, setLoading]);

  // Mettre à jour un service
  const updateService = useCallback(async (serviceId, serviceData) => {
    if (!serviceId || !serviceData) {
      throw new Error("ID de service ou données manquants");
    }
    
    try {
      setLoading('operations', true);
      
      // Vérifier si le service existe
      const serviceDoc = await firestore.collection('services').doc(serviceId).get();
      
      if (!serviceDoc.exists) {
        throw new Error("Service non trouvé");
      }
      
      await firestore.collection('services').doc(serviceId).update({
        ...serviceData,
        updatedAt: new Date()
      });
      
      // Rafraîchir automatiquement la liste des services
      refreshServices();
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du service:', error);
      setError(error.message || "Erreur lors de la mise à jour du service");
      throw error;
    } finally {
      setLoading('operations', false);
    }
  }, [refreshServices, setLoading]);

  // Supprimer un service
  const deleteService = useCallback(async (serviceId) => {
    if (!serviceId) {
      throw new Error("ID de service manquant");
    }
    
    try {
      setLoading('operations', true);
      
      // Vérifier si le service existe
      const serviceDoc = await firestore.collection('services').doc(serviceId).get();
      
      if (!serviceDoc.exists) {
        throw new Error("Service non trouvé");
      }
      
      // Récupérer tous les abonnements de ce service
      const subscriptionsSnapshot = await firestore
        .collection('services')
        .doc(serviceId)
        .collection('subscriptions')
        .get();
      
      // Utiliser un batch pour supprimer tous les abonnements et le service
      const batch = firestore.batch();
      
      subscriptionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      batch.delete(firestore.collection('services').doc(serviceId));
      
      await batch.commit();
      
      // Rafraîchir automatiquement la liste des services
      refreshServices();
      
      // Invalider le cache pour ce service
      delete availableSubscriptionsCache.current[`service_${serviceId}`];
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du service:', error);
      setError(error.message || "Erreur lors de la suppression du service");
      throw error;
    } finally {
      setLoading('operations', false);
    }
  }, [refreshServices, setLoading]);

  // Ajouter un abonnement à un service
  const addSubscription = useCallback(async (serviceId, subscriptionData) => {
    if (!serviceId || !subscriptionData) {
      throw new Error("ID de service ou données d'abonnement manquants");
    }
    
    try {
      setLoading('operations', true);
      
      // Vérifier si le service existe
      const serviceDoc = await firestore.collection('services').doc(serviceId).get();
      
      if (!serviceDoc.exists) {
        throw new Error("Service non trouvé");
      }
      
      // Validation des données requises
      if (!subscriptionData.name || !subscriptionData.price || !subscriptionData.maxUsers) {
        throw new Error("Nom, prix et nombre maximum d'utilisateurs requis");
      }
      
      const result = await firestore
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
      
      // Invalider le cache pour ce service
      delete availableSubscriptionsCache.current[`service_${serviceId}`];
      
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'abonnement:', error);
      setError(error.message || "Erreur lors de l'ajout de l'abonnement");
      throw error;
    } finally {
      setLoading('operations', false);
    }
  }, [setLoading]);

  // Mettre à jour un abonnement
  const updateSubscription = useCallback(async (serviceId, subscriptionId, subscriptionData) => {
    if (!serviceId || !subscriptionId || !subscriptionData) {
      throw new Error("Paramètres manquants pour la mise à jour de l'abonnement");
    }
    
    try {
      setLoading('operations', true);
      
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
      
      await firestore
        .collection('services')
        .doc(serviceId)
        .collection('subscriptions')
        .doc(subscriptionId)
        .update({
          ...subscriptionData,
          updatedAt: new Date()
        });
      
      // Invalider le cache pour ce service
      delete availableSubscriptionsCache.current[`service_${serviceId}`];
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'abonnement:', error);
      setError(error.message || "Erreur lors de la mise à jour de l'abonnement");
      throw error;
    } finally {
      setLoading('operations', false);
    }
  }, [setLoading]);

  // Supprimer un abonnement
  const deleteSubscription = useCallback(async (serviceId, subscriptionId) => {
    if (!serviceId || !subscriptionId) {
      throw new Error("ID de service ou d'abonnement manquant");
    }
    
    try {
      setLoading('operations', true);
      
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
      
      await firestore
        .collection('services')
        .doc(serviceId)
        .collection('subscriptions')
        .doc(subscriptionId)
        .delete();
      
      // Invalider le cache pour ce service
      delete availableSubscriptionsCache.current[`service_${serviceId}`];
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'abonnement:', error);
      setError(error.message || "Erreur lors de la suppression de l'abonnement");
      throw error;
    } finally {
      setLoading('operations', false);
    }
  }, [setLoading]);

  // Valeur du contexte à exposer
  const value = {
    mainServices,
    userSubscriptions,
    loading,
    error,
    getAvailableSubscriptions,
    purchaseSubscription,
    calculateProRatedPrice,
    refreshServices,
    clearError,
    // Fonctions d'administration
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