import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptions } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';

const ServicesListPage = () => {
  const { mainServices, loading } = useSubscriptions();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  
  // Extraire toutes les catégories uniques des services
  const allCategories = ['Tous'];
  mainServices.forEach(service => {
    if (service.category && !allCategories.includes(service.category)) {
      allCategories.push(service.category);
    }
  });

  // Filtrer les services en fonction du terme de recherche et de la catégorie
  const filteredServices = mainServices.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         service.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Tous' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Grouper les services par catégorie pour l'affichage
  const servicesByCategory = {};
  filteredServices.forEach(service => {
    const category = service.category || 'Autres';
    if (!servicesByCategory[category]) {
      servicesByCategory[category] = [];
    }
    servicesByCategory[category].push(service);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-900 to-blue-900 text-white min-h-screen pb-12">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-12 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Partagez vos abonnements, réduisez vos coûts</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">Accédez à vos services préférés à prix réduits grâce au partage d'abonnements sécurisé et simplifié.</p>
          
          {!currentUser && (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                Commencer gratuitement
              </Link>
              <Link to="/login" className="bg-transparent hover:bg-white/10 border border-white text-white font-bold py-3 px-6 rounded-lg transition-colors">
                Se connecter
              </Link>
            </div>
          )}
        </div>

        {/* Barre de recherche */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un service..."
              className="w-full bg-white/10 border border-white/20 rounded-full py-3 px-6 pl-12 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filtres par catégorie */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {allCategories.map(category => (
            <button
              key={category}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des services */}
      <div className="container mx-auto px-4">
        {Object.keys(servicesByCategory).length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium">Aucun service ne correspond à votre recherche</h3>
            <p className="mt-2 text-white/70">Essayez avec d'autres termes ou catégories</p>
          </div>
        ) : (
          Object.keys(servicesByCategory).map(category => (
            <div key={category} className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{category}</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {servicesByCategory[category].map(service => (
                  <div key={service.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 group">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center">
                          {service.imageUrl ? (
                            <img src={service.imageUrl} alt={service.name} className="w-12 h-12 rounded-lg mr-4 object-cover" />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-4 flex items-center justify-center text-white font-bold text-xl">
                              {service.name.charAt(0)}
                            </div>
                          )}
                          <h3 className="text-xl font-bold">{service.name}</h3>
                        </div>
                      </div>
                      
                      <p className="text-white/80 mb-6 line-clamp-2">{service.description}</p>
                      
                      <div className="flex justify-between items-center">
                        <div className="bg-blue-600/20 rounded-full px-4 py-1 text-blue-300 font-semibold">
                          à partir de {service.defaultPrice?.toFixed(2) || "??.??"} €
                        </div>
                        <Link
                          to={`/service/${service.id}`}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-300"
                        >
                          Voir les options
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ServicesListPage;