import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useStripe as useStripeContext } from '../contexts/StripeContext';
import { useSubscriptions } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { firestore } from '../firebase';
import { DISCOUNT_RATE } from '../constants';
import { clampDuration, calculatePrice, calculateDiscountedMonthly } from '../pricing';

const Checkout = () => {
  const { serviceId, subscriptionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Récupérer les paramètres de l'URL
  const searchParams = new URLSearchParams(location.search);
  const rawDuration = parseInt(searchParams.get('duration') || '15');
  const duration = isRecurring ? 30 : clampDuration(rawDuration);
  const isRecurring = searchParams.get('recurring') === 'true';

  const { currentUser } = useAuth();
  const { createPaymentIntent, confirmPayment, confirmRecurringPayment, processing } = useStripeContext();
  const { purchaseSubscription, calculateProRatedPrice } = useSubscriptions();

  const [service, setService] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [cardComplete, setCardComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [proratedPrice, setProratedPrice] = useState(0);
  const [isSetupIntent, setIsSetupIntent] = useState(false);

  const stripe = useStripe();
  const elements = useElements();

  // Vérifier si l'abonnement est toujours disponible
  const checkSubscriptionAvailability = useCallback(async () => {
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

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [serviceId, subscriptionId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Récupérer les informations du service
        const serviceDoc = await firestore.collection('services').doc(serviceId).get();

        if (!serviceDoc.exists) {
          setError("Service non trouvé");
          setLoading(false);
          return;
        }

        const serviceData = {
          id: serviceDoc.id,
          ...serviceDoc.data()
        };

        setService(serviceData);

        // Récupérer les informations de l'abonnement
        const subscriptionDoc = await firestore
          .collection('services')
          .doc(serviceId)
          .collection('subscriptions')
          .doc(subscriptionId)
          .get();

        if (!subscriptionDoc.exists) {
          setError("Abonnement non trouvé");
          setLoading(false);
          return;
        }

        const subscriptionData = {
          id: subscriptionDoc.id,
          ...subscriptionDoc.data()
        };

        // Vérifier si l'abonnement est complet
        if (subscriptionData.currentUsers >= subscriptionData.maxUsers) {
          setError("Cet abonnement est complet. Veuillez en choisir un autre.");
          setLoading(false);
          return;
        }

        setSubscription(subscriptionData);

        // Estimation locale (pour affichage immédiat, le serveur recalcule)
        const estimatedPrice = isRecurring
          ? calculateDiscountedMonthly(subscriptionData.price)
          : calculatePrice(subscriptionData.price, duration);
        setProratedPrice(estimatedPrice);

        // Créer l'intention de paiement - le serveur recalcule le prix
        const result = await createPaymentIntent(
          serviceId,
          subscriptionId,
          duration,
          estimatedPrice,
          isRecurring
        );

        // Si le serveur renvoie un prix différent, on utilise le prix serveur
        if (result.serverPrice && result.serverPrice !== estimatedPrice) {
          setProratedPrice(result.serverPrice);
        }

        setClientSecret(result.clientSecret);
        setIsSetupIntent(result.isSetupIntent || false);

        setLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement:", err);
        setError(`Une erreur est survenue: ${err.message}`);
        setLoading(false);
      }
    };

    fetchData();
  }, [serviceId, subscriptionId, duration, isRecurring, createPaymentIntent, calculateProRatedPrice]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !cardComplete || !clientSecret) {
      setError("Veuillez remplir correctement les informations de carte.");
      return;
    }

    // Vérifier une nouvelle fois si l'abonnement est disponible
    const isAvailable = await checkSubscriptionAvailability();
    if (!isAvailable) {
      return;
    }

    setPaymentProcessing(true);
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
          setPaymentProcessing(false);
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
            setPaymentProcessing(false);
          }
        } catch (err) {
          setError(`Erreur lors de la finalisation: ${err.message}`);
          setPaymentProcessing(false);
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
          setPaymentProcessing(false);
          return;
        }

        if (paymentIntent.status === 'succeeded') {
          try {
            // Vérifier une dernière fois la disponibilité avant d'enregistrer
            const isStillAvailable = await checkSubscriptionAvailability();
            if (!isStillAvailable) {
              setPaymentProcessing(false);
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
            setPaymentProcessing(false);
          }
        } else {
          setError("Le statut du paiement est indéterminé. Veuillez vérifier votre compte ou contacter le support.");
          setPaymentProcessing(false);
        }
      }
    } catch (err) {
      setError(`Une erreur est survenue: ${err.message}`);
      setPaymentProcessing(false);
    }
  };

  const handleCardChange = (event) => {
    setCardComplete(event.complete);
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  };

  if (loading) {
    return (
      <div className="page-bg text-white py-12 px-4 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && (!service || !subscription)) {
    return (
      <div className="page-bg text-white py-12 px-4">
        <div className="max-w-md mx-auto glass-card overflow-hidden">
          <div className="p-8">
            <div className="glass-alert-error mb-6" role="alert">
              <p className="font-bold">Erreur</p>
              <p>{error}</p>
            </div>
            <Link
              to="/services"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Retour aux services
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!service || !subscription) {
    return (
      <div className="page-bg text-white py-12 px-4 flex justify-center">
        <div className="text-center py-10">Service ou abonnement non trouvé</div>
      </div>
    );
  }

  return (
    <div className="page-bg text-white py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link to={`/service/${serviceId}`} className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Retour
          </Link>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
            <h1 className="text-2xl font-bold text-white mb-2">Finaliser votre accès</h1>
            <p className="text-white/80">Vous êtes sur le point de vous abonner à {service.name} - {subscription.name}.</p>
          </div>

          <div className="p-6">
            {error && (
              <div className="glass-alert-error mb-6" role="alert">
                <p>{error}</p>
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-lg font-bold text-white mb-4">Détails de l'abonnement</h2>

              <div className="bg-white/5 rounded-lg p-4">
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
                      <h3 className="font-bold text-white">{service.name} - {subscription.name}</h3>
                      <p className="text-sm text-white/60">
                        {subscription.accessType === 'account'
                          ? 'Accès via identifiants'
                          : 'Accès via lien d\'invitation'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-4 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-blue-300">
                      Vous rejoignez un abonnement partagé avec <strong>{subscription.currentUsers}</strong> autres utilisateurs.
                      Ce service est limité à <strong>{subscription.maxUsers}</strong> utilisateurs au total.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 border-b border-white/10 pb-4 mb-4">
                  <div className="flex justify-between">
                    <span className="text-white/60">Type d'abonnement:</span>
                    <span className="font-medium text-white">
                      {isRecurring ? 'Mensuel récurrent' : `Payez seulement pour ${duration} jours`}
                    </span>
                  </div>
                  {!isRecurring && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Durée:</span>
                      <span className="font-medium text-white">{duration} jours</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-white/60">Prix officiel:</span>
                    <span className="text-white/40 line-through">{subscription.price.toFixed(2)} €/mois</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Prix Abona (-{DISCOUNT_RATE * 100}%):</span>
                    <span className="font-medium text-green-400">{calculateDiscountedMonthly(subscription.price).toFixed(2)} €/mois</span>
                  </div>
                  {!isRecurring && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Proratisé pour {duration} jours:</span>
                      <span className="font-medium text-green-400">{proratedPrice.toFixed(2)} €</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center font-bold">
                  <span className="text-white">Total à payer:</span>
                  <span className="text-green-400 text-xl">
                    {isRecurring
                      ? `${calculateDiscountedMonthly(subscription.price).toFixed(2)} € / mois`
                      : `${proratedPrice.toFixed(2)} €`}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-bold text-white mb-4">Informations de paiement</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Détails de la carte
                </label>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 focus-within:ring-2 focus-within:ring-blue-500">
                  <CardElement
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#ffffff',
                          '::placeholder': {
                            color: '#ffffff80',
                          },
                        },
                        invalid: {
                          color: '#9e2146',
                        },
                      },
                    }}
                    onChange={handleCardChange}
                  />
                </div>
                <p className="mt-2 text-sm text-white/50">
                  Nous utilisons Stripe pour un paiement sécurisé. Vos données de carte ne sont jamais stockées sur nos serveurs.
                </p>
              </div>

              <button
                type="submit"
                disabled={paymentProcessing || processing || !cardComplete || !stripe || !clientSecret}
                className="btn-primary w-full"
              >
                {paymentProcessing || processing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Traitement en cours...
                  </>
                ) : (
                  isRecurring
                    ? `S'abonner pour ${calculateDiscountedMonthly(subscription.price).toFixed(2)} € / mois`
                    : `Payer ${proratedPrice.toFixed(2)} €`
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-white/50">
                En cliquant sur "Payer", vous acceptez nos{' '}
                <Link to="/terms" className="text-blue-400 hover:text-blue-300">
                  conditions d'utilisation
                </Link>{' '}
                et notre{' '}
                <Link to="/privacy" className="text-blue-400 hover:text-blue-300">
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
