import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { firestore } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const SuccessPage = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copyStatus, setCopyStatus] = useState({});

  // Extraire les données d'état de navigation de manière sécurisée
  const navigationState = location.state || {};
  const { 
    serviceId, 
    serviceName, 
    userSubscriptionId, 
    subscriptionName,
    duration,
    price,
    isRecurring = false
  } = navigationState;

  // Fonction pour copier du texte avec retour d'état
  const copyToClipboard = useCallback((text, field) => {
    if (!text) return;
    
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopyStatus(prev => ({ ...prev, [field]: true }));
        
        // Réinitialiser après 2 secondes
        setTimeout(() => {
          setCopyStatus(prev => ({ ...prev, [field]: false }));
        }, 2000);
      })
      .catch(err => {
        console.error('Erreur lors de la copie :', err);
        setCopyStatus(prev => ({ ...prev, [field]: false }));
      });
  }, []);
  
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!currentUser) {
        setLoading(false);
        setError("Vous devez être connecté pour accéder à cette page");
        return;
      }
      
      // Si pas de serviceId, on ne peut pas récupérer l'abonnement
      if (!serviceId) {
        setLoading(false);
        return;
      }
      
      try {
        let subscriptionDoc;
        
        // Si nous avons l'ID de l'abonnement utilisateur, on l'utilise directement
        if (userSubscriptionId) {
          subscriptionDoc = await firestore
            .collection('userSubscriptions')
            .doc(userSubscriptionId)
            .get();
            
          if (subscriptionDoc.exists) {
            setSubscription({
              id: subscriptionDoc.id,
              ...subscriptionDoc.data()
            });
            setLoading(false);
            return;
          }
        }
        
        // Sinon, on essaie de trouver le dernier abonnement créé pour ce service
        const subscriptionsSnapshot = await firestore
          .collection('userSubscriptions')
          .where('userId', '==', currentUser.uid)
          .where('serviceId', '==', serviceId)
          .orderBy('startDate', 'desc')
          .limit(1)
          .get();
        
        if (!subscriptionsSnapshot.empty) {
          setSubscription({
            id: subscriptionsSnapshot.docs[0].id,
            ...subscriptionsSnapshot.docs[0].data()
          });
        } else {
          // Aucun abonnement trouvé, mais ce n'est pas une erreur
          // (les informations d'accès sont peut-être encore en cours de préparation)
          console.log("Aucun abonnement trouvé pour ce service");
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setError("Erreur lors de la récupération des informations d'abonnement");
        setLoading(false);
      }
    };
    
    fetchSubscription();
  }, [currentUser, serviceId, userSubscriptionId]);

  // Formatage de la date en français
  const formatDate = (date) => {
    if (!date) return 'Date inconnue';
    
    try {
      return new Date(date instanceof Date ? date : date.toDate()).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long', 
        year: 'numeric'
      });
    } catch (e) {
      console.error("Erreur lors du formatage de la date:", e);
      return 'Date invalide';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Redirect si pas de serviceId ou d'état de navigation
  if (!serviceId && !userSubscriptionId) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Cas d'erreur (accès non autorisé, etc.)
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-red-500 px-6 py-8 text-center">
              <div className="rounded-full bg-white p-2 mx-auto w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Erreur</h1>
              <p className="text-white/90">{error}</p>
            </div>
            
            <div className="p-6">
              <Link 
                to="/dashboard" 
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Retour au tableau de bord
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
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
              Votre abonnement à {serviceName || (subscription?.serviceName || 'votre service')} a été activé avec succès.
            </p>
          </div>
          
          <div className="p-6">
            {subscription ? (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Détails de votre abonnement</h2>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  {subscription.accessType === 'account' && (
                    <>
                      <div>
                        <p className="text-sm text-gray-500">Email d'accès</p>
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-800">{subscription.email}</p>
                          <button 
                            onClick={() => copyToClipboard(subscription.email, 'email')}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            {copyStatus.email ? (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Copié
                              </>
                            ) : "Copier"}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Mot de passe</p>
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-800">{subscription.password}</p>
                          <button 
                            onClick={() => copyToClipboard(subscription.password, 'password')}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            {copyStatus.password ? (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Copié
                              </>
                            ) : "Copier"}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  
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
                          onClick={() => copyToClipboard(subscription.accessLink, 'accessLink')}
                          className="text-blue-600 hover:text-blue-800 text-sm ml-2 whitespace-nowrap flex items-center"
                        >
                          {copyStatus.accessLink ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Copié
                            </>
                          ) : "Copier"}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {subscription.invitationLink && (
                    <div>
                      <p className="text-sm text-gray-500">Lien d'invitation</p>
                      <div className="flex items-center justify-between">
                        <a 
                          href={subscription.invitationLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 break-all"
                        >
                          {subscription.invitationLink}
                        </a>
                        <button 
                          onClick={() => copyToClipboard(subscription.invitationLink, 'invitationLink')}
                          className="text-blue-600 hover:text-blue-800 text-sm ml-2 whitespace-nowrap flex items-center"
                        >
                          {copyStatus.invitationLink ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Copié
                            </>
                          ) : "Copier"}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-500">Type d'abonnement</p>
                    <p className="font-medium text-gray-800">
                      {isRecurring ? "Mensuel récurrent" : `Durée unique (${duration || subscription.duration || 30} jours)`}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Validité</p>
                    <p className="font-medium text-gray-800">
                      Jusqu'au {formatDate(subscription.expiryDate)}
                    </p>
                  </div>
                  
                  {price && (
                    <div>
                      <p className="text-sm text-gray-500">Montant payé</p>
                      <p className="font-medium text-gray-800">
                        {price.toFixed(2)} €
                      </p>
                    </div>
                  )}
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
              
              {subscription && (subscription.accessLink || subscription.invitationLink) && (
                <a 
                  href={subscription.accessLink || subscription.invitationLink}
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