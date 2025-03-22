import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptions } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { firestore } from '../firebase';

// Composant ServiceCard optimisé
const ServiceCard = React.memo(({ service, onClick }) => {
  const { currentUser } = useAuth();
  
  // Obtenir une couleur de fond en fonction du type de service
  const getBgColor = () => {
    const category = service.category?.toLowerCase() || '';
    if (category.includes('streaming') || category.includes('svod')) return 'from-red-600 to-pink-600';
    if (category.includes('musique')) return 'from-green-600 to-teal-600';
    if (category.includes('cloud')) return 'from-blue-600 to-indigo-600';
    if (category.includes('sécurité')) return 'from-yellow-600 to-orange-600';
    if (category.includes('productivité')) return 'from-purple-600 to-indigo-600';
    return 'from-blue-600 to-purple-600';
  };
  
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 group">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            {service.imageUrl ? (
              <img src={service.imageUrl} alt={service.name} className="w-12 h-12 rounded-lg mr-4 object-cover" loading="lazy" />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-4 flex items-center justify-center text-white font-bold text-xl">
                {service.name.charAt(0)}
              </div>
            )}
            <h3 className="text-xl font-bold">{service.name}</h3>
          </div>
        </div>
        
        <p className="text-white/80 mb-6 line-clamp-2 h-12">{service.description}</p>
        
        <div className="flex justify-between items-center">
          <div className="bg-blue-600/20 rounded-full px-4 py-1 text-blue-300 font-semibold">
            à partir de {service.defaultPrice?.toFixed(2) || "??.??"} €
          </div>
          <Link
            to={`/service/${service.id}`}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-300"
            onClick={onClick}
          >
            Voir les options
          </Link>
        </div>
      </div>
    </div>
  );
});

// Composant de chargement
const LoadingState = () => (
  <div className="flex justify-center items-center py-16">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-white">Chargement des services...</p>
    </div>
  </div>
);

// Composant pour les filtres de catégories
const CategoryFilters = React.memo(({ categories, selectedCategory, onChange }) => (
  <div className="flex flex-wrap justify-center gap-2 mb-12">
    {categories.map(category => (
      <button
        key={category}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          selectedCategory === category 
            ? 'bg-blue-600 text-white' 
            : 'bg-white/10 hover:bg-white/20 text-white'
        }`}
        onClick={() => onChange(category)}
      >
        {category}
      </button>
    ))}
  </div>
));

// Composant principal
const ServicesListPage = () => {
  const { mainServices, loading: contextLoading, refreshServices } = useSubscriptions();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [error, setError] = useState(null);
  const [localServices, setLocalServices] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  
  // Extraire toutes les catégories uniques des services
  const allCategories = useMemo(() => {
    const categories = new Set(['Tous']);
    const services = mainServices.length > 0 ? mainServices : localServices;
    
    services.forEach(service => {
      if (service.category) {
        categories.add(service.category);
      }
    });
    
    return Array.from(categories);
  }, [mainServices, localServices]);
  
  // Filtrer les services - mémorisé pour éviter des recalculs inutiles
  const filteredServices = useMemo(() => {
    const services = mainServices.length > 0 ? mainServices : localServices;
    
    return services.filter(service => {
      const matchesSearch = !searchTerm || 
                           service.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           service.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Tous' || service.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [mainServices, localServices, searchTerm, selectedCategory]);

  // Grouper les services par catégorie pour l'affichage - mémorisé
  const servicesByCategory = useMemo(() => {
    const grouped = {};
    
    filteredServices.forEach(service => {
      const category = service.category || 'Autres';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(service);
    });
    
    return grouped;
  }, [filteredServices]);

  // Chargement direct depuis Firestore au cas où le contexte échoue
  useEffect(() => {
    let isMounted = true;
    
    const fetchServices = async () => {
      if (mainServices.length > 0) {
        if (isMounted) {
          setLocalLoading(false);
        }
        return;
      }
      
      try {
        setLocalLoading(true);
        
        const servicesSnapshot = await firestore.collection('services').get();
        
        if (!isMounted) return;
        
        const servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setLocalServices(servicesData);
        setError(null);
      } catch (err) {
        console.error("Erreur lors du chargement des services:", err);
        if (isMounted) {
          setError(err.message || "Erreur lors du chargement des services. Veuillez réessayer.");
        }
      } finally {
        if (isMounted) {
          setLocalLoading(false);
        }
      }
    };
    
    fetchServices();
    
    return () => {
      isMounted = false;
    };
  }, [mainServices]);

  // Gérer le changement de catégorie
  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  // Gérer la recherche
  const handleSearch = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  // Effacer les filtres
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory('Tous');
  }, []);

  // État de chargement global
  const isLoading = (contextLoading && localLoading) || (localLoading && mainServices.length === 0);

  // Gérer les erreurs
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-blue-900 py-12 px-4 flex items-center justify-center">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-lg max-w-xl">
          <p className="font-bold text-xl mb-2">Erreur lors du chargement des services</p>
          <p className="mb-4">{error}</p>
          <button 
            onClick={() => {
              setLocalLoading(true);
              refreshServices().finally(() => setLocalLoading(false));
            }} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
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
              onChange={handleSearch}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filtres par catégorie */}
        <CategoryFilters 
          categories={allCategories} 
          selectedCategory={selectedCategory} 
          onChange={handleCategoryChange} 
        />
      </div>

      {/* Affichage du loader */}
      {isLoading ? (
        <LoadingState />
      ) : (
        /* Liste des services */
        <div className="container mx-auto px-4">
          {Object.keys(servicesByCategory).length === 0 ? (
            <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 max-w-2xl mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-white/60 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-xl font-medium">Aucun service ne correspond à votre recherche</h3>
              <p className="mt-2 text-white/70 mb-6">Essayez avec d'autres termes ou catégories</p>
              
              <button 
                onClick={clearFilters}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Effacer les filtres
              </button>
            </div>
          ) : (
            Object.keys(servicesByCategory).map(category => (
              <div key={category} className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">{category}</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {servicesByCategory[category].map(service => (
                    <ServiceCard 
                      key={service.id} 
                      service={service} 
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ServicesListPage;