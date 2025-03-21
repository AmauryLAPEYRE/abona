import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="bg-gradient-to-b from-gray-900 to-blue-900 text-white min-h-screen">
      {/* Header/Navigation */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Abona
          </div>
          <div className="flex space-x-4">
            <Link to="/login" className="text-white hover:text-blue-300 transition-colors">Connexion</Link>
            <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
              S'inscrire
            </Link>
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
            <span className="font-bold text-white">Exclusif :</span> Payez uniquement pour la durée dont vous avez besoin, de 2 jours à plusieurs mois.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              to="/register" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors duration-300"
            >
              Commencer maintenant
            </Link>
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

      {/* Avantages */}
      <div className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Pourquoi choisir Abona ?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
              <div className="text-blue-400 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Gestion professionnelle</h3>
              <p className="text-gray-300">Nous gérons directement tous les abonnements, contrairement aux plateformes où les utilisateurs partagent entre eux.</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
              <div className="text-purple-400 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Économies importantes</h3>
              <p className="text-gray-300">Profitez de réductions allant jusqu'à 70% sur le prix normal des abonnements premium.</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
              <div className="text-purple-400 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Durée ultra-flexible</h3>
              <p className="text-gray-300">Contrairement aux autres services, choisissez une durée de 2 jours, 1 semaine ou plus, et payez exactement au prorata. Idéal pour tester ou pour les besoins ponctuels.</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
              <div className="text-green-400 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Service fiable</h3>
              <p className="text-gray-300">Fini les interruptions de service et les abonnements coupés : notre équipe assure la continuité de vos accès.</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
              <div className="text-yellow-400 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">100% légal</h3>
              <p className="text-gray-300">Tous nos comptes sont légitimement acquis auprès des fournisseurs de services, vous pouvez les utiliser en toute tranquillité.</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
              <div className="text-red-400 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Support réactif</h3>
              <p className="text-gray-300">Une équipe support disponible 7j/7 pour vous aider en cas de problème avec vos accès.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services populaires */}
      <div className="bg-white/5 backdrop-blur-md py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">Nos services les plus populaires</h2>
          <p className="text-xl text-gray-300 text-center mb-16 max-w-3xl mx-auto">
            Découvrez notre sélection de services premium à des prix imbattables
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
              <div className="h-40 bg-gradient-to-r from-red-600 to-pink-600 flex items-center justify-center">
                <h3 className="text-2xl font-bold">Netflix</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-300 mb-4">Accès Premium à toutes les séries et films en Ultra HD sur 4 écrans</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">5.99€</span>
                  <span className="line-through text-gray-400">17.99€</span>
                </div>
                <div className="mt-1 text-sm text-gray-400">par mois</div>
                <div className="mt-1 text-xs text-green-400">ou 0.99€ pour 2 jours</div>
                <Link to="/services" className="mt-4 block text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                  Voir l'offre
                </Link>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
              <div className="h-40 bg-gradient-to-r from-green-600 to-teal-600 flex items-center justify-center">
                <h3 className="text-2xl font-bold">Spotify</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-300 mb-4">Musique sans pub, téléchargement hors ligne et qualité supérieure</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">3.99€</span>
                  <span className="line-through text-gray-400">9.99€</span>
                </div>
                <div className="mt-1 text-sm text-gray-400">par mois</div>
                <div className="mt-1 text-xs text-green-400">ou 0.66€ pour 5 jours</div>
                <Link to="/services" className="mt-4 block text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                  Voir l'offre
                </Link>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
              <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
                <h3 className="text-2xl font-bold">Disney+</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-300 mb-4">Tout le catalogue Disney, Marvel, Star Wars et National Geographic</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">2.99€</span>
                  <span className="line-through text-gray-400">8.99€</span>
                </div>
                <div className="mt-1 text-sm text-gray-400">par mois</div>
                <div className="mt-1 text-xs text-green-400">ou 1.49€ pour 2 semaines</div>
                <Link to="/services" className="mt-4 block text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                  Voir l'offre
                </Link>
              </div>
            </div>
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold mb-1">2 jours</div>
              <p className="text-sm mb-3">Pour un besoin ponctuel</p>
              <div className="text-green-400 text-xl">à partir de 0.66€</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold mb-1">1 semaine</div>
              <p className="text-sm mb-3">Pour un séjour court</p>
              <div className="text-green-400 text-xl">à partir de 1.29€</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold mb-1">2 semaines</div>
              <p className="text-sm mb-3">Pour les vacances</p>
              <div className="text-green-400 text-xl">à partir de 1.99€</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold mb-1">1 mois ou plus</div>
              <p className="text-sm mb-3">Utilisation régulière</p>
              <div className="text-green-400 text-xl">à partir de 2.99€</div>
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
            <Link 
              to="/register" 
              className="bg-white text-blue-600 hover:bg-gray-100 transition-colors px-8 py-4 rounded-lg font-bold text-lg"
            >
              S'inscrire gratuitement
            </Link>
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