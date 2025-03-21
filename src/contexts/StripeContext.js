import React, { createContext, useState, useContext } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { functions } from '../firebase';

// Remplacer par votre clé publique Stripe
const stripePromise = loadStripe('pk_test_VOTRE_CLE_PUBLIQUE_STRIPE');

const StripeContext = createContext();

export function useStripe() {
  return useContext(StripeContext);
}

export function StripeProvider({ children }) {
  const [processing, setProcessing] = useState(false);

  async function createPaymentIntent(serviceId, amount) {
    setProcessing(true);
    try {
      const createPaymentIntentFunction = functions.httpsCallable('createPaymentIntent');
      const result = await createPaymentIntentFunction({
        serviceId,
        amount: amount * 100 // Stripe utilise les centimes
      });
      return result.data;
    } finally {
      setProcessing(false);
    }
  }

  async function confirmPayment(paymentIntentId, serviceId) {
    const confirmPaymentFunction = functions.httpsCallable('confirmSubscription');
    return confirmPaymentFunction({
      paymentIntentId,
      serviceId
    });
  }

  const value = {
    processing,
    createPaymentIntent,
    confirmPayment
  };

  return (
    <Elements stripe={stripePromise}>
      <StripeContext.Provider value={value}>
        {children}
      </StripeContext.Provider>
    </Elements>
  );
}