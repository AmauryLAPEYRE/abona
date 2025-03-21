import React, { createContext, useState, useEffect, useContext } from 'react';
import { firestore } from '../firebase';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export function useSubscriptions() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }) {
  const [services, setServices] = useState([]);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // Récupérer les services disponibles
  useEffect(() => {
    const unsubscribe = firestore.collection('services')
      .onSnapshot(snapshot => {
        const servicesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setServices(servicesData);
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

    const unsubscribe = firestore.collection('subscriptions')
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

  // Admin Functions
  async function addService(serviceData) {
    return firestore.collection('services').add({
      ...serviceData,
      createdAt: new Date()
    });
  }

  async function updateService(serviceId, serviceData) {
    return firestore.collection('services').doc(serviceId).update(serviceData);
  }

  async function deleteService(serviceId) {
    return firestore.collection('services').doc(serviceId).delete();
  }

  async function addSubscriptionCredentials(serviceId, credentials) {
    return firestore.collection('services').doc(serviceId).collection('credentials').add({
      ...credentials,
      inUse: false,
      createdAt: new Date()
    });
  }

  // User Functions
  async function getAvailableCredential(serviceId) {
    const snapshot = await firestore.collection('services')
      .doc(serviceId)
      .collection('credentials')
      .where('inUse', '==', false)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      throw new Error('No available credentials');
    }
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  }

  async function createSubscription(serviceId, paymentId, userId) {
    // Récupérer un identifiant disponible
    const credential = await getAvailableCredential(serviceId);
    const service = services.find(s => s.id === serviceId);
    
    // Marquer l'identifiant comme utilisé
    await firestore.collection('services')
      .doc(serviceId)
      .collection('credentials')
      .doc(credential.id)
      .update({ inUse: true });
    
    // Créer l'abonnement
    const subscription = {
      userId,
      serviceId,
      serviceName: service.name,
      credentialId: credential.id,
      paymentId,
      email: credential.email,
      password: credential.password,
      accessLink: credential.accessLink || null,
      startDate: new Date(),
      expiryDate: new Date(Date.now() + service.duration * 24 * 60 * 60 * 1000),
      status: 'active'
    };
    
    return firestore.collection('subscriptions').add(subscription);
  }

  const value = {
    services,
    userSubscriptions,
    loading,
    addService,
    updateService,
    deleteService,
    addSubscriptionCredentials,
    createSubscription,
    getAvailableCredential
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}