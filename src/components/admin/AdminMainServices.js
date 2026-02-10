import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { firestore } from '../../firebase';

const AdminMainServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [categories, setCategories] = useState(['Tous']);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Filtrer et trier les services
  const filteredAndSortedServices = services
    .filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          service.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Tous' || service.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'category') {
        comparison = (a.category || '').localeCompare(b.category || '');
      } else if (sortBy === 'subscriptionCount') {
        comparison = (a.subscriptionCount || 0) - (b.subscriptionCount || 0);
      } else if (sortBy === 'totalUsers') {
        comparison = (a.totalUsers || 0) - (b.totalUsers || 0);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Charger les services
  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const servicesSnapshot = await firestore.collection('services').get();

      // Extraire les categories uniques
      const uniqueCategories = new Set(['Tous']);

      // Recuperer tous les services avec leurs stats
      const servicesData = await Promise.all(servicesSnapshot.docs.map(async (doc) => {
        const service = {
          id: doc.id,
          ...doc.data()
        };

        // Ajouter la categorie a l'ensemble des categories uniques
        if (service.category) {
          uniqueCategories.add(service.category);
        }

        // Recuperer le nombre d'abonnements pour ce service
        const subscriptionsSnapshot = await firestore
          .collection('services')
          .doc(doc.id)
          .collection('subscriptions')
          .get();

        service.subscriptionCount = subscriptionsSnapshot.size;

        // Calculer le nombre total d'utilisateurs pour ce service
        let totalUsers = 0;
        subscriptionsSnapshot.docs.forEach(subDoc => {
          const subData = subDoc.data();
          totalUsers += (subData.currentUsers || 0);
        });

        service.totalUsers = totalUsers;

        return service;
      }));

      setServices(servicesData);
      setCategories(Array.from(uniqueCategories));
      setError(null);
    } catch (err) {
      console.error("Erreur lors du chargement des services:", err);
      setError(err.message || "Erreur lors du chargement des services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Supprimer un service
  const handleDelete = async (serviceId) => {
    // Fermer la boite de dialogue de confirmation
    setShowDeleteConfirm(null);

    try {
      setLoading(true);

      // Recuperer tous les abonnements de ce service
      const subscriptionsSnapshot = await firestore
        .collection('services')
        .doc(serviceId)
        .collection('subscriptions')
        .get();

      // Supprimer tous les abonnements
      const batch = firestore.batch();

      subscriptionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Supprimer le service principal
      batch.delete(firestore.collection('services').doc(serviceId));

      // Executer le batch
      await batch.commit();

      // Mettre a jour la liste locale
      setServices(services.filter(s => s.id !== serviceId));
      setLoading(false);
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      setError("Erreur lors de la suppression du service");
      setLoading(false);
    }
  };

  // Changer le tri
  const handleSortChange = (column) => {
    if (sortBy === column) {
      // Si on clique sur la meme colonne, on inverse l'ordre
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Sinon, on trie par la nouvelle colonne en ordre ascendant
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Icone de tri
  const SortIcon = ({ column }) => {
    if (sortBy !== column) return null;

    return sortOrder === 'asc' ? (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (loading && services.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Gestion des services</h1>
        <Link
          to="/admin/services/new"
          className="btn-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Ajouter un service
        </Link>
      </div>

      {error && (
        <div className="glass-alert-error mb-6" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="font-bold">Erreur</p>
              <p>{error}</p>
            </div>
          </div>
          <div className="mt-3">
            <button
              onClick={fetchServices}
              className="text-sm text-red-400 hover:text-red-300 font-medium underline"
            >
              Reessayer
            </button>
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden mb-6">
        {/* Barre d'actions */}
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row md:items-center gap-4">
          {/* Recherche */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-white/40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              className="glass-input pl-10"
              placeholder="Rechercher un service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtre par categorie */}
          <div className="w-full md:w-48">
            <select
              className="glass-input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Bouton d'actualisation */}
          <button
            onClick={fetchServices}
            className="btn-secondary text-sm py-2 px-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-0.5 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
        </div>

        {filteredAndSortedServices.length === 0 ? (
          <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-white/60">Aucun service trouve</h3>
            <p className="mt-1 text-sm text-white/60">
              {searchTerm || selectedCategory !== 'Tous'
                ? `Aucun resultat pour votre recherche. Essayez avec d'autres termes ou filtres.`
                : "Commencez par ajouter un nouveau service."}
            </p>
            {(searchTerm || selectedCategory !== 'Tous') ? (
              <div className="mt-4 flex space-x-4 justify-center">
                <button
                  className="text-sm text-blue-400 hover:text-blue-300"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('Tous');
                  }}
                >
                  Effacer les filtres
                </button>
              </div>
            ) : (
              <div className="mt-6">
                <Link
                  to="/admin/services/new"
                  className="btn-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Ajouter un service
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="border-b border-white/10">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('name')}
                  >
                    Service
                    <SortIcon column="name" />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider cursor-pointer hidden sm:table-cell"
                    onClick={() => handleSortChange('category')}
                  >
                    Categorie
                    <SortIcon column="category" />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider cursor-pointer hidden lg:table-cell"
                    onClick={() => handleSortChange('subscriptionCount')}
                  >
                    Abonnements
                    <SortIcon column="subscriptionCount" />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider cursor-pointer hidden lg:table-cell"
                    onClick={() => handleSortChange('totalUsers')}
                  >
                    Utilisateurs
                    <SortIcon column="totalUsers" />
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredAndSortedServices.map(service => (
                  <tr key={service.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {service.imageUrl ? (
                            <img className="h-10 w-10 rounded-full object-cover" src={service.imageUrl} alt={service.name} />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                              {service.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{service.name}</div>
                          <div className="text-sm text-white/50 line-clamp-1 max-w-xs">{service.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      {service.category ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/20 text-blue-300">
                          {service.category}
                        </span>
                      ) : (
                        <span className="text-sm text-white/50">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      <div className="text-sm text-white/80">{service.subscriptionCount || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      <div className="text-sm text-white/80">{service.totalUsers || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/admin/services/${service.id}/subscriptions`}
                          className="text-purple-400 hover:text-purple-300"
                          title="Gerer les abonnements"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                          </svg>
                        </Link>
                        <Link
                          to={`/admin/services/edit/${service.id}`}
                          className="text-blue-400 hover:text-blue-300"
                          title="Modifier"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => setShowDeleteConfirm(service.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Supprimer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5">
          <h3 className="text-sm font-medium text-white/60">Services actifs</h3>
          <p className="text-3xl font-bold text-white mt-1">{services.length}</p>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-medium text-white/60">Abonnements</h3>
          <p className="text-3xl font-bold text-white mt-1">
            {services.reduce((sum, service) => sum + (service.subscriptionCount || 0), 0)}
          </p>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-medium text-white/60">Utilisateurs</h3>
          <p className="text-3xl font-bold text-white mt-1">
            {services.reduce((sum, service) => sum + (service.totalUsers || 0), 0)}
          </p>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-medium text-white/60">Categories</h3>
          <p className="text-3xl font-bold text-white mt-1">
            {categories.length - 1} {/* -1 pour exclure "Tous" */}
          </p>
        </div>
      </div>

      {/* Boite de dialogue de confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={() => setShowDeleteConfirm(null)}></div>
          <div className="relative bg-white/10 backdrop-blur-xl border border-white/10 rounded-lg max-w-md w-full mx-4 p-6">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <h3 className="text-lg font-medium text-white mt-4">Confirmation de suppression</h3>
              <p className="text-sm text-white/60 mt-2">
                Etes-vous sur de vouloir supprimer ce service ? Cette action supprimera egalement tous les abonnements associes et ne peut pas etre annulee.
              </p>
            </div>
            <div className="mt-6 flex justify-center space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="btn-danger"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMainServices;
