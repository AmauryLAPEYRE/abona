import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div 
        className="h-40 bg-cover bg-center"
        style={{ 
          backgroundImage: service.imageUrl 
            ? `url(${service.imageUrl})` 
            : `url(/images/default-service.jpg)` 
        }}
      />
      
      <div className="p-4">
        <h3 className="text-xl font-bold mb-2">{service.name}</h3>
        <p className="text-gray-600 mb-4">{service.description}</p>
        
        <div className="flex justify-between items-center mb-4">
          <span className="text-2xl font-bold">{service.price.toFixed(2)} €</span>
          <span className="text-sm text-gray-500">pour {service.duration} jours</span>
        </div>
        
        <button
          onClick={handleSubscribe}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700"
        >
          S'abonner
        </button>
      </div>
    </div>
  );
};

export default ServiceCard;