import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useStripe as useStripeContext } from '../contexts/StripeContext';
import { useSubscriptions } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';

const Checkout = () => {
  const { subscriptionId } = useParams();
  const { services, loading } = useSubscriptions();
  const { createPaymentIntent, confirmPayment, processing } = useStripeContext();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [service, setService] = useState(null);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [cardComplete, setCardComplete] = useState(false);
  
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    if (loading) return;
    
    const selectedService = services.find(s => s.id === subscriptionId);
    if (!selectedService) {
      setError("Service non trouvé");
      return;
    }
    
    setService(selectedService);
    
    // Créer l'intention de paiement
    const initPayment = async () => {
      try {
        const { clientSecret } = await createPaymentIntent(selectedService.id, selectedService.price);
        setClientSecret(clientSecret);
      } catch (err) {
        setError(err.message);
      }
    };
    
    initPayment();
  }, [subscriptionId, services, loading, createPaymentIntent]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements || !cardComplete) {
      return;
    }
    
    const cardElement = elements.getElement(CardElement);
    
    try {
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
        return;
      }
      
      if (paymentIntent.status === 'succeeded') {
        try {
          await confirmPayment(paymentIntent.id, service.id);
          navigate('/success', { 
            state: { 
              serviceId: service.id,
              serviceName: service.name
            } 
          });
        } catch (err) {
          setError(`Erreur de confirmation: ${err.message}`);
        }
      }
    } catch (err) {
      setError(`Une erreur est survenue: ${err.message}`);
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error && !service) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-8">
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
              <p className="font-bold">Erreur</p>
              <p>{error}</p>
            </div>
            <Link 
              to="/" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!service) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 flex justify-center">
        <div className="text-center py-10">Service non trouvé</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Retour
          </Link>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
            <h1 className="text-2xl font-bold text-white mb-2">Finaliser votre abonnement</h1>
            <p className="text-white/80">Vous êtes sur le point de vous abonner à {service.name}.</p>
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
                      <img src={service.imageUrl} alt={service.name} className="w-12 h-12 rounded mr-4" />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white font-bold text-xl">
                        {service.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-800">{service.name}</h3>
                      <p className="text-sm text-gray-500">Abonnement mensuel</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-800">{service.price.toFixed(2)} €</span>
                    <p className="text-sm text-gray-500">pour {service.duration} jours</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-gray-800">Total à payer:</span>
                    <span className="text-blue-600 text-xl">{service.price.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Informations de paiement</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Détails de la carte
                </label>
                <div className="border border-gray-300 rounded-lg p-4 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
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
                disabled={!stripe || !clientSecret || processing || !cardComplete}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Traitement en cours...
                  </>
                ) : (
                  `Payer ${service.price.toFixed(2)} €`
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