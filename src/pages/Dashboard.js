import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptions } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import SubscriptionCard from '../components/SubscriptionCard';

const Dashboard = () => {
  const { userSubscriptions, loading } = useSubscriptions();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('active');

  // Filtrer les abonnements actifs et expirés - memoizé pour éviter des recalculs inutiles
  const { activeSubscriptions, expiredSubscriptions } = useMemo(() => {
    const active = userSubscriptions.filter(sub => {
      const isExpired = new Date() > new Date(sub.expiryDate.toDate());
      return !isExpired;
    });

    const expired = userSubscriptions.filter(sub => {
      const isExpired = new Date() > new Date(sub.expiryDate.toDate());
      return isExpired;
    });

    return { activeSubscriptions: active, expiredSubscriptions: expired };
  }, [userSubscriptions]);

  // Gestionnaire pour changer d'onglet
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-bg text-white pb-12 min-h-screen">
      <div className="bg-gradient-to-r from-blue-700 to-purple-800 text-white">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold">Mes abonnements</h1>
          <p className="mt-2 opacity-80">Gérez vos abonnements et vos accès partagés</p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-6">
        {/* Onglets */}
        <div className="glass-card p-4 flex justify-center space-x-4 rounded-t-xl">
          <button
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'active'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:bg-white/10'
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
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:bg-white/10'
            }`}
            onClick={() => handleTabChange('expired')}
          >
            Abonnements expirés
            <span className="ml-2 px-2 py-0.5 bg-white/20 text-white/60 text-xs rounded-full">
              {expiredSubscriptions.length}
            </span>
          </button>
        </div>

        {/* Contenu principal */}
        <div className="glass-card p-6 mb-8 rounded-b-xl">
          {activeTab === 'active' && (
            <>
              {activeSubscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-white/40 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="text-xl font-medium text-white/80 mb-2">Aucun abonnement actif</h3>
                  <p className="text-white/60 mb-6">Vous n'avez pas encore d'abonnements actifs.</p>
                  <Link to="/services" className="btn-primary">
                    Commencez à économiser
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeSubscriptions.map(subscription => (
                    <SubscriptionCard
                      key={subscription.id}
                      subscription={subscription}
                      showDetails={true}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'expired' && (
            <>
              {expiredSubscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-white/40 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-medium text-white/80 mb-2">Aucun abonnement expiré</h3>
                  <p className="text-white/60">Tous vos abonnements sont encore actifs.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {expiredSubscriptions.map(subscription => (
                    <SubscriptionCard
                      key={subscription.id}
                      subscription={subscription}
                      showDetails={true}
                      isCompact={true}
                      className="opacity-70"
                      renderActions={(subscription) => (
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-red-400">
                            Expiré le {new Date(subscription.expiryDate.toDate()).toLocaleDateString()}
                          </div>
                          <Link
                            to={`/service/${subscription.serviceId}`}
                            className="btn-primary text-sm px-3 py-1"
                          >
                            Renouveler mon accès
                          </Link>
                        </div>
                      )}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
