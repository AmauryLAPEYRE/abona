import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { firestore } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const SuccessPage = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copyStatus, setCopyStatus] = useState({});

  // Extraire les donn\u00e9es d'\u00e9tat de navigation de mani\u00e8re s\u00e9curis\u00e9e
  const navigationState = location.state || {};
  const {
    serviceId,
    serviceName,
    userSubscriptionId,
    subscriptionName,
    duration,
    price,
    isRecurring = false
  } = navigationState;

  // Fonction pour copier du texte avec retour d'\u00e9tat
  const copyToClipboard = useCallback((text, field) => {
    if (!text) return;

    navigator.clipboard.writeText(text)
      .then(() => {
        setCopyStatus(prev => ({ ...prev, [field]: true }));

        // R\u00e9initialiser apr\u00e8s 2 secondes
        setTimeout(() => {
          setCopyStatus(prev => ({ ...prev, [field]: false }));
        }, 2000);
      })
      .catch(err => {
        console.error('Erreur lors de la copie :', err);
        setCopyStatus(prev => ({ ...prev, [field]: false }));
      });
  }, []);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!currentUser) {
        setLoading(false);
        setError("Vous devez \u00eatre connect\u00e9 pour acc\u00e9der \u00e0 cette page");
        return;
      }

      // Si pas de serviceId, on ne peut pas r\u00e9cup\u00e9rer l'abonnement
      if (!serviceId) {
        setLoading(false);
        return;
      }

      try {
        let subscriptionDoc;

        // Si nous avons l'ID de l'abonnement utilisateur, on l'utilise directement
        if (userSubscriptionId) {
          subscriptionDoc = await firestore
            .collection('userSubscriptions')
            .doc(userSubscriptionId)
            .get();

          if (subscriptionDoc.exists) {
            setSubscription({
              id: subscriptionDoc.id,
              ...subscriptionDoc.data()
            });
            setLoading(false);
            return;
          }
        }

        // Sinon, on essaie de trouver le dernier abonnement cr\u00e9\u00e9 pour ce service
        const subscriptionsSnapshot = await firestore
          .collection('userSubscriptions')
          .where('userId', '==', currentUser.uid)
          .where('serviceId', '==', serviceId)
          .orderBy('startDate', 'desc')
          .limit(1)
          .get();

        if (!subscriptionsSnapshot.empty) {
          setSubscription({
            id: subscriptionsSnapshot.docs[0].id,
            ...subscriptionsSnapshot.docs[0].data()
          });
        } else {
          // Aucun abonnement trouv\u00e9, mais ce n'est pas une erreur
          // (les informations d'acc\u00e8s sont peut-\u00eatre encore en cours de pr\u00e9paration)
          console.log("Aucun abonnement trouv\u00e9 pour ce service");
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setError("Erreur lors de la r\u00e9cup\u00e9ration des informations d'abonnement");
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [currentUser, serviceId, userSubscriptionId]);

  // Formatage de la date en fran\u00e7ais
  const formatDate = (date) => {
    if (!date) return 'Date inconnue';

    try {
      return new Date(date instanceof Date ? date : date.toDate()).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      console.error("Erreur lors du formatage de la date:", e);
      return 'Date invalide';
    }
  };

  if (loading) {
    return (
      <div className="page-bg text-white py-12 px-4 flex justify-center items-center">
        <div className="spinner"></div>
      </div>
    );
  }

  // Redirect si pas de serviceId ou d'\u00e9tat de navigation
  if (!serviceId && !userSubscriptionId) {
    return <Navigate to="/dashboard" replace />;
  }

  // Cas d'erreur (acc\u00e8s non autoris\u00e9, etc.)
  if (error) {
    return (
      <div className="page-bg text-white py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="glass-card overflow-hidden">
            <div className="bg-red-500 px-6 py-8 text-center">
              <div className="rounded-full bg-white p-2 mx-auto w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Erreur</h1>
              <p className="text-white/90">{error}</p>
            </div>

            <div className="p-6">
              <Link
                to="/dashboard"
                className="btn-primary"
              >
                Retour au tableau de bord
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg text-white py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="glass-card overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-white p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Votre acc\u00e8s est pr\u00eat !</h1>
            <p className="text-white/90">
              Votre acc\u00e8s \u00e0 {serviceName || (subscription?.serviceName || 'votre service')} est activ\u00e9 pour {duration || subscription?.duration || 30} jours.
            </p>
          </div>

          <div className="p-6">
            {subscription ? (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-white mb-4">D\u00e9tails de votre abonnement</h2>

                <div className="bg-white/5 rounded-lg p-4 space-y-4">
                  {subscription.accessType === 'account' && (
                    <>
                      <div>
                        <p className="text-sm text-white/50">Email d'acc\u00e8s</p>
                        <div className="flex items-center justify-between">
                          <p className="text-white font-medium">{subscription.email}</p>
                          <button
                            onClick={() => copyToClipboard(subscription.email, 'email')}
                            className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                          >
                            {copyStatus.email ? (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Copi\u00e9
                              </>
                            ) : "Copier"}
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-white/50">Mot de passe</p>
                        <div className="flex items-center justify-between">
                          <p className="text-white font-medium">{subscription.password}</p>
                          <button
                            onClick={() => copyToClipboard(subscription.password, 'password')}
                            className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                          >
                            {copyStatus.password ? (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Copi\u00e9
                              </>
                            ) : "Copier"}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {subscription.accessLink && (
                    <div>
                      <p className="text-sm text-white/50">Lien d'acc\u00e8s</p>
                      <div className="flex items-center justify-between">
                        <a
                          href={subscription.accessLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 break-all"
                        >
                          {subscription.accessLink}
                        </a>
                        <button
                          onClick={() => copyToClipboard(subscription.accessLink, 'accessLink')}
                          className="text-blue-400 hover:text-blue-300 text-sm ml-2 whitespace-nowrap flex items-center"
                        >
                          {copyStatus.accessLink ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Copi\u00e9
                            </>
                          ) : "Copier"}
                        </button>
                      </div>
                    </div>
                  )}

                  {subscription.invitationLink && (
                    <div>
                      <p className="text-sm text-white/50">Lien d'invitation</p>
                      <div className="flex items-center justify-between">
                        <a
                          href={subscription.invitationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 break-all"
                        >
                          {subscription.invitationLink}
                        </a>
                        <button
                          onClick={() => copyToClipboard(subscription.invitationLink, 'invitationLink')}
                          className="text-blue-400 hover:text-blue-300 text-sm ml-2 whitespace-nowrap flex items-center"
                        >
                          {copyStatus.invitationLink ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Copi\u00e9
                            </>
                          ) : "Copier"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/10">
                    <p className="text-sm text-white/50">Type d'abonnement</p>
                    <p className="text-white font-medium">
                      {isRecurring ? "Mensuel r\u00e9current" : `Dur\u00e9e unique (${duration || subscription.duration || 30} jours)`}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-white/50">Validit\u00e9</p>
                    <p className="text-white font-medium">
                      Jusqu'au {formatDate(subscription.expiryDate)}
                    </p>
                  </div>

                  {price && (
                    <div>
                      <p className="text-sm text-white/50">Montant pay\u00e9</p>
                      <p className="text-white font-medium">
                        {price.toFixed(2)} \u20ac
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-300">
                        Conservez ces informations dans un endroit s\u00fbr. Vous pouvez \u00e9galement les retrouver \u00e0 tout moment dans votre tableau de bord.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-300">
                      Vos identifiants sont en cours de pr\u00e9paration. Ils seront bient\u00f4t disponibles dans votre tableau de bord.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/dashboard"
                className="btn-primary flex-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Tableau de bord
              </Link>

              {subscription && (subscription.accessLink || subscription.invitationLink) && (
                <a
                  href={subscription.accessLink || subscription.invitationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-success flex-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Acc\u00e9der maintenant
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;
