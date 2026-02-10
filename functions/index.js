const functions = require('firebase-functions');
const admin = require('firebase-admin');

const stripeSecret = functions.config().stripe?.secret;
if (!stripeSecret) {
  console.error('STRIPE SECRET KEY MANQUANTE dans firebase config. Exécuter: firebase functions:config:set stripe.secret="sk_..."');
}
const stripe = require('stripe')(stripeSecret || '');

const { MAX_DURATION_DAYS, MIN_DURATION_DAYS, DAYS_IN_MONTH } = require('./constants');
const { calculatePrice, calculateDiscountedMonthly, clampDuration } = require('./pricing');

admin.initializeApp();

// Récupère ou crée un client Stripe pour un utilisateur Firebase
async function getOrCreateCustomer(userId) {
  const db = admin.firestore();
  const userRef = db.collection('users').doc(userId);

  return db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const userData = userSnapshot.data();

    if (userData?.stripeCustomerId) {
      return userData.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
      email: userData.email,
      metadata: { userId },
    });

    transaction.update(userRef, { stripeCustomerId: customer.id });
    return customer.id;
  });
}

// Récupère un abonnement depuis Firestore avec validation
async function getSubscriptionData(serviceId, subscriptionId) {
  if (!serviceId || !subscriptionId) {
    throw new functions.https.HttpsError('invalid-argument', 'serviceId et subscriptionId requis');
  }

  const serviceDoc = await admin.firestore().collection('services').doc(serviceId).get();
  if (!serviceDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Service non trouvé');
  }

  const subscriptionDoc = await admin.firestore()
    .collection('services')
    .doc(serviceId)
    .collection('subscriptions')
    .doc(subscriptionId)
    .get();

  if (!subscriptionDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Abonnement non trouvé');
  }

  return {
    service: { id: serviceDoc.id, ...serviceDoc.data() },
    subscription: { id: subscriptionDoc.id, ...subscriptionDoc.data() },
  };
}

// --- CLOUD FUNCTIONS ---

exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté.');
  }

  const { serviceId, subscriptionId, duration, isRecurring } = data;
  // On IGNORE data.amount - le serveur recalcule toujours

  const safeDuration = isRecurring ? DAYS_IN_MONTH : clampDuration(duration);

  try {
    const { service, subscription } = await getSubscriptionData(serviceId, subscriptionId);

    // Vérifier qu'il reste des places
    if ((subscription.currentUsers || 0) >= (subscription.maxUsers || 0)) {
      throw new functions.https.HttpsError('resource-exhausted', 'Cet abonnement est complet.');
    }

    if (isRecurring) {
      const customerId = await getOrCreateCustomer(context.auth.uid);

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        metadata: {
          userId: context.auth.uid,
          serviceId,
          subscriptionId,
          isRecurring: 'true',
        },
      });

      return {
        clientSecret: setupIntent.client_secret,
        isSetupIntent: true,
        serverPrice: calculateDiscountedMonthly(subscription.price),
      };
    }

    // Calcul du prix côté serveur - jamais confiance au frontend
    const serverPrice = calculatePrice(subscription.price, safeDuration);

    if (serverPrice <= 0) {
      throw new functions.https.HttpsError('internal', 'Erreur de calcul du prix.');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(serverPrice * 100),
      currency: 'eur',
      metadata: {
        userId: context.auth.uid,
        serviceId,
        subscriptionId,
        duration: safeDuration.toString(),
        originalPrice: subscription.price.toString(),
        calculatedPrice: serverPrice.toString(),
        isRecurring: 'false',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      isSetupIntent: false,
      serverPrice,
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error('Erreur createPaymentIntent:', error);
    throw new functions.https.HttpsError('internal', 'Erreur lors de la création du paiement.');
  }
});

exports.confirmSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté.');
  }

  const { paymentIntentId } = data;

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new functions.https.HttpsError('failed-precondition', 'Le paiement n\'a pas été confirmé.');
    }

    return { success: true };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error('Erreur confirmSubscription:', error);
    throw new functions.https.HttpsError('internal', 'Erreur lors de la confirmation.');
  }
});

