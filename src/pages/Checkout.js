import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useStripe as useStripeContext } from '../contexts/StripeContext';
import { useSubscriptions } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { firestore } from '../firebase';

// Composant pour l'état de chargement
const LoadingSpinner = ({ message }) => (
  <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 flex justify-center">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-gray-600">{message || 'Chargement...'}</p>
    </div>
  </div>
);

// Composant pour l'état d'erreur
const ErrorState = ({ error, backLink }) => (
  <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Erreur</p>
          <p>{error}</p>
        </div>
        <Link 
          to={backLink || "/services"} 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          {backLink === "/services" ? "Retour aux services" : "Retour"}
        </Link>
      </div>
    </div>
  </div>
);

const Checkout = () => {
  const { serviceId, subscriptionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // États
  const [service, setService] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [cardComplete, setCardComplete] = useState(false);
  const [loadingState, setLoadingState] = useState({
    initialLoad: true,
    paymentProcessing: false
  });
  const [isSetupIntent, setIsSetupIntent] = useState(false);
  const [availabilityCheckedAt, setAvailabilityCheckedAt] = useState(null);
  
  // Récupérer les paramètres de l'URL
  const searchParams = new URLSearchParams(location.search);
  const duration = parseInt(searchParams.get('duration') || '30', 10);
  const isRecurring = searchParams.get('recurring') === 'true';

  // Hooks
  const { currentUser } = useAuth();
  const { createPaymentIntent, confirmPayment, confirmRecurringPayment, processing } = useStripeContext();
  const { purchaseSubscription, calculateProRatedPrice } = useSubscriptions();
  const stripe = useStripe();
  const elements = useElements();
  
  // Prix proratisé mémorisé
  const proratedPrice = useMemo(() => {
    if (!subscription) return 0;
    
    return isRecurring
      ? subscription.price
      : calculateProRatedPrice(subscription.price, duration);
  }, [subscription, isRecurring, duration, calculateProRatedPrice]);
  
  // États de chargement dérivés
  const isLoading = loadingState.initialLoad;
  const isProcessing = loadingState.paymentProcessing || processing;
  
  // Définir un état de chargement spécifique
  const setLoading = useCallback((key, value) => {
    setLoadingState(prev => ({ ...prev, [key]: value }));
  }, []);

  // Vérifier si l'abonnement est toujours disponible avec mise en cache des résultats
  const checkSubscriptionAvailability = useCallback(async (force = false) => {
    // Si nous avons vérifié récemment (moins de 10 secondes) et que ce n'est pas forcé, on utilise le résultat précédent
    if (availabilityCheckedAt && !force && (Date.now() - availabilityCheckedAt < 10000)) {
      return true;
    }
    
    try {
      // Vérifier si l'abonnement existe et a des places disponibles
      const subscriptionDoc = await firestore
        .collection('services')
        .doc(serviceId)
        .collection('subscriptions')
        .doc(subscriptionId)
        .get();
      
      if (!subscriptionDoc.exists) {
        throw new Error("Cet abonnement n'existe plus.");
      }
      
      const subscriptionData = subscriptionDoc.data();
      
      if (subscriptionData.currentUsers >= subscriptionData.maxUsers) {
        throw new Error("Cet abonnement est complet. Veuillez en choisir un autre.");
      }
      
      // Mettre à jour la date de dernière vérification
      setAvailabilityCheckedAt(Date.now());
      
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [serviceId, subscriptionId]);

  // Chargement initial des données
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        setLoading('initialLoad', true);
        
        // Vérifier la disponibilité de l'abonnement
        const isAvailable = await checkSubscriptionAvailability(true);
        if (!isAvailable) {
          setLoading('initialLoad', false);
          return;
        }
        
        // Récupérer les informations du service
        const serviceDoc = await firestore.collection('services').doc(serviceId).get();
        
        if (!isMounted) return;
        
        if (!serviceDoc.exists) {
          setError("Service non trouvé");
          setLoading('initialLoad', false);
          return;
        }
        
        const serviceData = {
          id: serviceDoc.id,
          ...serviceDoc.data()
        };
        
        if (!isMounted) return;
        setService(serviceData);
        
        // Récupérer les informations de l'abonnement
        const subscriptionDoc = await firestore
          .collection('services')
          .doc(serviceId)
          .collection('subscriptions')
          .doc(subscriptionId)
          .get();
        
        if (!isMounted) return;
        
        if (!subscriptionDoc.exists) {
          setError("Abonnement non trouvé");
          setLoading('initialLoad', false);
          return;
        }
        
        const subscriptionData = {
          id: subscriptionDoc.id,
          ...subscriptionDoc.data()
        };
        
        // Vérifier si l'abonnement est complet
        if (subscriptionData.currentUsers >= subscriptionData.maxUsers) {
          setError("Cet abonnement est complet. Veuillez en choisir un autre.");
          setLoading('initialLoad', false);
          return;
        }
        
        if (!isMounted) return;
        setSubscription(subscriptionData);
        
        // Calculer le prix proratisé pour les durées uniques et créer l'intention de paiement
        const prorated = isRecurring 
          ? subscriptionData.price 
          : calculateProRatedPrice(subscriptionData.price, duration);
        
        if (!isMounted) return;
        
        // Créer l'intention de paiement avec le prix proratisé
        const { clientSecret, isSetupIntent: isSetup } = await createPaymentIntent(
          serviceId, 
          subscriptionId, 
          duration, 
          prorated, 
          isRecurring
        );
        
        if (!isMounted) return;
        
        setClientSecret(clientSecret);
        setIsSetupIntent(isSetup || false);
        setLoading('initialLoad', false);
      } catch (err) {
        console.error("Erreur lors du chargement:", err);
        if (isMounted) {
          setError(`Une erreur est survenue: ${err.message}`);
          setLoading('initialLoad', false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [
    serviceId, 
    subscriptionId, 
    duration, 
    isRecurring, 
    createPaymentIntent, 
    calculateProRatedPrice, 
    checkSubscriptionAvailability,
    setLoading
  ]);

  // Gérer la soumission du formulaire de paiement
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements || !cardComplete || !clientSecret) {
      setError("Veuillez remplir correctement les informations de carte.");
      return;
    }
    
    // Vérifier une nouvelle fois si l'abonnement est disponible
    const isAvailable = await checkSubscriptionAvailability(true);
    if (!isAvailable) {
      return;
    }
    
    setLoading('paymentProcessing', true);
    setError(null);
    
    const cardElement = elements.getElement(CardElement);
    
    try {
      if (isSetupIntent) {
        // Traiter un paiement récurrent
        const { error: setupError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: currentUser.displayName || currentUser.email,
              email: currentUser.email
            }
          }
        });
        
        if (setupError) {
          setError(`Erreur de configuration: ${setupError.message}`);
          setLoading('paymentProcessing', false);
          return;
        }
        
        // Configuration réussie, mettre en place l'abonnement récurrent
        try {
          const result = await confirmRecurringPayment(
            setupIntent.payment_method, 
            serviceId, 
            subscriptionId
          );
          
          if (result && result.data && result.data.success) {
            navigate('/success', { 
              state: { 
                serviceId: service.id,
                serviceName: service.name,
                isRecurring: true,
                subscriptionId: result.data.subscriptionId
              } 
            });
          } else {
            setError('Échec de la configuration de l\'abonnement récurrent. Veuillez réessayer.');
            setLoading('paymentProcessing', false);
          }
        } catch (err) {
          setError(`Erreur lors de la finalisation: ${err.message}`);
          setLoading('paymentProcessing', false);
        }
      } else {
        // Traiter un paiement unique
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: currentUser.displayName || currentUser.email,
              email: currentUser.email
            }
          }
        });
        
        if (error) {
          setError(`Erreur de paiement: ${error.message}`);
          setLoading('paymentProcessing', false);
          return;
        }
        
        if (paymentIntent.status === 'succeeded') {
          try {
            // Vérifier une dernière fois la disponibilité avant d'enregistrer
            const isStillAvailable = await checkSubscriptionAvailability(true);
            if (!isStillAvailable) {
              setLoading('paymentProcessing', false);
              return;
            }
            
            // Enregistrement de l'abonnement pour l'utilisateur
            const result = await purchaseSubscription(
              serviceId, 
              subscriptionId, 
              paymentIntent.id, 
              duration,
              false // non récurrent
            );
            
            // Rediriger vers la page de succès
            navigate('/success', { 
              state: { 
                userSubscriptionId: result.userSubscriptionId,
                serviceId: service.id,
                serviceName: service.name,
                subscriptionName: subscription.name,
                accessType: subscription.accessType,
                duration: duration,
                price: proratedPrice,
                isRecurring: false
              } 
            });
          } catch (err) {
            // Gestion des erreurs spécifiques
            if (err.message && err.message.includes('complet')) {
              setError("Cet abonnement est maintenant complet. Votre paiement a été effectué mais vous allez être remboursé automatiquement. Veuillez choisir un autre abonnement.");
            } else {
              setError(`Erreur lors de la finalisation: ${err.message}`);
            }
            setLoading('paymentProcessing', false);
          }
        } else {
          setError("Le statut du paiement est indéterminé. Veuillez vérifier votre compte ou contacter le support.");
          setLoading('paymentProcessing', false);
        }
      }
    } catch (err) {
      setError(`Une erreur est survenue: ${err.message}`);
      setLoading('paymentProcessing', false);
    }
  };

  // Gérer les changements de l'élément de carte
  const handleCardChange = (event) => {
    setCardComplete(event.complete);
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  };

  // Afficher l'état de chargement
  if (isLoading) {
    return <LoadingSpinner message="Préparation du paiement..." />;
  }
  
  // Afficher l'état d'erreur si nous n'avons pas pu charger les données principales
  if (error && (!service || !subscription)) {
    return <ErrorState error={error} backLink="/services" />;
  }
  
  // Si le service ou l'abonnement ne sont pas chargés correctement
  if (!service || !subscription) {
    return <ErrorState error="Service ou abonnement non trouvé" backLink="/services" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link to={`/service/${serviceId}`} className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Retour
          </Link>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
            <h1 className="text-2xl font-bold text-white mb-2">Finaliser votre abonnement</h1>
            <p className="text-white/80">Vous êtes sur le point de vous abonner à {service.name} - {subscription.name}.</p>
          </div>
          
          <div className="p-6">
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
                <p>{error}</p>
              </div>
            )}
            
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Détails de l'abonnement</h2>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {service.imageUrl ? (
                      <img src={service.imageUrl} alt={service.name} className="w-12 h-12 rounded mr-4 object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white font-bold text-xl">
                        {service.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-800">{service.name} - {subscription.name}</h3>
                      <p className="text-sm text-gray-500">
                        {subscription.accessType === 'account' 
                          ? 'Accès via identifiants' 
                          : 'Accès via lien d\'invitation'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4 bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-blue-700">
                      Vous rejoignez un abonnement partagé avec <strong>{subscription.currentUsers}</strong> autres utilisateurs. 
                      Ce service est limité à <strong>{subscription.maxUsers}</strong> utilisateurs au total.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3 border-b border-gray-200 pb-4 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type d'abonnement:</span>
                    <span className="font-medium">
                      {isRecurring ? 'Mensuel récurrent' : `Durée unique (${duration} jours)`}
                    </span>
                  </div>
                  {!isRecurring && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée:</span>
                      <span className="font-medium">{duration} jours</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prix mensuel standard:</span>
                    <span className="font-medium">{subscription.price.toFixed(2)} €</span>
                  </div>
                  {!isRecurring && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prix proratisé pour {duration} jours:</span>
                      <span className="font-medium text-blue-600">{proratedPrice.toFixed(2)} €</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center font-bold">
                  <span className="text-gray-800">Total à payer:</span>
                  <span className="text-blue-600 text-xl">
                    {isRecurring 
                      ? `${subscription.price.toFixed(2)} € / mois` 
                      : `${proratedPrice.toFixed(2)} € unique`}
                  </span>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Informations de paiement</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Détails de la carte
                </label>
                <div className={`border ${cardComplete ? 'border-green-300' : 'border-gray-300'} rounded-lg p-4 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors`}>
                  <CardElement
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#424770',
                          '::placeholder': {
                            color: '#aab7c4',
                          },
                        },
                        invalid: {
                          color: '#9e2146',
                        },
                      },
                      hidePostalCode: true
                    }}
                    onChange={handleCardChange}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Nous utilisons Stripe pour un paiement sécurisé. Vos données de carte ne sont jamais stockées sur nos serveurs.
                </p>
              </div>
              
              <button
                type="submit"
                disabled={isProcessing || !cardComplete || !stripe || !clientSecret}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                  (isProcessing || !cardComplete || !stripe || !clientSecret) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Traitement en cours...
                  </>
                ) : (
                  isRecurring 
                    ? `S'abonner pour ${subscription.price.toFixed(2)} € / mois` 
                    : `Payer ${proratedPrice.toFixed(2)} €`
                )}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                En cliquant sur "Payer", vous acceptez nos{' '}
                <Link to="/terms" className="text-blue-600 hover:text-blue-800">
                  conditions d'utilisation
                </Link>{' '}
                et notre{' '}
                <Link to="/privacy" className="text-blue-600 hover:text-blue-800">
                  politique de confidentialité
                </Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;