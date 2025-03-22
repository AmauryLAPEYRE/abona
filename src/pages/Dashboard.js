import React, { useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptions } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';

// Chargement paresseux du composant SubscriptionCard pour réduire le bundle initial
const SubscriptionCard = lazy(() => import('../components/SubscriptionCard'));

// Composant de chargement pour les cartes d'abonnement
const SubscriptionCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-64 animate-pulse">
    <div className="h-24 bg-gray-200"></div>
    <div className="p-4">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
  </div>
);

// Composant pour afficher un message vide
const EmptyState = ({ type, onClick }) => (
  <div className="text-center py-12">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
    <h3 className="text-xl font-medium text-gray-700 mb-2">
      {type === 'active' ? 'Aucun abonnement actif' : 'Aucun abonnement expiré'}
    </h3>
    <p className="text-gray-500 mb-6">
      {type === 'active' 
        ? 'Vous n\'avez pas encore d\'abonnements actifs.' 
        : 'Tous vos abonnements sont encore actifs.'}
    </p>
    {type === 'active' && (
      <Link to="/services" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
        Découvrir les services
      </Link>
    )}
  </div>
);

const Dashboard = () => {
  const { userSubscriptions, loading } = useSubscriptions();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('active');

  // Calculer une seule fois les abonnements actifs et expirés
  // Optimisé pour éviter les recalculs inutiles
  const { activeSubscriptions, expiredSubscriptions } = useMemo(() => {
    // Date actuelle calculée une seule fois pour toutes les comparaisons
    const now = new Date();
    
    return userSubscriptions.reduce((result, sub) => {
      // Conversion de la date en objet Date une seule fois
      const expiryDate = sub.expiryDate.toDate();
      const isExpired = now > expiryDate;
      
      if (isExpired) {
        result.expiredSubscriptions.push(sub);
      } else {
        result.activeSubscriptions.push(sub);
      }
      
      return result;
    }, { activeSubscriptions: [], expiredSubscriptions: [] });
  }, [userSubscriptions]);

  // Gestionnaire pour changer d'onglet - mémorisé pour éviter les recréations
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // Actions personnalisées pour les abonnements expirés - mémorisées
  const renderExpiredActions = useCallback((subscription) => (
    <div className="flex justify-between items-center">
      <div className="text-sm text-red-500">
        Expiré le {new Date(subscription.expiryDate.toDate()).toLocaleDateString()}
      </div>
      <Link
        to={`/service/${subscription.serviceId}`}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-lg transition-colors"
      >
        Renouveler
      </Link>
    </div>
  ), []);

  // Contenu à afficher en fonction de l'état de chargement et des données
  const renderContent = () => {
    // Affichage des skeletons pendant le chargement
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, index) => (
            <SubscriptionCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    // Détermine quels abonnements afficher en fonction de l'onglet actif
    const subscriptionsToShow = activeTab === 'active' ? activeSubscriptions : expiredSubscriptions;
    
    // Si aucun abonnement à afficher, montrer un état vide
    if (subscriptionsToShow.length === 0) {
      return <EmptyState type={activeTab} />;
    }
    
    // Sinon, afficher les cartes d'abonnement
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subscriptionsToShow.map(subscription => (
          <Suspense key={subscription.id} fallback={<SubscriptionCardSkeleton />}>
            <SubscriptionCard 
              subscription={subscription}
              showDetails={true}
              isCompact={activeTab === 'expired'}
              className={activeTab === 'expired' ? 'opacity-70' : ''}
              renderActions={activeTab === 'expired' ? renderExpiredActions : undefined}
            />
          </Suspense>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen pb-12">
      <div className="bg-gradient-to-r from-blue-700 to-purple-800 text-white">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold">Mes abonnements</h1>
          <p className="mt-2 opacity-80">Gérez vos abonnements et vos accès partagés</p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-6">
        {/* Onglets avec compteur */}
        <div className="bg-white rounded-t-xl shadow-md p-4 flex justify-center space-x-4">
          <button
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'active' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            onClick={() => handleTabChange('active')}
          >
            Abonnements actifs
            <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              {activeSubscriptions.length}
            </span>
          </button>
          <button
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'expired' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            onClick={() => handleTabChange('expired')}
          >
            Abonnements expirés
            <span className="ml-2 px-2 py-0.5 bg-gray-600 text-white text-xs rounded-full">
              {expiredSubscriptions.length}
            </span>
          </button>
        </div>

        {/* Contenu principal */}
        <div className="bg-white rounded-b-xl shadow-md p-6 mb-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;