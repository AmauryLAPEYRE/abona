/**
 * Utilitaires pour la gestion des erreurs et la résilience de l'application
 * Ce fichier centralise les fonctions liées à la gestion d'erreurs pour une meilleure cohérence
 */

// Dictionnaire des codes d'erreur Firebase avec messages utilisateur en français
export const FIREBASE_ERROR_CODES = {
    // Erreurs d'authentification
    'auth/email-already-in-use': 'Cette adresse email est déjà utilisée par un autre compte.',
    'auth/invalid-email': 'L\'adresse email n\'est pas valide.',
    'auth/user-disabled': 'Ce compte utilisateur a été désactivé.',
    'auth/user-not-found': 'Email ou mot de passe incorrect.',
    'auth/wrong-password': 'Email ou mot de passe incorrect.',
    'auth/weak-password': 'Le mot de passe est trop faible. Il doit contenir au moins 6 caractères.',
    'auth/requires-recent-login': 'Cette opération est sensible et nécessite une authentification récente. Veuillez vous reconnecter.',
    'auth/too-many-requests': 'Trop de tentatives de connexion. Veuillez réessayer plus tard.',
    'auth/operation-not-allowed': 'Cette opération n\'est pas autorisée.',
    'auth/account-exists-with-different-credential': 'Un compte existe déjà avec la même adresse email mais des identifiants de connexion différents.',
    
    // Erreurs Firestore
    'permission-denied': 'Vous n\'avez pas les autorisations nécessaires pour effectuer cette action.',
    'not-found': 'Le document demandé n\'existe pas.',
    'already-exists': 'Le document que vous essayez de créer existe déjà.',
    'resource-exhausted': 'Quota de requêtes dépassé. Veuillez réessayer plus tard.',
    'failed-precondition': 'L\'opération a échoué car les conditions préalables ne sont pas remplies.',
    'aborted': 'L\'opération a été annulée, généralement en raison d\'un conflit de concurrence.',
    'out-of-range': 'L\'opération a été tentée avec une valeur hors plage.',
    'unimplemented': 'Cette fonctionnalité n\'est pas encore implémentée.',
    'internal': 'Une erreur interne s\'est produite. Veuillez réessayer.',
    'unavailable': 'Le service est actuellement indisponible. Veuillez réessayer plus tard.',
    'data-loss': 'Des données irrécupérables ont été perdues ou corrompues.',
    'unauthenticated': 'Votre session a expiré. Veuillez vous reconnecter.',
    
    // Erreurs Stripe
    'card_declined': 'Votre carte a été refusée. Veuillez essayer avec une autre méthode de paiement.',
    'expired_card': 'Votre carte a expiré. Veuillez essayer avec une autre carte.',
    'incorrect_cvc': 'Le code de sécurité de votre carte est incorrect.',
    'processing_error': 'Une erreur est survenue lors du traitement de votre carte. Veuillez réessayer.',
    'incorrect_number': 'Le numéro de carte est incorrect.',
    'incomplete_number': 'Le numéro de carte est incomplet.',
    'incomplete_expiry': 'La date d\'expiration est incomplète.',
    'incomplete_cvc': 'Le code de sécurité est incomplet.',
    
    // Erreurs réseau et de connexion
    'network-error': 'Erreur de connexion réseau. Vérifiez votre connexion internet et réessayez.',
    'timeout': 'La requête a pris trop de temps à s\'exécuter. Veuillez réessayer.',
    'offline': 'Vous êtes actuellement hors ligne. Certaines fonctionnalités peuvent être limitées.',
  };
  
  // Nouveau - Erreurs courantes de l'application
  export const APP_ERROR_CODES = {
    'subscription/no-available': 'Aucun abonnement n\'est disponible pour ce service actuellement.',
    'subscription/full': 'Cet abonnement est complet. Veuillez choisir un autre abonnement.',
    'payment/insufficient-funds': 'Le paiement a échoué en raison de fonds insuffisants. Veuillez essayer une autre méthode de paiement.',
    'payment/verification-required': 'Votre banque demande une vérification supplémentaire pour ce paiement.',
    'validation/missing-fields': 'Veuillez remplir tous les champs obligatoires.',
    'validation/invalid-duration': 'La durée choisie doit être entre 2 et 30 jours.',
    'validation/invalid-email': 'Veuillez saisir une adresse email valide.',
    'validation/passwords-dont-match': 'Les mots de passe ne correspondent pas.',
    'validation/price-calculation': 'Erreur lors du calcul du prix. Veuillez réessayer.',
    'account/no-subscriptions': 'Vous n\'avez pas encore d\'abonnements actifs.'
  };
  
  /**
   * Traduit un code d'erreur technique en message convivial pour l'utilisateur
   * @param {string} errorCode - Le code d'erreur à traduire
   * @param {string} fallbackMessage - Message par défaut si le code n'est pas trouvé
   * @return {string} Message d'erreur traduit
   */
  export const translateErrorCode = (errorCode, fallbackMessage = 'Une erreur s\'est produite. Veuillez réessayer.') => {
    // Si l'erreur est déjà un message d'erreur formaté, le retourner directement
    if (typeof errorCode === 'string' && !errorCode.includes('/') && errorCode.length > 20) {
      return errorCode;
    }
    
    // Chercher d'abord dans les erreurs de l'application, puis dans les erreurs Firebase
    return APP_ERROR_CODES[errorCode] || FIREBASE_ERROR_CODES[errorCode] || fallbackMessage;
  };
  
  /**
   * Analyse une erreur Firebase et extrait un message utilisateur approprié
   * @param {Error} error - L'objet erreur à analyser
   * @param {string} fallbackMessage - Message par défaut si l'erreur ne peut pas être analysée
   * @return {string} Message d'erreur convivial
   */
  export const handleFirebaseError = (error, fallbackMessage = 'Une erreur s\'est produite. Veuillez réessayer.') => {
    if (!error) return fallbackMessage;
    
    // Gérer les erreurs Firebase standard avec code
    if (error.code) {
      return translateErrorCode(error.code, fallbackMessage);
    }
    
    // Gérer les erreurs Firebase Cloud Functions
    if (error.details) {
      try {
        const details = JSON.parse(error.details);
        if (details.code) {
          return translateErrorCode(details.code, fallbackMessage);
        }
      } catch (e) {
        // Ignorer les erreurs de parsing
      }
    }
    
    // Renvoyer le message d'erreur directement s'il est disponible
    return error.message || fallbackMessage;
  };
  
  /**
   * Détermine si un utilisateur est connecté au réseau
   * @return {boolean} - Vrai si l'utilisateur est en ligne
   */
  export const isOnline = () => {
    return navigator.onLine;
  };
  
  /**
   * Fonction avancée d'exécution avec politique de retry et circuit breaker
   * @param {Function} fn - Fonction asynchrone à exécuter
   * @param {Object} options - Options de configuration
   * @param {number} options.timeout - Temps maximum d'exécution en ms (défaut: 10000)
   * @param {number} options.retries - Nombre de tentatives (défaut: 3)
   * @param {number} options.backoff - Temps d'attente entre les tentatives en ms (défaut: 1000)
   * @param {Function} options.onRetry - Callback appelé avant chaque nouvelle tentative
   * @param {*} options.fallbackValue - Valeur à retourner en cas d'échec persistant
   * @return {Promise} - Résultat de la fonction ou erreur
   */
  export const executeWithResilience = async (fn, options = {}) => {
    const { 
      timeout = 10000, 
      retries = 3, 
      backoff = 1000,
      onRetry = null,
      fallbackValue = null,
      breakerThreshold = 5,
      breakerTimeout = 60000
    } = options;
    
    // Circuit breaker pattern - évite de surcharger un service défaillant
    const circuitKey = fn.name || 'anonymous-function';
    const breaker = circuitBreakers.get(circuitKey) || {
      failures: 0,
      lastFailure: 0,
      open: false
    };
    
    // Vérifier si le circuit est ouvert (trop d'erreurs récentes)
    if (breaker.open) {
      const timeSinceLastFailure = Date.now() - breaker.lastFailure;
      
      // Si le circuit est ouvert mais que le temps de pause est passé, on essaie à nouveau
      if (timeSinceLastFailure < breakerTimeout) {
        console.warn(`Circuit breaker ouvert pour ${circuitKey}, opération ignorée`);
        
        if (fallbackValue !== null) {
          return fallbackValue;
        }
        
        throw new Error('service_unavailable');
      }
      
      // Réinitialiser le circuit pour un nouvel essai
      breaker.open = false;
      breaker.failures = 0;
    }
    
    let lastError;
    let currentRetry = 0;
    
    while (currentRetry <= retries) {
      try {
        // Créer une promesse avec timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('timeout')), timeout);
        });
        
        // Exécuter la fonction avec un race contre le timeout
        return await Promise.race([fn(), timeoutPromise]);
      } catch (error) {
        lastError = error;
        
        // Mettre à jour le circuit breaker
        breaker.failures++;
        breaker.lastFailure = Date.now();
        
        // Vérifier si le seuil du circuit breaker est atteint
        if (breaker.failures >= breakerThreshold) {
          breaker.open = true;
          circuitBreakers.set(circuitKey, breaker);
          console.warn(`Circuit breaker activé pour ${circuitKey} après ${breaker.failures} échecs`);
        }
        
        // Si c'est la dernière tentative, propager l'erreur ou retourner la valeur de repli
        if (currentRetry === retries) {
          circuitBreakers.set(circuitKey, breaker);
          
          if (fallbackValue !== null) {
            console.warn('Operation failed after retries, using fallback value', { error: lastError });
            return fallbackValue;
          }
          
          throw error;
        }
        
        // Appeler le callback onRetry s'il est défini
        if (onRetry && typeof onRetry === 'function') {
          onRetry(error, currentRetry);
        }
        
        // Attendre avant la prochaine tentative (backoff exponentiel)
        const waitTime = backoff * Math.pow(2, currentRetry);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        currentRetry++;
      }
    }
    
    // Ne devrait jamais atteindre ce point, mais au cas où
    throw lastError;
  };
  
  // Map pour stocker l'état des circuit breakers
  const circuitBreakers = new Map();
  
  /**
   * Validateur de format de date
   * @param {any} date - La date à valider (Date, Timestamp Firebase, string, etc)
   * @param {Date} defaultDate - Date par défaut si invalide
   * @return {Date} - Date validée ou par défaut
   */
  export const validateDate = (date, defaultDate = new Date()) => {
    if (!date) return defaultDate;
    
    try {
      // Gestion des timestamps Firebase
      if (date.toDate && typeof date.toDate === 'function') {
        return date.toDate();
      }
      
      // Gestion des strings et timestamps
      if (typeof date === 'string' || typeof date === 'number') {
        const parsedDate = new Date(date);
        return isNaN(parsedDate.getTime()) ? defaultDate : parsedDate;
      }
      
      // Si c'est déjà une date JavaScript
      if (date instanceof Date) {
        return isNaN(date.getTime()) ? defaultDate : date;
      }
      
    } catch (e) {
      console.warn('Invalid date format', date);
    }
    
    return defaultDate;
  };
  
  /**
   * Formatte une date en français avec gestion d'erreurs
   * @param {any} date - Date à formater (accepte différents formats)
   * @param {Object} options - Options de formatage (voir Intl.DateTimeFormat)
   * @return {string} - Date formatée ou message d'erreur
   */
  export const formatDate = (date, options = {}) => {
    if (!date) return 'Date inconnue';
    
    const defaultOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...options
    };
    
    try {
      const validDate = validateDate(date);
      return validDate.toLocaleDateString('fr-FR', defaultOptions);
    } catch (e) {
      console.warn('Error formatting date', e);
      return 'Date invalide';
    }
  };
  
  /**
   * Validateur de prix avec protection contre les valeurs non numériques
   * @param {any} price - Prix à valider
   * @param {number} defaultPrice - Prix par défaut si invalide
   * @return {number} - Prix validé
   */
  export const validatePrice = (price, defaultPrice = 0) => {
    if (price === null || price === undefined) return defaultPrice;
    
    // Convertir en nombre si c'est une chaîne
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // Vérifier si c'est un nombre valide
    if (isNaN(numericPrice) || typeof numericPrice !== 'number') {
      return defaultPrice;
    }
    
    // Arrondir à 2 décimales et s'assurer que c'est positif
    return Math.max(0, Math.round(numericPrice * 100) / 100);
  };
  
  /**
   * Format un prix pour l'affichage
   * @param {any} price - Prix à formater
   * @param {number} decimals - Nombre de décimales
   * @return {string} - Prix formaté
   */
  export const formatPrice = (price, decimals = 2) => {
    const validPrice = validatePrice(price);
    return validPrice.toFixed(decimals);
  };
  
  /**
   * Journalisation structurée des erreurs pour débogage
   * @param {Error} error - L'erreur à journaliser
   * @param {string} context - Contexte dans lequel l'erreur s'est produite
   * @param {Object} additionalInfo - Informations supplémentaires
   */
  export const logError = (error, context = 'app', additionalInfo = {}) => {
    const errorLog = {
      timestamp: new Date().toISOString(),
      context,
      message: error.message || 'Erreur inconnue',
      code: error.code || 'unknown',
      stack: error.stack,
      ...additionalInfo
    };
    
    // Logger pour débogage local
    console.error('Application Error:', errorLog);
    
    // Ici, vous pourriez envoyer l'erreur à un service de monitoring
    // comme Sentry, LogRocket, etc. si vous le souhaitez
  };
  
  /**
   * Génère un identifiant unique pour les erreurs
   * @returns {string} Un identifiant unique
   */
  export const generateErrorId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
  };
  
  /**
   * Vérifie si l'erreur est causée par une connexion réseau
   * @param {Error} error - L'erreur à vérifier
   * @returns {boolean} Vrai si c'est une erreur réseau
   */
  export const isNetworkError = (error) => {
    if (!error) return false;
    
    // Vérifier le message d'erreur pour des indices d'erreur réseau
    const errorMessage = error.message ? error.message.toLowerCase() : '';
    const networkErrorKeywords = [
      'network', 'connection', 'offline', 'internet', 'timeout', 
      'request failed', 'fetch', 'xhr', 'réseau', 'connexion'
    ];
    
    return (
      error.code === 'network-error' || 
      error.code === 'timeout' || 
      error.code === 'offline' ||
      error.code === 'unavailable' ||
      networkErrorKeywords.some(keyword => errorMessage.includes(keyword)) ||
      !navigator.onLine
    );
  };