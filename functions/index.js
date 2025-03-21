const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe.secret || 'sk_test_votrecleteststripepardefaut');

admin.initializeApp();

// Fonction pour créer l'intention de paiement Stripe
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Vous devez être connecté pour effectuer cette action.'
    );
  }
  
  const { serviceId, subscriptionId, duration, amount } = data;
  
  try {
    // Vérifier que le service existe
    const serviceDoc = await admin.firestore().collection('services').doc(serviceId).get();
    
    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Service non trouvé'
      );
    }
    
    // Vérifier que l'abonnement existe si subscriptionId est fourni
    if (subscriptionId) {
      const subscriptionDoc = await admin.firestore()
        .collection('services')
        .doc(serviceId)
        .collection('subscriptions')
        .doc(subscriptionId)
        .get();
        
      if (!subscriptionDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Abonnement non trouvé'
        );
      }
    }
    
    // Créer l'intention de paiement
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe utilise les centimes
      currency: 'eur',
      metadata: {
        userId: context.auth.uid,
        serviceId,
        subscriptionId: subscriptionId || '',
        duration: duration ? duration.toString() : '30'
      }
    });
    
    return {
      clientSecret: paymentIntent.client_secret
    };
  } catch (error) {
    console.error('Erreur de création de paiement:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message
    );
  }
});

// Fonction de confirmation d'abonnement
exports.confirmSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Vous devez être connecté pour effectuer cette action.'
    );
  }
  
  const { paymentIntentId, serviceId, subscriptionId, duration } = data;
  
  try {
    // Vérifier le status du paiement avec Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Le paiement n\'a pas été confirmé'
      );
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erreur de confirmation:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message
    );
  }
});

// Fonction pour supprimer un service et tous ses abonnements - Version corrigée
exports.deleteServiceAndSubscriptions = functions.https.onCall(async (data, context) => {
  try {
    // Vérifier l'authentification
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Vous devez être connecté pour effectuer cette action.'
      );
    }
    
    // Vérifier si l'utilisateur est un administrateur
    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Vous n\'avez pas les droits nécessaires pour effectuer cette action.'
      );
    }
    
    const { serviceId } = data;
    
    if (!serviceId) {
      throw new functions.https.HttpsError('invalid-argument', 'serviceId est requis');
    }
    
    // Récupérer tous les abonnements de ce service
    const subscriptionsSnapshot = await admin.firestore()
      .collection('services')
      .doc(serviceId)
      .collection('subscriptions')
      .get();
    
    // Récupérer tous les abonnements utilisateur liés à ce service
    const userSubscriptionsSnapshot = await admin.firestore()
      .collection('userSubscriptions')
      .where('serviceId', '==', serviceId)
      .get();
    
    // Supprimer en lot
    const batch = admin.firestore().batch();
    
    // Supprimer les abonnements du service
    subscriptionsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Supprimer les abonnements utilisateur
    userSubscriptionsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Supprimer le service lui-même
    batch.delete(admin.firestore().collection('services').doc(serviceId));
    
    // Exécuter le lot
    await batch.commit();
    
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la suppression du service:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message
    );
  }
});