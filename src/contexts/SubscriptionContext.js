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
  const { currentUser } = useAuth();

  // Récupérer les services principaux disponibles
  useEffect(() => {
    const unsubscribe = firestore.collection('services')
      .onSnapshot(snapshot => {
        const servicesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMainServices(servicesData);
        setLoading(false);
      });

    return unsubscribe;
  }, []);

  // Récupérer les abonnements de l'utilisateur
  useEffect(() => {
    if (!currentUser) {
      setUserSubscriptions([]);
      return;
    }

    const unsubscribe = firestore.collection('userSubscriptions')
      .where('userId', '==', currentUser.uid)
      .onSnapshot(snapshot => {
        const subscriptionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUserSubscriptions(subscriptionsData);
      });

    return unsubscribe;
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
      return [];
    }
  };

  // Acheter un abonnement
  const purchaseSubscription = async (serviceId, subscriptionId, paymentId) => {
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
      
      // Transaction Firestore pour assurer l'atomicité
      return firestore.runTransaction(async (transaction) => {
        // Récupérer le document à jour dans la transaction
        const freshSubDoc = await transaction.get(subscriptionDoc.ref);
        const freshSubData = freshSubDoc.data();
        
        // Revérifier dans la transaction s'il y a des places disponibles
        if (freshSubData.currentUsers >= freshSubData.maxUsers) {
          throw new Error('Cet abonnement est complet');
        }
        
        // Définir les dates de début et d'expiration
        const startDate = new Date();
        const expiryDate = new Date(startDate.getTime() + (subscriptionData.duration * 24 * 60 * 60 * 1000));
        
        // Créer l'entrée utilisateur à ajouter à l'abonnement
        const userEntry = {
          userId: currentUser.uid,
          displayName: currentUser.displayName || 'Utilisateur',
          email: currentUser.email,
          joinedAt: startDate,
          expiryDate: expiryDate,
          paymentId: paymentId
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
          price: subscriptionData.price,
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
      throw error;
    }
  };

  // Admin Functions
  async function addService(serviceData) {
    return firestore.collection('services').add({
      ...serviceData,
      createdAt: new Date()
    });
  }

  async function updateService(serviceId, serviceData) {
    return firestore.collection('services').doc(serviceId).update({
      ...serviceData,
      updatedAt: new Date()
    });
  }

  async function deleteService(serviceId) {
    // Note: Cette fonction devrait également supprimer tous les abonnements associés
    // Mais c'est mieux de le faire avec une fonction Cloud Firebase pour assurer l'atomicité
    return firestore.collection('services').doc(serviceId).delete();
  }

  async function addSubscription(serviceId, subscriptionData) {
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
  }

  async function updateSubscription(serviceId, subscriptionId, subscriptionData) {
    return firestore
      .collection('services')
      .doc(serviceId)
      .collection('subscriptions')
      .doc(subscriptionId)
      .update({
        ...subscriptionData,
        updatedAt: new Date()
      });
  }

  async function deleteSubscription(serviceId, subscriptionId) {
    // Note: Cette fonction devrait également vérifier s'il y a des utilisateurs actifs
    // Mais c'est mieux de le faire avec une fonction Cloud Firebase
    return firestore
      .collection('services')
      .doc(serviceId)
      .collection('subscriptions')
      .doc(subscriptionId)
      .delete();
  }

  const value = {
    mainServices,
    availableSubscriptions,
    userSubscriptions,
    loading,
    getAvailableSubscriptions,
    purchaseSubscription,
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