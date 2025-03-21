import React, { createContext, useState, useEffect, useContext } from 'react';
import { firestore } from '../firebase';
import { useAuth } from './AuthContext';

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

  // Récupérer les services principaux disponibles
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const servicesSnapshot = await firestore.collection('services').get();
        const servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMainServices(servicesData);
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error("Erreur lors du chargement des services:", err);
        setError(err.message || "Erreur de chargement des services");
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  // Récupérer les abonnements de l'utilisateur
  useEffect(() => {
    if (!currentUser) {
      setUserSubscriptions([]);
      return;
    }

    try {
      const unsubscribe = firestore.collection('userSubscriptions')
        .where('userId', '==', currentUser.uid)
        .onSnapshot(snapshot => {
          const subscriptionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUserSubscriptions(subscriptionsData);
        }, err => {
          console.error("Erreur lors de l'écoute des abonnements:", err);
          setError(err.message || "Erreur de chargement des abonnements utilisateur");
        });

      return unsubscribe;
    } catch (err) {
      console.error("Erreur lors de la configuration de l'écoute des abonnements:", err);
      setError(err.message || "Erreur de configuration des abonnements");
      return () => {};
    }
  }, [currentUser]);

  // Obtenir les abonnements disponibles pour un service
  const getAvailableSubscriptions = async (serviceId) => {
    try {
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
        .filter(sub => (sub.currentUsers || 0) < sub.maxUsers);
      
      setAvailableSubscriptions(availableSubs);
      return availableSubs;
    } catch (error) {
      console.error('Erreur lors de la récupération des abonnements:', error);
      setError(error.message || "Erreur de récupération des abonnements disponibles");
      return [];
    }
  };

  // Calculer le prix proratisé
  const calculateProRatedPrice = (basePrice, duration) => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dailyRate = basePrice / daysInMonth;
    return parseFloat((dailyRate * duration).toFixed(2));
  };

  // Acheter un abonnement
  const purchaseSubscription = async (serviceId, subscriptionId, paymentId, duration) => {
    try {
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
      if (subscriptionData.currentUsers >= subscriptionData.maxUsers) {
        throw new Error('Cet abonnement est complet');
      }
      
      // Calculer le prix proratisé
      const startDate = new Date();
      const expiryDate = new Date(startDate.getTime() + (duration * 24 * 60 * 60 * 1000));
      const proratedPrice = calculateProRatedPrice(subscriptionData.price, duration);
      
      // Transaction Firestore pour assurer l'atomicité
      return firestore.runTransaction(async (transaction) => {
        // Récupérer le document à jour dans la transaction
        const freshSubDoc = await transaction.get(subscriptionDoc.ref);
        const freshSubData = freshSubDoc.data();
        
        // Revérifier dans la transaction s'il y a des places disponibles
        if (freshSubData.currentUsers >= freshSubData.maxUsers) {
          throw new Error('Cet abonnement est complet');
        }
        
        // Créer l'entrée utilisateur à ajouter à l'abonnement
        const userEntry = {
          userId: currentUser.uid,
          displayName: currentUser.displayName || 'Utilisateur',
          email: currentUser.email,
          joinedAt: startDate,
          expiryDate: expiryDate,
          paymentId: paymentId,
          duration: duration
        };
        
        // Mettre à jour l'abonnement
        transaction.update(subscriptionDoc.ref, {
          currentUsers: (freshSubData.currentUsers || 0) + 1,
          users: [...(freshSubData.users || []), userEntry]
        });
        
        // Créer l'entrée d'abonnement utilisateur
        const userSubscriptionRef = firestore.collection('userSubscriptions').doc();
        
        const userSubscriptionData = {
          userId: currentUser.uid,
          serviceId: serviceId,
          serviceName: serviceData.name,
          subscriptionId: subscriptionId,
          subscriptionName: subscriptionData.name,
          accessType: subscriptionData.accessType,
          email: subscriptionData.accessType === 'account' ? subscriptionData.email : null,
          password: subscriptionData.accessType === 'account' ? subscriptionData.password : null,
          invitationLink: subscriptionData.accessType === 'invitation' ? subscriptionData.invitationLink : null,
          startDate: startDate,
          expiryDate: expiryDate,
          isActive: true,
          paymentId: paymentId,
          originalPrice: subscriptionData.price,
          proratedPrice: proratedPrice,
          duration: duration,
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
    }
  };

  // Admin Functions
  async function addService(serviceData) {
    try {
      return firestore.collection('services').add({
        ...serviceData,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du service:', error);
      setError(error.message || "Erreur lors de l'ajout du service");
      throw error;
    }
  }

  async function updateService(serviceId, serviceData) {
    try {
      return firestore.collection('services').doc(serviceId).update({
        ...serviceData,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du service:', error);
      setError(error.message || "Erreur lors de la mise à jour du service");
      throw error;
    }
  }

  async function deleteService(serviceId) {
    try {
      return firestore.collection('services').doc(serviceId).delete();
    } catch (error) {
      console.error('Erreur lors de la suppression du service:', error);
      setError(error.message || "Erreur lors de la suppression du service");
      throw error;
    }
  }

  async function addSubscription(serviceId, subscriptionData) {
    try {
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
  }

  async function updateSubscription(serviceId, subscriptionId, subscriptionData) {
    try {
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
  }

  async function deleteSubscription(serviceId, subscriptionId) {
    try {
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
  }

  const value = {
    mainServices,
    availableSubscriptions,
    userSubscriptions,
    loading,
    error,
    getAvailableSubscriptions,
    purchaseSubscription,
    calculateProRatedPrice,
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