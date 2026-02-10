import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptions } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { firestore } from '../firebase';

const ServicesListPage = () => {
  const { mainServices, loading } = useSubscriptions();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [error, setError] = useState(null);
  const [localServices, setLocalServices] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);

  // Extraire toutes les catégories uniques des services
  const allCategories = ['Tous'];
  const services = mainServices.length > 0 ? mainServices : localServices;

  services.forEach(service => {
    if (service.category && !allCategories.includes(service.category)) {
      allCategories.push(service.category);
    }
  });

  // Filtrer les services en fonction du terme de recherche et de la catégorie
  const filteredServices = services.filter(service => {
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

  // Chargement direct depuis Firestore au cas où le contexte échoue
  useEffect(() => {
    const fetchServices = async () => {
      if (mainServices.length > 0) {
        setLocalLoading(false);
        return;
      }

      try {
        setLocalLoading(true);
        const servicesSnapshot = await firestore.collection('services').get();
        const servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLocalServices(servicesData);
        setLocalLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement des services:", err);
        setError(err.message || "Erreur lors du chargement des services. Veuillez réessayer.");
        setLocalLoading(false);
      }
    };

    fetchServices();
  }, [mainServices]);

  if ((loading && localLoading) || (localLoading && mainServices.length === 0)) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-b from-gray-900 to-blue-900">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-white">Chargement des services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-blue-900">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-lg max-w-xl">
          <p className="font-bold text-xl mb-2">Erreur lors du chargement des services</p>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary text-sm py-2 px-4"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-900 to-blue-900 text-white min-h-screen pb-12">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-12 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Vos services premium, au juste prix</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">Payez uniquement ce que vous consommez. Choisissez la durée qui vous convient.</p>

          {!currentUser && (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/register" className="btn-primary">
                Commencer gratuitement
              </Link>
              <Link to="/login" className="btn-secondary">
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
              className="glass-input rounded-full pl-12"
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
              className={`category-pill ${
                selectedCategory === category
                  ? 'category-pill-active'
                  : 'category-pill-inactive'
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
                  <div key={service.id} className="glass-card-hover overflow-hidden group">
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
                          className="btn-primary text-sm py-2 px-4"
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
