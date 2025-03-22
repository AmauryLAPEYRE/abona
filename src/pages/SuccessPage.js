import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { firestore } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

// Composant pour le bouton de copie
const CopyButton = ({ text, field, copyStatus, setCopyStatus }) => {
  const handleCopy = () => {
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
      });
  };

  return (
    <button 
      onClick={handleCopy}
      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
      aria-label={`Copier ${field}`}
    >
      {copyStatus[field] ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copié
        </>
      ) : "Copier"}
    </button>
  );
};

// Composant pour afficher un détail d'abonnement avec option de copie
const SubscriptionDetail = ({ label, value, isCopyable = false, isLink = false, copyStatus, setCopyStatus }) => {
  if (!value) return null;
  
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <div className="flex items-center justify-between">
        {isLink ? (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 break-all mr-2"
          >
            {value}
          </a>
        ) : (
          <p className="font-medium text-gray-800 break-all mr-2">{value}</p>
        )}
        
        {isCopyable && (
          <CopyButton 
            text={value} 
            field={label.toLowerCase().replace(/\s+/g, '_')} 
            copyStatus={copyStatus} 
            setCopyStatus={setCopyStatus}
          />
        )}
      </div>
    </div>
  );
};

// État de chargement
const LoadingState = () => (
  <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 flex justify-center items-center">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-gray-600">Finalisation de votre abonnement...</p>
    </div>
  </div>
);

// État d'erreur
const ErrorState = ({ error }) => (
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

const SuccessPage = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copyStatus, setCopyStatus] = useState({});

  // Extraire les données d'état de navigation de manière sécurisée
  const navigationState = useMemo(() => location.state || {}, [location.state]);
  
  const { 
    serviceId, 
    serviceName, 
    userSubscriptionId, 
    subscriptionName,
    duration,
    price,
    isRecurring = false
  } = navigationState;

  // Vérifier que nous avons les données minimales nécessaires
  const hasMinimumData = useMemo(() => {
    return Boolean(serviceId || userSubscriptionId);
  }, [serviceId, userSubscriptionId]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchSubscription = async () => {
      if (!currentUser) {
        if (isMounted) {
          setLoading(false);
          setError("Vous devez être connecté pour accéder à cette page");
        }
        return;
      }
      
      // Si pas de data essentielle pour récupérer l'abonnement
      if (!hasMinimumData) {
        if (isMounted) {
          setLoading(false);
        }
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
            if (isMounted) {
              setSubscription({
                id: subscriptionDoc.id,
                ...subscriptionDoc.data()
              });
              setLoading(false);
            }
            return;
          }
        }
        
        // Sinon, on essaie de trouver le dernier abonnement créé pour ce service
        if (serviceId) {
          const subscriptionsSnapshot = await firestore
            .collection('userSubscriptions')
            .where('userId', '==', currentUser.uid)
            .where('serviceId', '==', serviceId)
            .orderBy('startDate', 'desc')
            .limit(1)
            .get();
          
          if (!subscriptionsSnapshot.empty) {
            if (isMounted) {
              setSubscription({
                id: subscriptionsSnapshot.docs[0].id,
                ...subscriptionsSnapshot.docs[0].data()
              });
            }
          }
        }
        
        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        if (isMounted) {
          setError("Erreur lors de la récupération des informations d'abonnement");
          setLoading(false);
        }
      }
    };
    
    fetchSubscription();
    
    return () => {
      isMounted = false;
    };
  }, [currentUser, serviceId, userSubscriptionId, hasMinimumData]);

  // Formatage de la date en français
  const formatDate = useCallback((date) => {
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
  }, []);

  // Valider les données disponibles - soit de la navigation, soit de l'abonnement chargé
  const displayData = useMemo(() => {
    if (subscription) {
      return {
        serviceName: subscription.serviceName,
        subscriptionName: subscription.subscriptionName,
        duration: subscription.duration,
        price: subscription.proratedPrice || subscription.originalPrice,
        isRecurring: subscription.isRecurring
      };
    }
    
    return {
      serviceName,
      subscriptionName,
      duration,
      price,
      isRecurring
    };
  }, [subscription, serviceName, subscriptionName, duration, price, isRecurring]);

  if (loading) {
    return <LoadingState />;
  }
  
  // Redirect si pas de données essentielles
  if (!hasMinimumData) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Cas d'erreur (accès non autorisé, etc.)
  if (error) {
    return <ErrorState error={error} />;
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
              Votre abonnement à {displayData.serviceName || 'votre service'} a été activé avec succès.
            </p>
          </div>
          
          <div className="p-6">
            {subscription ? (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Détails de votre abonnement</h2>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  {subscription.accessType === 'account' && (
                    <>
                      <SubscriptionDetail 
                        label="Email d'accès" 
                        value={subscription.email} 
                        isCopyable={true} 
                        copyStatus={copyStatus} 
                        setCopyStatus={setCopyStatus}
                      />
                      
                      <SubscriptionDetail 
                        label="Mot de passe" 
                        value={subscription.password} 
                        isCopyable={true} 
                        copyStatus={copyStatus} 
                        setCopyStatus={setCopyStatus}
                      />
                    </>
                  )}
                  
                  <SubscriptionDetail 
                    label="Lien d'accès" 
                    value={subscription.accessLink} 
                    isCopyable={true} 
                    isLink={true} 
                    copyStatus={copyStatus} 
                    setCopyStatus={setCopyStatus}
                  />
                  
                  <SubscriptionDetail 
                    label="Lien d'invitation" 
                    value={subscription.invitationLink} 
                    isCopyable={true} 
                    isLink={true} 
                    copyStatus={copyStatus} 
                    setCopyStatus={setCopyStatus}
                  />
                  
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-500">Type d'abonnement</p>
                    <p className="font-medium text-gray-800">
                      {displayData.isRecurring ? "Mensuel récurrent" : `Durée unique (${displayData.duration || 30} jours)`}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Validité</p>
                    <p className="font-medium text-gray-800">
                      Jusqu'au {formatDate(subscription.expiryDate)}
                    </p>
                  </div>
                  
                  {displayData.price && (
                    <div>
                      <p className="text-sm text-gray-500">Montant payé</p>
                      <p className="font-medium text-gray-800">
                        {parseFloat(displayData.price).toFixed(2)} €
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