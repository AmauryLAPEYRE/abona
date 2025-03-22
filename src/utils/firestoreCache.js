/**
 * Service de mise en cache intelligent pour Firestore
 * Optimise les performances en réduisant les appels à Firestore
 * tout en garantissant la fraîcheur des données
 */

import { firestore } from '../firebase';
import { isOnline } from './errorUtils';

// Configuration du cache avec des durées optimisées
const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes par défaut
const OFFLINE_CACHE_TIME = 24 * 60 * 60 * 1000; // 24 heures en mode hors-ligne
const LOW_PRIORITY_CACHE_TIME = 15 * 60 * 1000; // 15 minutes pour données moins critiques
const HIGH_PRIORITY_CACHE_TIME = 2 * 60 * 1000; // 2 minutes pour données critiques

// Structure interne de mise en cache avec limitation de taille
class LimitedCache {
  constructor(maxSize = 100) {
    this.data = new Map();
    this.maxSize = maxSize;
    this.accessOrder = []; // Suivi de l'ordre d'accès pour l'algorithme LRU
  }

  get(key) {
    if (!this.data.has(key)) return undefined;
    
    // Mettre à jour l'ordre d'accès (LRU)
    this.updateAccessOrder(key);
    
    return this.data.get(key);
  }

  set(key, value) {
    // Si la clé existe déjà, mettre à jour la valeur
    if (this.data.has(key)) {
      this.data.set(key, value);
      this.updateAccessOrder(key);
      return;
    }
    
    // Si le cache est plein, supprimer l'élément le moins récemment utilisé
    if (this.data.size >= this.maxSize) {
      const oldestKey = this.accessOrder.shift();
      this.data.delete(oldestKey);
    }
    
    // Ajouter la nouvelle valeur et mettre à jour l'ordre d'accès
    this.data.set(key, value);
    this.accessOrder.push(key);
  }

  delete(key) {
    if (!this.data.has(key)) return;
    
    // Supprimer du cache et de l'ordre d'accès
    this.data.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
  }

  clear() {
    this.data.clear();
    this.accessOrder = [];
  }

  updateAccessOrder(key) {
    // Mettre à jour l'ordre d'accès en supprimant et en réajoutant la clé à la fin
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }
}

// Structure de cache avec limites de taille
const cache = {
  documents: new LimitedCache(200),  // 200 documents max en cache
  collections: new LimitedCache(50), // 50 collections max en cache
  queries: new LimitedCache(50)      // 50 requêtes max en cache
};

// Métrique pour statistiques de cache
const cacheStats = {
  hits: 0,
  misses: 0,
  reset: () => {
    cacheStats.hits = 0;
    cacheStats.misses = 0;
  }
};

/**
 * Génère une clé de cache unique pour une requête Firestore
 * @param {string} path - Chemin Firestore
 * @param {Object} queryParams - Paramètres de requête (where, orderBy, etc.)
 * @return {string} - Clé de cache unique
 */
const generateCacheKey = (path, queryParams = {}) => {
  if (!queryParams || Object.keys(queryParams).length === 0) {
    return path;
  }
  
  // Tri des clés pour assurer une clé de cache cohérente, peu importe l'ordre
  const orderedParams = {};
  Object.keys(queryParams).sort().forEach(key => {
    orderedParams[key] = queryParams[key];
  });
  
  return `${path}:${JSON.stringify(orderedParams)}`;
};

/**
 * Détermine si une entrée de cache est encore valide
 * @param {Object} cacheEntry - Entrée de cache à vérifier
 * @param {number} maxAge - Durée maximale de validité
 * @return {boolean} - true si valide, false sinon
 */
const isCacheValid = (cacheEntry, maxAge) => {
  if (!cacheEntry || !cacheEntry.timestamp) return false;
  
  const now = Date.now();
  const actualMaxAge = isOnline() ? maxAge : OFFLINE_CACHE_TIME;
  
  return (now - cacheEntry.timestamp) < actualMaxAge;
};

/**
 * Récupère un document avec mise en cache intelligente
 * @param {string} path - Chemin du document
 * @param {Object} options - Options de requête
 * @param {boolean} options.forceRefresh - Force le rafraîchissement du cache
 * @param {number} options.maxAge - Durée de validité du cache en ms
 * @param {string} options.priority - Priorité ("high", "low", "default")
 * @return {Promise<Object>} - Document avec métadonnées
 */
