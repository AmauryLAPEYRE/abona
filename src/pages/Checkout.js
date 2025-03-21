import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
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
    
    if (!stripe || !elements) {
      return;
    }
    
    const cardElement = elements.getElement(CardElement);
    
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: currentUser.displayName,
          email: currentUser.email
        }
      }
    });
    
    if (error) {
      setError(`Erreur de paiement: ${error.message}`);
    } else if (paymentIntent.status === 'succeeded') {
      try {
        await confirmPayment(paymentIntent.id, service.id);
        setPaymentSuccess(true);
        // Rediriger vers la page de succès
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
  };

  if (loading) {
    return <div className="text-center py-10">Chargement...</div>;
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
        {error}
      </div>
    );
  }
  
  if (!service) {
    return <div className="text-center py-10">Service non trouvé</div>;
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Paiement pour {service.name}</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <div className="flex justify-between mb-2">
          <span>Prix:</span>
          <span>{service.price.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Total:</span>
          <span>{service.price.toFixed(2)} €</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">
            Informations de carte
          </label>
          <div className="border border-gray-300 p-3 rounded">
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
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={!stripe || !clientSecret || processing}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-bold disabled:bg-gray-400"
        >
          {processing ? 'Traitement...' : `Payer ${service.price.toFixed(2)} €`}
        </button>
      </form>
    </div>
  );
};

export default Checkout;