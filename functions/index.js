const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

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
      amount,
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
    throw new functions.https.HttpsError(
      'internal',
      error.message
    );
  }
});

exports.confirmSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Vous devez être connecté pour effectuer cette action.'
    );
  }
  
  const { paymentIntentId, serviceId } = data;
  const userId = context.auth.uid;
  
  try {
    // Vérifier le paiement
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Le paiement n\'a pas été confirmé'
      );
    }
    
    // Obtenir un identifiant disponible
    const credentialsSnapshot = await admin.firestore()
      .collection('services')
      .doc(serviceId)
      .collection('credentials')
      .where('inUse', '==', false)
      .limit(1)
      .get();
    
    if (credentialsSnapshot.empty) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Plus d\'identifiants disponibles pour ce service'
      );
    }
    
    const credentialDoc = credentialsSnapshot.docs[0];
    const credentialId = credentialDoc.id;
    const credentialData = credentialDoc.data();
    
    // Obtenir les détails du service
    const serviceDoc = await admin.firestore().collection('services').doc(serviceId).get();
    const serviceData = serviceDoc.data();
    
    // Marquer l'identifiant comme utilisé
    await admin.firestore()
      .collection('services')
      .doc(serviceId)
      .collection('credentials')
      .doc(credentialId)
      .update({ inUse: true });
    
    // Créer l'abonnement
    const subscriptionData = {
      userId,
      serviceId,
      serviceName: serviceData.name,
      credentialId,
      paymentId: paymentIntentId,
      email: credentialData.email,
      password: credentialData.password,
      accessLink: credentialData.accessLink || null,
      startDate: admin.firestore.FieldValue.serverTimestamp(),
      expiryDate: new Date(Date.now() + serviceData.duration * 24 * 60 * 60 * 1000),
      status: 'active'
    };
    
    const subscriptionRef = await admin.firestore().collection('subscriptions').add(subscriptionData);
    
    return { success: true, subscriptionId: subscriptionRef.id };
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      error.message
    );
  }
});