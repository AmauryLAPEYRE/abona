import React, { createContext, useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import { firestore } from '../firebase';
import { useAuth } from './AuthContext';
import { getDocumentWithCache, getCollectionWithCache, executeQueryWithCache, invalidateCache } from '../utils/firestoreCache';
import { isOnline, executeWithResilience, formatDate, validatePrice } from '../utils/errorUtils';

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
  
  // Cache pour les calculs de prix proratisés pour éviter les recalculs fréquents
  const proratedPriceCache = useRef({});
  
  // Référence pour les écouteurs Firestore
  const unsubscribeRefs = useRef({});
  
  // Fonction pour mettre à jour les états de chargement individuellement
  const setLoading = useCallback((key, value) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Calcul de l'état de chargement global - mémorisé pour éviter les recalculs inutiles
  const loading = useMemo(() => {
    return loadingStates.services || loadingStates.userSubscriptions || loadingStates.operations;
  }, [loadingStates]);

  // Récupérer les services principaux disponibles avec mise en cache
  useEffect(() => {
    let isMounted = true;
    
    const fetchServices = async () => {
      try {
        setLoading('services', true);
        
        // Utiliser notre fonction optimisée de mise en cache
        const result = await getCollectionWithCache('services', {}, {
          forceRefresh: false,
          priority: 'low' // Les services changent rarement
        });
        
        if (!isMounted) return;
        
        setMainServices(result.data);
        setError(null);
        setLoading('services', false);
        
        // Configurer également un écouteur en temps réel pour les mises à jour
        // Mais avec une fréquence plus faible pour réduire les coûts Firestore
        const unsubscribe = firestore.collection('services')
          .onSnapshot({
            includeMetadataChanges: false, // Optimisation pour réduire le trafic
            snapshotListenOptions: { 
              source: 'server' // N'écoute que les modifications réelles du serveur
            }
          }, snapshot => {
            if (!isMounted) return;
            
            // Vérifier si des modifications réelles se sont produites
            const servicesData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Ne mettre à jour que si les données ont réellement changé
            if (JSON.stringify(servicesData) !== JSON.stringify(mainServices)) {
              setMainServices(servicesData);
              // Invalider le cache pour forcer un rafraîchissement
              invalidateCache('services', 'collection');
            }
          }, err => {
            console.error("Erreur lors de l'écoute des services:", err);
          });
        
        unsubscribeRefs.current.services = unsubscribe;
      } catch (err) {
        console.error("Erreur lors du chargement des services:", err);
        if (isMounted) {
          setError(err.message || "Erreur de chargement des services");
          setLoading('services', false);
        }
      }
    };

    fetchServices();
    
    // Nettoyage pour éviter les fuites de mémoire
    return () => {
      isMounted = false;
      if (unsubscribeRefs.current.services) {
        unsubscribeRefs.current.services();
      }
    };
  }, [setLoading]);

  // Récupérer les abonnements de l'utilisateur avec gestion des erreurs améliorée et mise en cache
  useEffect(() => {
    let unsubscribe = () => {};
    let isMounted = true;
    
    if (!currentUser) {
      setUserSubscriptions([]);
      setLoading('userSubscriptions', false);
      return () => {};
    }

    const fetchUserSubscriptions = async () => {
      try {
        setLoading('userSubscriptions', true);
        
        // Utiliser d'abord les données en cache si disponibles pour un affichage rapide
        try {
          const cachedResult = await getCollectionWithCache(
            'userSubscriptions', 
            { where: [['userId', '==', currentUser.uid]] },
            { forceRefresh: false }
          );
          
          if (isMounted && cachedResult.data.length > 0) {
            // Trier les abonnements - expiration la plus proche d'abord
            const sortedData = [...cachedResult.data].sort((a, b) => {
              const dateA = a.expiryDate?.toDate() || new Date(0);
              const dateB = b.expiryDate?.toDate() || new Date(0);
              return dateA - dateB;
            });
            
            setUserSubscriptions(sortedData);
            setLoading('userSubscriptions', cachedResult.fromCache); // Si depuis le cache, continuer à charger
          }
        } catch (err) {
          // Ignorer les erreurs de cache et continuer avec l'écoute en direct
          console.log("Cache non disponible pour les abonnements, chargement normal...");
        }
        
        // Configurer un écouteur en temps réel pour les mises à jour
        // Filtre optimisé pour les performances
        unsubscribe = firestore.collection('userSubscriptions')
          .where('userId', '==', currentUser.uid)
          .onSnapshot({
            includeMetadataChanges: false, // Performance optimization
          }, snapshot => {
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
            
            // Mettre à jour le cache avec les nouvelles données
            invalidateCache('userSubscriptions', 'collection');
          }, err => {
            console.error("Erreur lors de l'écoute des abonnements:", err);
            if (isMounted) {
              setError(err.message || "Erreur de chargement des abonnements utilisateur");
              setLoading('userSubscriptions', false);
            }
          });
        
        unsubscribeRefs.current.userSubscriptions = unsubscribe;
      } catch (err) {
        console.error("Erreur lors de la configuration de l'écoute des abonnements:", err);
        if (isMounted) {
          setError(err.message || "Erreur de configuration des abonnements");
          setLoading('userSubscriptions', false);
        }
      }
    };

    fetchUserSubscriptions();

    // Nettoyage à la désinscription
    return () => {
      isMounted = false;
      unsubscribe();
      if (unsubscribeRefs.current.userSubscriptions) {
        unsubscribeRefs.current.userSubscriptions();
      }
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
    
    // Si les données en cache sont récentes (moins de 30 secondes), on les utilise
    if (cacheEntry && (Date.now() - cacheEntry.timestamp) < 30 * 1000) {
      return cacheEntry.data;
    }
    
    try {
      setLoading('operations', true);
      
      // Exécuter avec résilience pour une meilleure robustesse
      const availableSubs = await executeWithResilience(
        async () => {
          // Vérifier d'abord si le service existe
          const serviceDoc = await getDocumentWithCache(`services/${serviceId}`);
          
          if (!serviceDoc.exists) {
            throw new Error("Service non trouvé");
          }
          
          // Récupérer tous les abonnements actifs pour ce service avec notre cache optimisé
          const result = await getCollectionWithCache(
            `services/${serviceId}/subscriptions`,
            { where: [['isActive', '==', true]] }
          );
          
          // Filtrer pour ne garder que ceux qui ont des places disponibles
          return result.data
            .filter(sub => (sub.currentUsers || 0) < (sub.maxUsers || 0));
        },
        {
          retries: 2,
          fallbackValue: [], // En cas d'échec, retourner un tableau vide plutôt que de générer une erreur
          onRetry: (error, attempt) => {
            console.warn(`Tentative ${attempt} échouée pour getAvailableSubscriptions:`, error);
          }
        }
      );
      
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

  // Calculer le prix proratisé avec une logique plus robuste et mise en cache
  const calculateProRatedPrice = useCallback((basePrice, duration) => {
    // Valider les entrées
    if (typeof basePrice !== 'number' || typeof duration !== 'number' || 
        isNaN(basePrice) || isNaN(duration) || 
        basePrice <= 0 || duration <= 0) {
      console.warn("Paramètres invalides pour le calcul du prix proratisé", { basePrice, duration });
      return 0;
    }
    
    // Vérifier le cache pour éviter les recalculs
    const cacheKey = `${basePrice}_${duration}`;
    if (proratedPriceCache.current[cacheKey] !== undefined) {
      return proratedPriceCache.current[cacheKey];
    }
    
    // Calculer le nombre de jours dans le mois actuel pour une tarification précise
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dailyRate = basePrice / daysInMonth;
    
    // Calculer le prix proratisé et arrondir à 2 décimales
    const proratedPrice = Math.round((dailyRate * duration) * 100) / 100;
    
    // Mettre en cache le résultat
    proratedPriceCache.current[cacheKey] = proratedPrice;
    
    return proratedPrice;
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
      
      // Récupérer les détails du service et de l'abonnement à l'aide des fonctions cache
      const serviceDoc = await getDocumentWithCache(`services/${serviceId}`, { 
        priority: 'high' // Priorité élevée pour un chargement frais
      });
      
      if (!serviceDoc.exists) {
        throw new Error('Service non trouvé');
      }
      
      const serviceData = serviceDoc;
      
      const subscriptionDoc = await getDocumentWithCache(
        `services/${serviceId}/subscriptions/${subscriptionId}`,
        { priority: 'high' }
      );
      
      if (!subscriptionDoc.exists) {
        throw new Error('Abonnement non trouvé');
      }
      
      const subscriptionData = subscriptionDoc;
      
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
        const subscriptionRef = firestore
          .collection('services')
          .doc(serviceId)
          .collection('subscriptions')
          .doc(subscriptionId);
          
        const freshSubDoc = await transaction.get(subscriptionRef);
        
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
        transaction.update(subscriptionRef, {
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
        
        // Invalider le cache pour ce service et cet abonnement
        invalidateCache(`services/${serviceId}/subscriptions`, 'collection');
        
        // Supprimer du cache pour forcer un rechargement frais la prochaine fois
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
      
      // Invalider le cache Firestore
      invalidateCache('services', 'collection');
      
      // Forcer un rechargement frais
      const result = await getCollectionWithCache('services', {}, { 
        forceRefresh: true 
      });
      
      setMainServices(result.data);
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

  // Valeur du contexte à exposer - mémorisée pour éviter les rendus inutiles
  const contextValue = useMemo(() => ({
    mainServices,
    userSubscriptions,
    loading,
    error,
    getAvailableSubscriptions,
    purchaseSubscription,
    calculateProRatedPrice,
    refreshServices,
    clearError
  }), [
    mainServices,
    userSubscriptions,
    loading,
    error,
    getAvailableSubscriptions,
    purchaseSubscription,
    calculateProRatedPrice,
    refreshServices,
    clearError
  ]);

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};