export const getDocumentWithCache = async (path, options = {}) => {
  const { 
    forceRefresh = false, 
    maxAge = DEFAULT_CACHE_TIME,
    priority = 'default'
  } = options;
  
  // Déterminer la durée maximale du cache en fonction de la priorité
  let actualMaxAge = maxAge;
  if (priority === 'high') actualMaxAge = HIGH_PRIORITY_CACHE_TIME;
  if (priority === 'low') actualMaxAge = LOW_PRIORITY_CACHE_TIME;
  
  // Vérifier si le document est en cache et valide
  const cacheEntry = cache.documents.get(path);
  
  if (!forceRefresh && cacheEntry && cacheEntry.data && isCacheValid(cacheEntry, actualMaxAge)) {
    cacheStats.hits++;
    return {
      ...cacheEntry.data,
      fromCache: true,
      exists: true,
      id: cacheEntry.id
    };
  }
  
  cacheStats.misses++;
  
  // Si hors ligne et pas dans le cache ou cache expiré, retourner une erreur
  if (!isOnline() && (!cacheEntry || !cacheEntry.data)) {
    throw new Error('offline');
  }
  
  try {
    // Récupérer le document depuis Firestore avec gestion du timeout
    const docRef = firestore.doc(path);
    
    // Utiliser un timeout pour éviter les requêtes bloquantes
    const docPromise = docRef.get();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), 10000)
    );
    
    const docSnapshot = await Promise.race([docPromise, timeoutPromise]);
    
    // Mettre à jour le cache
    if (docSnapshot.exists) {
      const docData = docSnapshot.data();
      cache.documents.set(path, {
        data: docData,
        id: docSnapshot.id,
        timestamp: Date.now()
      });
      
      return {
        ...docData,
        id: docSnapshot.id,
        exists: true,
        fromCache: false
      };
    } else {
      // Document n'existe pas, mais on cache quand même cette information
      cache.documents.set(path, {
        data: null,
        id: docSnapshot.id,
        timestamp: Date.now()
      });
      
      return {
        id: docSnapshot.id,
        exists: false,
        fromCache: false
      };
    }
  } catch (error) {
    // En cas d'erreur, utiliser le cache expiré s'il existe
    if (cacheEntry && cacheEntry.data) {
      return {
        ...cacheEntry.data,
        id: cacheEntry.id,
        exists: true,
        fromCache: true,
        stale: true // Indique que les données sont potentiellement obsolètes
      };
    }
    
    throw error;
  }
};

/**
 * Récupère une collection avec mise en cache intelligente
 * @param {string} collectionPath - Chemin de la collection
 * @param {Object} queryParams - Paramètres de requête
 * @param {Object} options - Options de requête
 * @return {Promise<Array>} - Tableau de documents
 */
export const getCollectionWithCache = async (collectionPath, queryParams = {}, options = {}) => {
  const { 
    forceRefresh = false, 
    maxAge = DEFAULT_CACHE_TIME,
    priority = 'default' 
  } = options;
  
  // Déterminer la durée maximale du cache en fonction de la priorité
  let actualMaxAge = maxAge;
  if (priority === 'high') actualMaxAge = HIGH_PRIORITY_CACHE_TIME;
  if (priority === 'low') actualMaxAge = LOW_PRIORITY_CACHE_TIME;
  
  const cacheKey = generateCacheKey(collectionPath, queryParams);
  
  // Vérifier si la collection est en cache et valide
  const cacheEntry = cache.collections.get(cacheKey);
  
  if (!forceRefresh && cacheEntry && cacheEntry.data && isCacheValid(cacheEntry, actualMaxAge)) {
    cacheStats.hits++;
    return {
      data: cacheEntry.data,
      fromCache: true
    };
  }
  
  cacheStats.misses++;
  
  // Si hors ligne et pas dans le cache ou cache expiré, retourner le cache s'il existe
  if (!isOnline() && (!cacheEntry || !cacheEntry.data)) {
    if (cacheEntry && cacheEntry.data) {
      return {
        data: cacheEntry.data,
        fromCache: true,
        stale: true
      };
    }
    throw new Error('offline');
  }
  
  try {
    // Construire la requête
    let query = firestore.collection(collectionPath);
    
    // Appliquer les filtres where
    if (queryParams.where) {
      queryParams.where.forEach(([field, operator, value]) => {
        query = query.where(field, operator, value);
      });
    }
    
    // Appliquer l'ordre
    if (queryParams.orderBy) {
      if (Array.isArray(queryParams.orderBy)) {
        // Support pour multiple orderBy
        queryParams.orderBy.forEach(order => {
          if (Array.isArray(order)) {
            const [field, direction = 'asc'] = order;
            query = query.orderBy(field, direction);
          } else {
            query = query.orderBy(order, 'asc');
          }
        });
      } else {
        // Support pour un seul orderBy simple
        const [field, direction = 'asc'] = Array.isArray(queryParams.orderBy) 
          ? queryParams.orderBy 
          : [queryParams.orderBy];
        query = query.orderBy(field, direction);
      }
    }
    
    // Appliquer la limite
    if (queryParams.limit) {
      query = query.limit(queryParams.limit);
    }
    
    // Utiliser un timeout pour éviter les requêtes bloquantes
    const queryPromise = query.get();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), 15000)
    );
    
    const snapshots = await Promise.race([queryPromise, timeoutPromise]);
    
    // Convertir en tableau avec ID
    const data = snapshots.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Mettre à jour le cache
    cache.collections.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return { data, fromCache: false };
  } catch (error) {
    // En cas d'erreur, utiliser le cache expiré s'il existe
    if (cacheEntry && cacheEntry.data) {
      return {
        data: cacheEntry.data,
        fromCache: true,
        stale: true
      };
    }
    
    throw error;
  }
};

