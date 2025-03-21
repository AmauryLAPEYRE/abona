import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { firestore } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const SubscriptionDetails = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const subscriptionDoc = await firestore.collection('subscriptions').doc(id).get();
        
        if (!subscriptionDoc.exists) {
          setError("Abonnement non trouvé");
          setLoading(false);
          return;
        }
        
        const subscriptionData = subscriptionDoc.data();
        
        // Vérifier que l'abonnement appartient à l'utilisateur connecté
        if (subscriptionData.userId !== currentUser.uid) {
          setError("Vous n'avez pas accès à cet abonnement");
          setLoading(false);
          return;
        }
        
        setSubscription({
          id: subscriptionDoc.id,
          ...subscriptionData
        });
        setLoading(false);
      } catch (err) {
        setError("Erreur lors du chargement de l'abonnement");
        setLoading(false);
      }
    };
    
    fetchSubscription();
  }, [id, currentUser]);

  if (loading) {
    return <div className="text-center py-10">Chargement...</div>;
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
        {error}
        <Link to="/dashboard" className="block mt-4 text-blue-600">Retour au tableau de bord</Link>
      </div>
    );
  }
  
  if (!subscription) {
    return <div className="text-center py-10">Abonnement non trouvé</div>;
  }

  const isExpired = new Date() > new Date(subscription.expiryDate.toDate());

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-6">Détails de l'abonnement</h1>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold">{subscription.serviceName}</h2>
            {isExpired ? (
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Expiré</span>
            ) : (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Actif</span>
            )}
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold mb-2">Informations d'accès</h3>
              
              <div className="mb-2">
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{subscription.email}</p>
              </div>
              
              <div className="mb-2">
                <p className="text-sm text-gray-500">Mot de passe</p>
                <p className="font-medium">{subscription.password}</p>
              </div>
              
              {subscription.accessLink && (
                <div>
                  <p className="text-sm text-gray-500">Lien d'accès</p>
                  <a 
                    href={subscription.accessLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 break-all"
                  >
                    {subscription.accessLink}
                  </a>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold mb-2">Détails de l'abonnement</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-gray-500">Date de début</p>
                  <p>{new Date(subscription.startDate.toDate()).toLocaleDateString()}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Date d'expiration</p>
                  <p>{new Date(subscription.expiryDate.toDate()).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Link 
          to="/dashboard" 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Retour aux abonnements
        </Link>
      </div>
    </div>
  );
};

export default SubscriptionDetails;