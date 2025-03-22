const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe.secret || 'sk_test_votrecleteststripepardefaut');

admin.initializeApp();

// Fonction utilitaire pour obtenir ou créer un client Stripe
async function getOrCreateCustomer(userId) {
  const userSnapshot = await admin.firestore().collection('users').doc(userId).get();
  const userData = userSnapshot.data();
  
  if (userData && userData.stripeCustomerId) {
    return userData.stripeCustomerId;
  }
  
  // Créer un nouveau client Stripe
  const customer = await stripe.customers.create({
    email: userData.email,
    metadata: { userId },
  });
  
  // Enregistrer l'ID client dans Firestore
  await admin.firestore().collection('users').doc(userId).update({
    stripeCustomerId: customer.id,
  });
  
  return customer.id;
}

// Fonction pour créer l'intention de paiement Stripe
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Vous devez être connecté pour effectuer cette action.'
    );
  }
  
  const { serviceId, subscriptionId, duration, amount, isRecurring } = data;
  
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
    
    if (isRecurring) {
      // Récupérer ou créer le customer Stripe pour l'utilisateur
      const customerId = await getOrCreateCustomer(context.auth.uid);
      
      // Créer une configuration de paiement pour un abonnement récurrent
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        metadata: {
          userId: context.auth.uid,
          serviceId,
          subscriptionId: subscriptionId || '',
          isRecurring: 'true'
        }
      });
      
      return {
        clientSecret: setupIntent.client_secret,
        isSetupIntent: true
      };
    } else {
      // Créer une intention de paiement pour un achat unique
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe utilise les centimes
        currency: 'eur',
        metadata: {
          userId: context.auth.uid,
          serviceId,
          subscriptionId: subscriptionId || '',
          duration: duration ? duration.toString() : '30',
          isRecurring: 'false'
        }
      });
      
      return {
        clientSecret: paymentIntent.client_secret,
        isSetupIntent: false
      };
    }
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
  
  const { paymentIntentId, serviceId, subscriptionId, duration, isRecurring } = data;
  
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

