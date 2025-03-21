import React from 'react';
import { useSubscriptions } from '../contexts/SubscriptionContext';
import SubscriptionCard from '../components/SubscriptionCard';

const Dashboard = () => {
  const { userSubscriptions, loading } = useSubscriptions();

  if (loading) {
    return <div className="text-center py-10">Chargement des abonnements...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Mes abonnements</h1>

      {userSubscriptions.length === 0 ? (
        <div className="bg-gray-100 p-6 rounded-lg text-center">
          <p className="text-lg mb-4">Vous n'avez pas encore d'abonnements actifs.</p>
          <a href="/" className="bg-blue-600 text-white px-4 py-2 rounded-lg">Découvrir les services</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userSubscriptions.map(subscription => (
            <SubscriptionCard key={subscription.id} subscription={subscription} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;