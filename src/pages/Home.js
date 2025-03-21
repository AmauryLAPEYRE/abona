import React from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptions } from '../contexts/SubscriptionContext';
import ServiceCard from '../components/ServiceCard';

const Home = () => {
  const { services, loading } = useSubscriptions();

  if (loading) {
    return <div className="text-center py-10">Chargement des services...</div>;
  }

  return (
    <div>
      <div className="bg-blue-600 text-white rounded-lg p-8 mb-8">
        <h1 className="text-4xl font-bold mb-4">Partagez vos abonnements</h1>
        <p className="text-xl mb-4">Accédez à vos services préférés à prix réduits</p>
        <Link to="/register" className="bg-white text-blue-600 px-6 py-2 rounded-lg font-bold">
          Commencer maintenant
        </Link>
      </div>

      <h2 className="text-3xl font-bold mb-6">Services disponibles</h2>

      {services.length === 0 ? (
        <p>Aucun service disponible pour le moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;