// Fonction pour mettre en place un abonnement récurrent
exports.setupRecurringPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Vous devez être connecté pour effectuer cette action.'
    );
  }
  
  const { paymentMethodId, serviceId, subscriptionId } = data;
  const userId = context.auth.uid;
  
  try {
    // Récupérer l'ID client Stripe de l'utilisateur
    const customerId = await getOrCreateCustomer(userId);
    
    // Attacher la méthode de paiement au client
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
    
    // Définir cette méthode comme la méthode par défaut
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    
    // Récupérer les détails du service et de l'abonnement
    const serviceDoc = await admin.firestore().collection('services').doc(serviceId).get();
    const subscriptionDoc = await admin.firestore()
      .collection('services')
      .doc(serviceId)
      .collection('subscriptions')
      .doc(subscriptionId)
      .get();
    
    if (!serviceDoc.exists || !subscriptionDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Service ou abonnement non trouvé');
    }
    
    const serviceData = serviceDoc.data();
    const subscriptionData = subscriptionDoc.data();
    
    // Vérifier si l'utilisateur a déjà un abonnement récurrent pour ce service
    const existingSubscriptionsSnapshot = await admin.firestore()
      .collection('userSubscriptions')
      .where('userId', '==', userId)
      .where('serviceId', '==', serviceId)
      .where('isRecurring', '==', true)
      .where('isActive', '==', true)
      .get();
    
    if (!existingSubscriptionsSnapshot.empty) {
      throw new functions.https.HttpsError(
        'already-exists',
        'Vous avez déjà un abonnement récurrent actif pour ce service'
      );
    }
    
    // Créer l'abonnement Stripe (simplifié, en réalité il faudrait créer des produits et des prix dans Stripe)
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${serviceData.name} - ${subscriptionData.name}`,
            },
            unit_amount: Math.round(subscriptionData.price * 100),
            recurring: {
              interval: 'month',
            },
          },
        },
      ],
      metadata: {
        userId,
        serviceId,
        subscriptionId,
      },
    });
    
    // Ajouter l'utilisateur à la liste des utilisateurs de l'abonnement
    await admin.firestore().collection('services')
      .doc(serviceId)
      .collection('subscriptions')
      .doc(subscriptionId)
      .update({
        currentUsers: admin.firestore.FieldValue.increment(1),
        users: admin.firestore.FieldValue.arrayUnion({
          userId,
          displayName: context.auth.token.name || 'Utilisateur',
          email: context.auth.token.email,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          isRecurring: true,
          stripeSubscriptionId: stripeSubscription.id
        })
      });
      
    // Calculer la date d'expiration (pour la première période)
    const startDate = new Date();
    const expiryDate = new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    // Enregistrer l'abonnement dans Firestore
    const userSubscriptionRef = await admin.firestore().collection('userSubscriptions').add({
      userId,
      serviceId,
      serviceName: serviceData.name,
      subscriptionId,
      subscriptionName: subscriptionData.name,
      accessType: subscriptionData.accessType,
      email: subscriptionData.accessType === 'account' ? subscriptionData.email : null,
      password: subscriptionData.accessType === 'account' ? subscriptionData.password : null,
      invitationLink: subscriptionData.accessType === 'invitation' ? subscriptionData.invitationLink : null,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: customerId,
      isRecurring: true,
      isActive: true,
      price: subscriptionData.price,
      startDate: admin.firestore.FieldValue.serverTimestamp(),
      expiryDate: expiryDate,
      nextBillingDate: expiryDate,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { 
      success: true, 
      subscriptionId: stripeSubscription.id,
      userSubscriptionId: userSubscriptionRef.id
    };
  } catch (error) {
    console.error('Erreur lors de la configuration de l\'abonnement récurrent:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Fonction pour supprimer un service et tous ses abonnements
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

// Webhook pour gérer les événements Stripe (paiements récurrents, etc.)
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;
  
  try {
    // Vérifier la signature du webhook Stripe
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      functions.config().stripe.webhook_secret || 'whsec_votre_webhook_secret'
    );
  } catch (error) {
    console.error('Vérification de signature webhook échouée:', error);
    return res.status(400).send(`Erreur webhook: ${error.message}`);
  }
  
  // Gérer les différents types d'événements
  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      // Ajouter d'autres cas selon les besoins
    }
    
    // Répondre pour confirmer la réception
    res.status(200).send({ received: true });
  } catch (error) {
    console.error(`Erreur lors du traitement de l'événement ${event.type}:`, error);
    res.status(500).send({ error: error.message });
  }
});