/**
 * Exécute une requête personnalisée avec mise en cache
 * @param {Function} queryFn - Fonction qui construit et exécute la requête
 * @param {string} cacheKey - Clé de cache unique
 * @param {Object} options - Options de mise en cache
 * @return {Promise<any>} - Résultat de la requête
 */
export const executeQueryWithCache = async (queryFn, cacheKey, options = {}) => {
  const { 
    forceRefresh = false, 
    maxAge = DEFAULT_CACHE_TIME,
    priority = 'default'
  } = options;
  
  // Déterminer la durée maximale du cache en fonction de la priorité
  let actualMaxAge = maxAge;
  if (priority === 'high') actualMaxAge = HIGH_PRIORITY_CACHE_TIME;
  if (priority === 'low') actualMaxAge = LOW_PRIORITY_CACHE_TIME;
  
  // Vérifier si la requête est en cache et valide
  const cacheEntry = cache.queries.get(cacheKey);
  
  if (!forceRefresh && cacheEntry && cacheEntry.data && isCacheValid(cacheEntry, actualMaxAge)) {
    cacheStats.hits++;
    return {
      data: cacheEntry.data,
      fromCache: true
    };
  }
  
  cacheStats.misses++;
  
  // Si hors ligne et pas dans le cache ou cache expiré, retourner le cache s'il existe
  if (!isOnline() && (!cacheEntry || !cacheEntry.data)) {
    if (cacheEntry && cacheEntry.data) {
      return {
        data: cacheEntry.data,
        fromCache: true,
        stale: true
      };
    }
    throw new Error('offline');
  }
  
  try {
    // Exécuter la requête personnalisée avec un timeout
    const promise = queryFn();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), 15000)
    );
    
    const result = await Promise.race([promise, timeoutPromise]);
    
    // Mettre à jour le cache
    cache.queries.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return { data: result, fromCache: false };
  } catch (error) {
    // En cas d'erreur, utiliser le cache expiré s'il existe
    if (cacheEntry && cacheEntry.data) {
      return {
        data: cacheEntry.data,
        fromCache: true,
        stale: true
      };
    }
    
    throw error;
  }
};

/**
 * Précharge des données dans le cache pour une utilisation future
 * @param {string} path - Chemin Firestore
 * @param {string} type - Type de chemin ('document', 'collection')
 * @param {Object} queryParams - Paramètres de requête (pour collections)
 */
export const preloadData = async (path, type = 'document', queryParams = {}) => {
  try {
    if (type === 'document') {
      await getDocumentWithCache(path, { forceRefresh: true });
    } else if (type === 'collection') {
      await getCollectionWithCache(path, queryParams, { forceRefresh: true });
    }
  } catch (error) {
    console.warn(`Échec de préchargement pour ${path}:`, error);
    // Ne pas propager l'erreur, car le préchargement est facultatif
  }
};

/**
 * Invalide une entrée spécifique du cache
 * @param {string} path - Chemin de l'entrée à invalider
 * @param {string} type - Type d'entrée ('document', 'collection', ou 'query')
 */
export const invalidateCache = (path, type = 'document') => {
  switch (type) {
    case 'document':
      cache.documents.delete(path);
      break;
    case 'collection':
    case 'query':
      // Supprimer toutes les entrées commençant par ce chemin
      const cacheMap = type === 'collection' ? cache.collections : cache.queries;
      for (const key of cacheMap.accessOrder) {
        if (key === path || key.startsWith(`${path}:`)) {
          cacheMap.delete(key);
        }
      }
      break;
    default:
      // Type inconnu, ne rien faire
      break;
  }
};

/**
 * Invalide tout le cache
 */
export const clearCache = () => {
  cache.documents.clear();
  cache.collections.clear();
  cache.queries.clear();
  console.log('Cache Firestore entièrement vidé');
};

/**
 * Récupère les statistiques d'utilisation du cache
 * @returns {Object} Statistiques du cache
 */
export const getCacheStats = () => {
  const total = cacheStats.hits + cacheStats.misses;
  const hitRate = total > 0 ? (cacheStats.hits / total) * 100 : 0;
  
  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    total,
    hitRate: hitRate.toFixed(2) + '%',
    documentsSize: cache.documents.data.size,
    collectionsSize: cache.collections.data.size,
    queriesSize: cache.queries.data.size
  };
};

export default {
  getDocumentWithCache,
  getCollectionWithCache,
  executeQueryWithCache,
  invalidateCache,
  clearCache,
  preloadData,
  getCacheStats
};