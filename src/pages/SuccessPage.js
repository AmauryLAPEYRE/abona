import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { firestore } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const SuccessPage = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!location.state || !location.state.serviceId || !currentUser) {
        setLoading(false);
        return;
      }
      
      const subscriptionsSnapshot = await firestore
        .collection('subscriptions')
        .where('userId', '==', currentUser.uid)
        .where('serviceId', '==', location.state.serviceId)
        .orderBy('startDate', 'desc')
        .limit(1)
        .get();
      
      if (!subscriptionsSnapshot.empty) {
        setSubscription({
          id: subscriptionsSnapshot.docs[0].id,
          ...subscriptionsSnapshot.docs[0].data()
        });
      }
      
      setLoading(false);
    };
    
    fetchSubscription();
  }, [location.state, currentUser]);

  if (loading) {
    return <div className="text-center py-10">Chargement...</div>;
  }
  
  if (!location.state || !location.state.serviceId) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Erreur</h1>
        <p>Impossible de trouver les informations de l'abonnement.</p>
        <Link to="/dashboard" className="text-blue-600">Retour au tableau de bord</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-6">
        <h1 className="text-2xl font-bold mb-2">Paiement réussi!</h1>
        <p>Votre abonnement à {location.state.serviceName} a été activé.</p>
      </div>
      
      {subscription && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Détails de votre abonnement</h2>
          
          <div className="mb-4">
            <p className="font-bold mb-1">Email:</p>
            <p className="bg-gray-100 p-2 rounded">{subscription.email}</p>
          </div>
          
          <div className="mb-4">
            <p className="font-bold mb-1">Mot de passe:</p>
            <p className="bg-gray-100 p-2 rounded">{subscription.password}</p>
          </div>
          
          {subscription.accessLink && (
            <div className="mb-4">
              <p className="font-bold mb-1">Lien d'accès:</p>
              <a 
                href={subscription.accessLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 underline break-all"
              >
                {subscription.accessLink}
              </a>
            </div>
          )}
          
          <div className="flex justify-between text-sm text-gray-600 mt-4">
            <p>Date d'expiration: {new Date(subscription.expiryDate.toDate()).toLocaleDateString()}</p>
          </div>
        </div>
      )}
      
      <div className="flex justify-center space-x-4">
        <Link 
          to="/dashboard" 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Mes abonnements
        </Link>
        <Link 
          to="/" 
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg"
        >
          Accueil
        </Link>
      </div>
    </div>
  );
};

export default SuccessPage;