exports.setupRecurringPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté.');
  }

  const { paymentMethodId, serviceId, subscriptionId } = data;
  const userId = context.auth.uid;

  try {
    const customerId = await getOrCreateCustomer(userId);

    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const { service: serviceData, subscription: subscriptionData } = await getSubscriptionData(serviceId, subscriptionId);

    // Vérifier doublon d'abonnement récurrent
    const existingSubs = await admin.firestore()
      .collection('userSubscriptions')
      .where('userId', '==', userId)
      .where('serviceId', '==', serviceId)
      .where('isRecurring', '==', true)
      .where('isActive', '==', true)
      .get();

    if (!existingSubs.empty) {
      throw new functions.https.HttpsError('already-exists', 'Vous avez déjà un abonnement récurrent actif pour ce service.');
    }

    // Prix mensuel réduit calculé côté serveur
    const discountedMonthly = calculateDiscountedMonthly(subscriptionData.price);

    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${serviceData.name} - ${subscriptionData.name}`,
          },
          unit_amount: Math.round(discountedMonthly * 100),
          recurring: { interval: 'month' },
        },
      }],
      metadata: { userId, serviceId, subscriptionId },
    });

    await admin.firestore()
      .collection('services')
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
          stripeSubscriptionId: stripeSubscription.id,
        }),
      });

    const startDate = new Date();
    const expiryDate = new Date(startDate.getTime() + (DAYS_IN_MONTH * 24 * 60 * 60 * 1000));

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
      originalPrice: subscriptionData.price,
      discountedPrice: discountedMonthly,
      startDate: admin.firestore.FieldValue.serverTimestamp(),
      expiryDate,
      nextBillingDate: expiryDate,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      subscriptionId: stripeSubscription.id,
      userSubscriptionId: userSubscriptionRef.id,
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error('Erreur setupRecurringPayment:', error);
    throw new functions.https.HttpsError('internal', 'Erreur lors de la configuration de l\'abonnement.');
  }
});

exports.deleteServiceAndSubscriptions = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté.');
  }

  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Droits insuffisants.');
  }

  const { serviceId } = data;
  if (!serviceId) {
    throw new functions.https.HttpsError('invalid-argument', 'serviceId est requis.');
  }

  try {
    const subscriptionsSnapshot = await admin.firestore()
      .collection('services').doc(serviceId).collection('subscriptions').get();

    const userSubscriptionsSnapshot = await admin.firestore()
      .collection('userSubscriptions').where('serviceId', '==', serviceId).get();

    const batch = admin.firestore().batch();
    subscriptionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    userSubscriptionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(admin.firestore().collection('services').doc(serviceId));
    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Erreur deleteServiceAndSubscriptions:', error);
    throw new functions.https.HttpsError('internal', 'Erreur lors de la suppression.');
  }
});

// --- STRIPE WEBHOOKS ---

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const webhookSecret = functions.config().stripe?.webhook_secret;
  if (!webhookSecret) {
    console.error('STRIPE WEBHOOK SECRET MANQUANT');
    return res.status(500).send('Configuration manquante');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, req.headers['stripe-signature'], webhookSecret);
  } catch (error) {
    console.error('Signature webhook invalide:', error.message);
    return res.status(400).send('Signature invalide');
  }

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
    }
    res.status(200).send({ received: true });
  } catch (error) {
    console.error(`Erreur traitement ${event.type}:`, error);
    res.status(500).send({ error: 'Erreur de traitement' });
  }
});

async function handleInvoicePaymentSucceeded(invoice) {
  if (!invoice.subscription) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const snapshot = await admin.firestore()
      .collection('userSubscriptions')
      .where('stripeSubscriptionId', '==', subscription.id)
      .limit(1)
      .get();

    if (snapshot.empty) return;

    const ref = snapshot.docs[0].ref;
    const data = snapshot.docs[0].data();

    const currentExpiry = data.expiryDate.toDate();
    const newExpiry = new Date(currentExpiry.getTime() + (DAYS_IN_MONTH * 24 * 60 * 60 * 1000));

    await ref.update({
      expiryDate: admin.firestore.Timestamp.fromDate(newExpiry),
      nextBillingDate: admin.firestore.Timestamp.fromDate(newExpiry),
      lastBillingDate: admin.firestore.Timestamp.fromDate(new Date()),
      paymentHistory: admin.firestore.FieldValue.arrayUnion({
        amount: invoice.amount_paid / 100,
        date: admin.firestore.Timestamp.fromDate(new Date()),
        invoiceId: invoice.id,
        status: 'succeeded',
      }),
    });
  } catch (error) {
    console.error('Erreur handleInvoicePaymentSucceeded:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    const snapshot = await admin.firestore()
      .collection('userSubscriptions')
      .where('stripeSubscriptionId', '==', subscription.id)
      .limit(1)
      .get();

    if (snapshot.empty) return;

    const updates = { stripeStatus: subscription.status };
    if (['unpaid', 'canceled', 'incomplete_expired'].includes(subscription.status)) {
      updates.isActive = false;
    }

    await snapshot.docs[0].ref.update(updates);
  } catch (error) {
    console.error('Erreur handleSubscriptionUpdated:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const snapshot = await admin.firestore()
      .collection('userSubscriptions')
      .where('stripeSubscriptionId', '==', subscription.id)
      .limit(1)
      .get();

    if (snapshot.empty) return;

    const ref = snapshot.docs[0].ref;
    const data = snapshot.docs[0].data();

    await ref.update({
      isActive: false,
      isRecurring: false,
      canceledAt: admin.firestore.FieldValue.serverTimestamp(),
      stripeStatus: 'canceled',
    });

    const serviceRef = admin.firestore()
      .collection('services')
      .doc(data.serviceId)
      .collection('subscriptions')
      .doc(data.subscriptionId);

    await admin.firestore().runTransaction(async (transaction) => {
      const serviceSubDoc = await transaction.get(serviceRef);
      if (!serviceSubDoc.exists) return;

      const serviceSubData = serviceSubDoc.data();
      const updatedUsers = (serviceSubData.users || []).filter(u => u.userId !== data.userId);

      transaction.update(serviceRef, {
        currentUsers: Math.max(0, (serviceSubData.currentUsers || 0) - 1),
        users: updatedUsers,
      });
    });
  } catch (error) {
    console.error('Erreur handleSubscriptionDeleted:', error);
    throw error;
  }
}
