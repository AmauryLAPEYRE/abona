import React, { useEffect, useState } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
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
      
      try {
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
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setLoading(false);
      }
    };
    
    fetchSubscription();
  }, [location.state, currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Rediriger si aucun état n'est fourni
  if (!location.state || !location.state.serviceId) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-white p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Paiement réussi !</h1>
            <p className="text-white/90">
              Votre abonnement à {location.state.serviceName} a été activé avec succès.
            </p>
          </div>
          
          <div className="p-6">
            {subscription ? (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Détails de votre abonnement</h2>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Email d'accès</p>
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-800">{subscription.email}</p>
                      <button 
                        onClick={() => {navigator.clipboard.writeText(subscription.email)}}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Mot de passe</p>
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-800">{subscription.password}</p>
                      <button 
                        onClick={() => {navigator.clipboard.writeText(subscription.password)}}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                  
                  {subscription.accessLink && (
                    <div>
                      <p className="text-sm text-gray-500">Lien d'accès</p>
                      <div className="flex items-center justify-between">
                        <a 
                          href={subscription.accessLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 break-all"
                        >
                          {subscription.accessLink}
                        </a>
                        <button 
                          onClick={() => {navigator.clipboard.writeText(subscription.accessLink)}}
                          className="text-blue-600 hover:text-blue-800 text-sm ml-2 whitespace-nowrap"
                        >
                          Copier
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-500">Validité</p>
                    <p className="font-medium text-gray-800">
                      Jusqu'au {new Date(subscription.expiryDate.toDate()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Conservez ces informations dans un endroit sûr. Vous pouvez également les retrouver à tout moment dans votre tableau de bord.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Vos identifiants sont en cours de préparation. Ils seront bientôt disponibles dans votre tableau de bord.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Link 
                to="/dashboard" 
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Tableau de bord
              </Link>
              
              {subscription && subscription.accessLink && (
                <a 
                  href={subscription.accessLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Accéder maintenant
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;