// Traiter le paiement réussi d'une facture (pour les abonnements récurrents)
async function handleInvoicePaymentSucceeded(invoice) {
  // Uniquement traiter les factures liées aux abonnements
  if (!invoice.subscription) return;
  
  try {
    // Récupérer l'abonnement Stripe
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    
    // Récupérer l'abonnement utilisateur correspondant
    const userSubscriptionsSnapshot = await admin.firestore()
      .collection('userSubscriptions')
      .where('stripeSubscriptionId', '==', subscription.id)
      .limit(1)
      .get();
    
    if (userSubscriptionsSnapshot.empty) {
      console.log(`Aucun abonnement utilisateur trouvé pour l'abonnement Stripe ${subscription.id}`);
      return;
    }
    
    const userSubscriptionRef = userSubscriptionsSnapshot.docs[0].ref;
    const userSubscriptionData = userSubscriptionsSnapshot.docs[0].data();
    
    // Calculer la nouvelle date d'expiration (+ 30 jours)
    const currentExpiryDate = userSubscriptionData.expiryDate.toDate();
    const newExpiryDate = new Date(currentExpiryDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    const nextBillingDate = new Date(newExpiryDate);
    
    // Mettre à jour l'abonnement utilisateur
    await userSubscriptionRef.update({
      expiryDate: admin.firestore.Timestamp.fromDate(newExpiryDate),
      nextBillingDate: admin.firestore.Timestamp.fromDate(nextBillingDate),
      lastBillingDate: admin.firestore.Timestamp.fromDate(new Date()),
      paymentHistory: admin.firestore.FieldValue.arrayUnion({
        amount: invoice.amount_paid / 100,
        date: admin.firestore.Timestamp.fromDate(new Date()),
        invoiceId: invoice.id,
        status: 'succeeded'
      })
    });
    
    console.log(`Abonnement utilisateur ${userSubscriptionRef.id} mis à jour après paiement réussi.`);
  } catch (error) {
    console.error('Erreur lors du traitement du paiement réussi:', error);
    throw error;
  }
}

// Traiter la mise à jour d'un abonnement Stripe
async function handleSubscriptionUpdated(subscription) {
  try {
    // Récupérer l'abonnement utilisateur correspondant
    const userSubscriptionsSnapshot = await admin.firestore()
      .collection('userSubscriptions')
      .where('stripeSubscriptionId', '==', subscription.id)
      .limit(1)
      .get();
    
    if (userSubscriptionsSnapshot.empty) {
      console.log(`Aucun abonnement utilisateur trouvé pour l'abonnement Stripe ${subscription.id}`);
      return;
    }
    
    const userSubscriptionRef = userSubscriptionsSnapshot.docs[0].ref;
    
    // Mettre à jour le statut de l'abonnement utilisateur
    const updates = {
      stripeStatus: subscription.status
    };
    
    // Si l'abonnement est inactif, le marquer comme tel
    if (subscription.status === 'unpaid' || subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
      updates.isActive = false;
    }
    
    await userSubscriptionRef.update(updates);
    
    console.log(`Abonnement utilisateur ${userSubscriptionRef.id} mis à jour selon le statut Stripe: ${subscription.status}`);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut d\'abonnement:', error);
    throw error;
  }
}

// Traiter la suppression d'un abonnement Stripe
async function handleSubscriptionDeleted(subscription) {
  try {
    // Récupérer l'abonnement utilisateur correspondant
    const userSubscriptionsSnapshot = await admin.firestore()
      .collection('userSubscriptions')
      .where('stripeSubscriptionId', '==', subscription.id)
      .limit(1)
      .get();
    
    if (userSubscriptionsSnapshot.empty) {
      console.log(`Aucun abonnement utilisateur trouvé pour l'abonnement Stripe ${subscription.id}`);
      return;
    }
    
    const userSubscriptionRef = userSubscriptionsSnapshot.docs[0].ref;
    const userSubscriptionData = userSubscriptionsSnapshot.docs[0].data();
    
    // Marquer l'abonnement comme inactif
    await userSubscriptionRef.update({
      isActive: false,
      isRecurring: false,
      canceledAt: admin.firestore.FieldValue.serverTimestamp(),
      stripeStatus: 'canceled'
    });
    
    // Mettre à jour l'abonnement du service
    const serviceRef = admin.firestore()
      .collection('services')
      .doc(userSubscriptionData.serviceId)
      .collection('subscriptions')
      .doc(userSubscriptionData.subscriptionId);
    
    // Utiliser une transaction pour assurer la cohérence des données
    await admin.firestore().runTransaction(async transaction => {
      const serviceSubDoc = await transaction.get(serviceRef);
      if (!serviceSubDoc.exists) {
        console.log(`L'abonnement de service ${userSubscriptionData.subscriptionId} n'existe plus.`);
        return;
      }
      
      const serviceSubData = serviceSubDoc.data();
      
      // Mettre à jour le nombre d'utilisateurs et supprimer l'utilisateur de la liste
      const updatedUsers = (serviceSubData.users || []).filter(user => 
        user.userId !== userSubscriptionData.userId
      );
      
      transaction.update(serviceRef, {
        currentUsers: Math.max(0, (serviceSubData.currentUsers || 0) - 1),
        users: updatedUsers
      });
    });
    
    console.log(`Abonnement utilisateur ${userSubscriptionRef.id} marqué comme supprimé.`);
  } catch (error) {
    console.error('Erreur lors de la suppression d\'abonnement:', error);
    throw error;
  }
}