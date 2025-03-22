# Abona - Plateforme de Partage d'Abonnements

![Abona Logo](https://placehold.co/600x200?text=Abona+Logo)

## 📋 Vue d'ensemble

Abona est une plateforme web innovante qui permet aux utilisateurs d'accéder à des services d'abonnement premium (Netflix, Spotify, Disney+, etc.) à prix réduit grâce à un système de partage intelligent. La particularité d'Abona est sa tarification proratisée flexible, permettant aux utilisateurs de choisir exactement la durée d'abonnement souhaitée (de quelques jours à plusieurs mois).

**Demo:** [https://abona-8d0c8.web.app](https://abona-8d0c8.web.app)

## 🌟 Fonctionnalités clés

### Côté utilisateur
- **Inscription et authentification** sécurisées avec Firebase Auth
- **Catalogue de services** catégorisés (Streaming, Musique, Productivité, etc.)
- **Tarification flexible** permettant de choisir une durée d'abonnement personnalisée (2 jours, 1 semaine, 1 mois, etc.)
- **Paiement sécurisé** via Stripe avec calcul automatique du prix proratisé
- **Tableau de bord utilisateur** affichant tous les abonnements actifs et expirés
- **Accès instantané** aux identifiants de connexion ou liens d'invitation après paiement

### Côté administrateur
- **Gestion complète des services** (ajout, modification, suppression)
- **Gestion des abonnements** au sein de chaque service
- **Configuration des prix** et des capacités de partage
- **Gestion des utilisateurs** avec attribution des rôles (admin/utilisateur)
- **Statistiques** sur l'utilisation de la plateforme

## 🛠️ Architecture technique

### Frontend
- **React.js** - Framework JavaScript pour l'interface utilisateur
- **React Router** - Navigation entre les pages
- **Context API** - Gestion d'état (Auth, Abonnements, Stripe)
- **Tailwind CSS** - Framework CSS pour le design responsive

### Backend
- **Firebase Authentication** - Gestion des utilisateurs et de l'authentification
- **Cloud Firestore** - Base de données NoSQL pour stocker les données
- **Firebase Cloud Functions** - API serverless pour les opérations backend
- **Firebase Hosting** - Hébergement de l'application web

### Paiement
- **Stripe** - Traitement sécurisé des paiements

### Déploiement
- **GitHub Actions** - CI/CD pour le déploiement automatique
- **Firebase CLI** - Déploiement manuel

## 🔄 Flux d'utilisation

1. Un utilisateur s'inscrit sur la plateforme
2. Il parcourt le catalogue de services disponibles
3. Il sélectionne un service et choisit la durée d'abonnement désirée
4. Le système calcule automatiquement le prix proratisé en fonction de la durée choisie
5. L'utilisateur effectue le paiement via Stripe
6. Il reçoit immédiatement accès aux identifiants ou au lien d'invitation
7. L'utilisateur peut gérer ses abonnements depuis son tableau de bord

## 📊 Structure de la base de données

La base de données Firestore est organisée selon le schéma suivant:

### Collections principales
- **users** - Informations des utilisateurs (nom, email, rôle)
- **services** - Catalogue des services disponibles (Netflix, Spotify, etc.)
- **userSubscriptions** - Abonnements achetés par les utilisateurs

### Sous-collections
- **services/{serviceId}/subscriptions** - Modèles d'abonnements disponibles pour chaque service

## 💻 Installation et configuration

### Prérequis
- Node.js (v14 ou supérieur)
- Compte Firebase 
- Compte Stripe

### Installation
```bash
# Cloner le dépôt
git clone https://github.com/votre-username/abona.git
cd abona

# Installer les dépendances
npm install

# Installer les dépendances des fonctions Firebase
cd functions
npm install
cd ..
```

### Configuration
1. **Firebase**
   - Créez un projet sur [Firebase Console](https://console.firebase.google.com/)
   - Activez Authentication, Firestore, Cloud Functions et Hosting
   - Créez un fichier `.env` à la racine avec les informations suivantes:
   ```
   REACT_APP_FIREBASE_API_KEY=xxx
   REACT_APP_FIREBASE_AUTH_DOMAIN=xxx
   REACT_APP_FIREBASE_PROJECT_ID=xxx
   REACT_APP_FIREBASE_STORAGE_BUCKET=xxx
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=xxx
   REACT_APP_FIREBASE_APP_ID=xxx
   REACT_APP_STRIPE_PUBLIC_KEY=xxx
   ```

2. **Stripe**
   - Configurez votre clé secrète Stripe pour Firebase Functions:
   ```bash
   firebase functions:config:set stripe.secret=votre_cle_secrete_stripe
   ```

3. **Initialisation des règles Firestore**
   - Déployez les règles Firestore:
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Initialisation des données (optionnel)**
   - Exécutez le script d'initialisation pour peupler la base de données:
   ```bash
   node scripts/services-init.js
   ```

## 🚀 Déploiement

### Déploiement local (développement)
```bash
# Lancer en mode développement
npm start
```

### Déploiement en production
```bash
# Construire l'application
npm run build

# Déployer sur Firebase
firebase deploy

# Déploiement partiel (si nécessaire)
firebase deploy --only hosting,firestore
firebase deploy --only functions
```

### CI/CD avec GitHub Actions
Le projet est configuré avec un workflow GitHub Actions qui déploie automatiquement l'application sur Firebase Hosting lorsque des modifications sont poussées sur la branche master.

## 📁 Structure du projet

```
abona/
├── .github/
│   └── workflows/           # Configuration CI/CD
├── functions/               # Cloud Functions Firebase
│   ├── index.js             # Points d'entrée des fonctions
│   └── package.json         # Dépendances des fonctions
├── public/                  # Fichiers statiques
├── src/
│   ├── components/          # Composants React réutilisables
│   │   ├── admin/           # Composants pour le panneau d'administration
│   │   └── ...
│   ├── contexts/            # Contextes React (state management)
│   │   ├── AuthContext.js   # Gestion de l'authentification
│   │   ├── StripeContext.js # Intégration des paiements
│   │   └── SubscriptionContext.js # Gestion des abonnements
│   ├── pages/               # Pages principales de l'application
│   │   ├── LandingPage.js   # Page d'accueil
│   │   ├── Dashboard.js     # Tableau de bord utilisateur
│   │   └── ...
│   ├── firebase.js          # Configuration Firebase
│   └── App.js               # Point d'entrée de l'application
├── .env                     # Variables d'environnement (à créer)
├── .firebaserc              # Configuration du projet Firebase
├── firebase.json            # Configuration des services Firebase
├── firestore.rules          # Règles de sécurité Firestore
└── package.json             # Dépendances du projet
```

## 🔄 Tarification proratisée

Une des fonctionnalités phares d'Abona est sa tarification proratisée. Lorsqu'un utilisateur choisit une durée d'abonnement personnalisée:

1. Le prix est calculé proportionnellement au nombre de jours choisis
2. Le système prend en compte le nombre exact de jours dans le mois courant (28, 30 ou 31)
3. La formule utilisée est: `prixMensuel / joursParMois * duréeChoisie`

Par exemple, pour un abonnement Netflix à 15€/mois:
- 2 jours coûterait environ 1€ (15€ / 30 * 2)
- 1 semaine coûterait environ 3.50€ (15€ / 30 * 7)
- 2 semaines coûterait environ 7€ (15€ / 30 * 14)

## 🔐 Sécurité

- Les règles Firestore contrôlent l'accès aux données selon les rôles utilisateur
- L'authentification est gérée par Firebase Auth
- Les paiements sont sécurisés via Stripe
- Les informations d'identification des services sont stockées de manière sécurisée

## 🛠️ Maintenance et dépannage

### Problèmes courants
- **Erreur de permissions Firebase**: Vérifiez les règles Firestore
- **Problèmes de déploiement des fonctions**: Utilisez `firebase deploy --only hosting,firestore` pour déployer partiellement
- **Images Docker non nettoyées**: Visitez la console GCP pour nettoyer manuellement

### Commandes utiles
```bash
# Vérifier les logs des fonctions
firebase functions:log

# Déployer uniquement les règles Firestore
firebase deploy --only firestore:rules

# Tester les fonctions localement
firebase emulators:start
```

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

## 👥 Contributeurs

- [Amaury LAPEYRE](https://github.com/votre-username) - Développeur principal

---

Pour toute question ou assistance, n'hésitez pas à ouvrir une issue sur le dépôt GitHub ou à contacter les contributeurs.