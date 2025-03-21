const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe.secret);

admin.initializeApp();

// Fonction pour créer l'intention de paiement Stripe
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Vous devez être connecté pour effectuer cette action.'
    );
  }
  
  const { serviceId, amount } = data;
  
  try {
    // Vérifier que le service existe
    const serviceDoc = await admin.firestore().collection('services').doc(serviceId).get();
    
    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Service non trouvé'
      );
    }
    
    // Créer l'intention de paiement
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe utilise les centimes
      currency: 'eur',
      metadata: {
        userId: context.auth.uid,
        serviceId
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

// Fonction déclenchée lorsqu'un nouvel abonnement utilisateur est créé
exports.onUserSubscriptionCreated = functions.firestore
  .document('userSubscriptions/{subscriptionId}')
  .onCreate(async (snapshot, context) => {
    try {
      const subscriptionData = snapshot.data();
      const { serviceId, subscriptionId, userId, expiryDate } = subscriptionData;
      
      // Programmer une tâche pour marquer l'abonnement comme expiré
      const expiryTime = new Date(expiryDate.toDate()).getTime();
      const now = Date.now();
      
      // Si la date d'expiration est dans le futur, programme la tâche
      if (expiryTime > now) {
        const delay = expiryTime - now;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Vérifier si l'abonnement existe toujours
        const subscriptionDoc = await admin.firestore()
          .collection('userSubscriptions')
          .doc(context.params.subscriptionId)
          .get();
        
        if (subscriptionDoc.exists) {
          await admin.firestore()
            .collection('userSubscriptions')
            .doc(context.params.subscriptionId)
            .update({ isActive: false });
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erreur de traitement de l\'abonnement:', error);
      return null;
    }
  });

// Fonction déclenchée tous les jours pour nettoyer les abonnements expirés
exports.cleanExpiredSubscriptions = functions.pubsub
  .schedule('0 0 * * *') // Tous les jours à minuit
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();
      
      // Récupérer tous les abonnements utilisateur expirés mais encore marqués comme actifs
      const expiredSubscriptionsSnapshot = await admin.firestore()
        .collection('userSubscriptions')
        .where('expiryDate', '<', now)
        .where('isActive', '==', true)
        .get();
      
      // Marquer ces abonnements comme inactifs
      const batch = admin.firestore().batch();
      
      expiredSubscriptionsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isActive: false });
      });
      
      // Exécuter les mises à jour en lot
      if (expiredSubscriptionsSnapshot.size > 0) {
        await batch.commit();
        console.log(`${expiredSubscriptionsSnapshot.size} abonnements expirés ont été nettoyés.`);
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors du nettoyage des abonnements expirés:', error);
      return null;
    }
  });

// Fonction pour supprimer un service et tous ses abonnements
exports.deleteServiceAndSubscriptions = functions.https.onCall(async (data, context) => {
  // Vérifier l'authentification et les droits d'administration
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
  
  try {
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