import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { firestore } from '../firebase';
import { useSubscriptions } from '../contexts/SubscriptionContext';
import { DISCOUNT_RATE, MAX_DURATION_DAYS, MIN_DURATION_DAYS } from '../constants';
import { calculateDiscountedMonthly } from '../pricing';

const LandingPage = () => {
  const { currentUser, logout } = useAuth();
  const [popularServices, setPopularServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { calculateProRatedPrice } = useSubscriptions();

  // Fonction pour obtenir la couleur de fond du service
  const getServiceBgColor = (service) => {
    // Utiliser uniquement la couleur stockée dans la base de données
    return service.bgColor || '#3B82F6'; // Couleur par défaut (bleu) si non définie
  };

  // Fonction pour déterminer la couleur du texte en fonction de la luminosité du fond
  const getTextColorForBackground = (bgColor) => {
    // Si pas de couleur ou format non valide, retourner blanc (sécurité)
    if (!bgColor || !bgColor.startsWith('#')) return 'white';
    
    // Convertir la couleur hex en RGB
    let r, g, b;
    
    // Format #RRGGBB
    if (bgColor.length === 7) {
      r = parseInt(bgColor.substring(1, 3), 16);
      g = parseInt(bgColor.substring(3, 5), 16);
      b = parseInt(bgColor.substring(5, 7), 16);
    } 
    // Format #RGB
    else if (bgColor.length === 4) {
      r = parseInt(bgColor.substring(1, 2) + bgColor.substring(1, 2), 16);
      g = parseInt(bgColor.substring(2, 3) + bgColor.substring(2, 3), 16);
      b = parseInt(bgColor.substring(3, 4) + bgColor.substring(3, 4), 16);
    } else {
      return 'white';
    }
    
    // Calculer la luminosité (formule standard)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Si la luminosité est élevée (fond clair), retourner du texte foncé
    return luminance > 0.5 ? '#111827' : 'white';
  };

  // Chargement des services populaires
  useEffect(() => {
    const fetchPopularServices = async () => {
      try {
        setLoading(true);
        // Récupérer tous les services
        const servicesSnapshot = await firestore.collection('services').get();
        
        let servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          subscriptionCount: 0,
          totalUsers: 0
        }));
        
        // Pour chaque service, récupérer ses abonnements et compter les utilisateurs
        await Promise.all(
          servicesData.map(async (service) => {
            const subscriptionsSnapshot = await firestore
              .collection('services')
              .doc(service.id)
              .collection('subscriptions')
              .get();
            
            service.subscriptionCount = subscriptionsSnapshot.size;
            
            let totalUsers = 0;
            subscriptionsSnapshot.docs.forEach(subDoc => {
              const subData = subDoc.data();
              totalUsers += (subData.currentUsers || 0);
            });
            
            service.totalUsers = totalUsers;
            
            // Prendre par défaut le prix du premier abonnement disponible (si aucun defaultPrice n'est défini)
            if (!service.price && subscriptionsSnapshot.docs.length > 0) {
              const firstSub = subscriptionsSnapshot.docs[0].data();
              service.price = firstSub.price || 0;
              service.duration = firstSub.duration || 30;
            }
          })
        );
        
        // Trier les services par nombre d'utilisateurs (pour déterminer les plus populaires)
        servicesData.sort((a, b) => b.totalUsers - a.totalUsers);
        
        // Prendre les 3 premiers services (ou moins s'il y en a moins)
        setPopularServices(servicesData.slice(0, 3));
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération des services populaires:", error);
        setLoading(false);
      }
    };
    
    fetchPopularServices();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erreur de déconnexion', error);
    }
  };

  // Fonction pour formater le prix avec 2 décimales
  const formatPrice = (price) => {
    return typeof price === 'number' ? price.toFixed(2) : '0.00';
  };

  // Fonction pour calculer le prix pro-raté
  const calculateShortTermPrice = (price, duration, days) => {
    if (!price || !days) return '0.00';
    const proRatedPrice = calculateProRatedPrice ? calculateProRatedPrice(price, days) : (price / duration) * days;
    return formatPrice(proRatedPrice);
  };

  // Rendu conditionnel pendant le chargement
  if (loading && popularServices.length === 0) {
    return (
      <div className="bg-gradient-to-b from-gray-900 to-blue-900 text-white min-h-screen py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">Chargement des services...</h2>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-900 to-blue-900 text-white min-h-screen">
      {/* Header/Navigation */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Abona
          </div>
          <div className="flex space-x-4 items-center">
            {currentUser ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 text-white hover:text-blue-300 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-medium">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="font-medium">{currentUser.displayName || 'Utilisateur'}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Menu déroulant */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                  <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                    Mon profil
                  </Link>
                  <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                    Mes abonnements
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-white hover:text-blue-300 transition-colors">Connexion</Link>
                <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-16 pb-24">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Des abonnements premium
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500"> sans les prix premium</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto">
            Abona vous offre un accès direct à des services d'abonnement premium à prix réduit, sans les tracas du partage entre particuliers.
          </p>
          <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
            <span className="font-bold text-white">-{DISCOUNT_RATE * 100}% sur tous les services.</span> Payez uniquement pour la durée dont vous avez besoin, de {MIN_DURATION_DAYS} à {MAX_DURATION_DAYS} jours. Ne payez plus pour de l'inactivité.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {currentUser ? (
              <Link 
                to="/dashboard" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors duration-300"
              >
                Mon tableau de bord
              </Link>
            ) : (
              <Link 
                to="/register" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors duration-300"
              >
                Commencer maintenant
              </Link>
            )}
            <Link 
              to="/services" 
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-lg text-lg border border-white/20 transition-colors duration-300"
            >
              Découvrir nos services
            </Link>
          </div>
        </div>
      </div>

      {/* Comment ça marche */}
      <div className="bg-white/5 backdrop-blur-md py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Comment ça marche ?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">1</div>
              <h3 className="text-xl font-bold mb-4">Choisissez un service</h3>
              <p className="text-gray-300">Parcourez notre catalogue de services premium (Netflix, Spotify, Disney+, etc.) à prix réduits.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">2</div>
              <h3 className="text-xl font-bold mb-4">Sélectionnez votre durée</h3>
              <p className="text-gray-300">Besoin d'un accès pour 2 jours, 1 semaine ou plusieurs mois ? Vous payez uniquement pour la durée choisie.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">3</div>
              <h3 className="text-xl font-bold mb-4">Accédez instantanément</h3>
              <p className="text-gray-300">Recevez immédiatement vos identifiants et profitez de votre service préféré sans attendre.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services populaires - SECTION DYNAMIQUE AVEC LOGOS ET FOND ADAPTATIF */}
      <div className="bg-white/5 backdrop-blur-md py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">Nos services les plus populaires</h2>
          <p className="text-xl text-gray-300 text-center mb-16 max-w-3xl mx-auto">
            Découvrez notre sélection de services premium à des prix imbattables
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {popularServices.length > 0 ? (
              popularServices.map((service) => {
                // Prix officiel = service.price, prix Abona = avec réduction
                const discountedPrice = calculateDiscountedMonthly(service.price);

                // Prix court terme (2 jours par défaut)
                const shortTermDays = service.shortTermDays || MIN_DURATION_DAYS;
                const shortTermLabel = service.shortTermLabel || `${shortTermDays} jours`;

                const shortTermPrice = calculateShortTermPrice(service.price, service.duration || 30, shortTermDays);
                
                // Obtenir la couleur de fond du service
                const bgColor = getServiceBgColor(service);
                
                // Déterminer la couleur du texte en fonction de la luminosité du fond
                const textColor = getTextColorForBackground(bgColor);
                
                return (
                  <div 
                    key={service.id} 
                    className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
                  >
                    <div 
                      className="h-40 flex items-center justify-center p-4"
                      style={{ backgroundColor: bgColor }}
                    >
                      {service.imageUrl ? (
                        <img 
                          src={service.imageUrl} 
                          alt={service.name} 
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <h3 className="text-2xl font-bold" style={{ color: textColor }}>
                          {service.name}
                        </h3>
                      )}
                    </div>
                    <div className="p-6">
                      <p className="text-gray-300 mb-4 h-16 line-clamp-2">{service.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold text-green-400">{formatPrice(discountedPrice)}€</span>
                        <span className="line-through text-gray-400">{formatPrice(service.price)}€</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-400">par mois <span className="text-green-400 font-semibold">(-{DISCOUNT_RATE * 100}%)</span></div>
                      <div className="mt-1 text-xs text-green-400">ou {shortTermPrice}€ pour {shortTermLabel}</div>
                      <Link to={`/service/${service.id}`} className="mt-4 block text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Voir l'offre
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              // Afficher un message si aucun service n'est trouvé
              <div className="col-span-3 text-center py-8">
                <p className="text-white/70">Aucun service disponible pour le moment. Revenez bientôt!</p>
              </div>
            )}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/services" className="inline-flex items-center px-6 py-3 border border-white/20 rounded-lg text-lg font-medium text-white hover:bg-white/10 transition-colors">
              Voir tous les services
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Bannière de la tarification flexible */}
      <div className="py-16 bg-gradient-to-r from-blue-700 to-purple-700">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Tarification flexible - Payez pour ce que vous utilisez</h2>
          <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
            À la différence des autres plateformes, Abona vous permet de payer uniquement pour la durée exacte dont vous avez besoin
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold mb-1">{MIN_DURATION_DAYS} jours</div>
              <p className="text-sm mb-3">Pour un besoin ponctuel</p>
              <div className="text-green-400 text-xl">le strict minimum</div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 ring-2 ring-green-400">
              <div className="text-xs text-green-400 font-semibold mb-1">POPULAIRE</div>
              <div className="text-2xl font-bold mb-1">7 jours</div>
              <p className="text-sm mb-3">Pour une semaine tranquille</p>
              <div className="text-green-400 text-xl">le meilleur rapport</div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold mb-1">{MAX_DURATION_DAYS} jours</div>
              <p className="text-sm mb-3">Durée maximale</p>
              <div className="text-green-400 text-xl">demi-mois complet</div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Prêt à économiser sur vos abonnements ?</h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto">Rejoignez des milliers d'utilisateurs qui profitent déjà de services premium à prix réduit</p>
            {currentUser ? (
              <Link 
                to="/dashboard" 
                className="bg-white text-blue-600 hover:bg-gray-100 transition-colors px-8 py-4 rounded-lg font-bold text-lg"
              >
                Accéder à mon tableau de bord
              </Link>
            ) : (
              <Link 
                to="/register" 
                className="bg-white text-blue-600 hover:bg-gray-100 transition-colors px-8 py-4 rounded-lg font-bold text-lg"
              >
                S'inscrire gratuitement
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
                Abona
              </div>
              <p className="text-gray-400">Accès premium, prix mini, durée flexible</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                <Link to="/services" className="text-gray-300 hover:text-white">Services</Link>
                <Link to="/about" className="text-gray-300 hover:text-white">À propos</Link>
                <Link to="/terms" className="text-gray-300 hover:text-white">Conditions d'utilisation</Link>
                <Link to="/privacy" className="text-gray-300 hover:text-white">Politique de confidentialité</Link>
                <Link to="/contact" className="text-gray-300 hover:text-white">Contact</Link>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Abona. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;