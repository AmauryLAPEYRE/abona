import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ServiceCard = ({ service }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const handleSubscribe = () => {
    if (!currentUser) {
      navigate('/login', { state: { redirect: `/checkout/${service.id}` } });
      return;
    }
    
    navigate(`/checkout/${service.id}`);
  };
  
  // Déterminer la couleur de fond en fonction du type de service
  const getBgColor = () => {
    const category = service.category?.toLowerCase() || '';
    if (category.includes('streaming') || category.includes('svod')) return 'from-pink-600 to-red-600';
    if (category.includes('musique')) return 'from-green-600 to-teal-600';
    if (category.includes('cloud')) return 'from-blue-600 to-indigo-600';
    if (category.includes('sécurité')) return 'from-yellow-600 to-orange-600';
    if (category.includes('productivité')) return 'from-purple-600 to-indigo-600';
    return 'from-blue-600 to-purple-600'; // Valeur par défaut
  };
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className={`bg-gradient-to-r ${getBgColor()} h-24 relative p-6`}>
        <h2 className="text-xl font-bold text-white">{service.name}</h2>
        <div className="absolute right-4 bottom-4 bg-white/20 backdrop-blur-sm text-white rounded-full px-3 py-1 text-sm font-medium">
          {service.price.toFixed(2)} €/mois
        </div>
      </div>
      
      <div className="p-6">
        <p className="text-gray-600 mb-4 line-clamp-2 h-12">{service.description}</p>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{service.duration} jours</span>
          
          <button
            onClick={handleSubscribe}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            S'abonner
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;