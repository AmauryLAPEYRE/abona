# ShareSub - Application de Partage d'Abonnements

ShareSub est une plateforme qui permet aux utilisateurs d'accéder à des services d'abonnement premium (Netflix, ChatGPT, etc.) à prix réduit en partageant les accès. L'application gère automatiquement la distribution des identifiants, le paiement sécurisé et le suivi des abonnements.

![ShareSub Preview](https://placehold.co/600x400?text=ShareSub+Preview)

## 🌟 Fonctionnalités

### Côté utilisateur
- Inscription et connexion sécurisées
- Parcourir les services disponibles
- Paiement sécurisé via Stripe
- Tableau de bord personnel avec accès aux identifiants
- Suivi des dates d'expiration

### Côté administrateur
- Gestion complète des services (ajout, modification, suppression)
- Configuration des prix et durées d'abonnement
- Gestion des identifiants de connexion pour chaque service
- Suivi des utilisateurs et de leurs abonnements

## 🛠️ Technologies utilisées

- **Frontend**: React.js, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Cloud Functions)
- **Paiement**: Stripe
- **Déploiement**: Firebase Hosting

## 📋 Prérequis

- Node.js (v14 ou supérieur)
- Compte Firebase
- Compte Stripe

## 🚀 Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/votre-username/abona.git
cd abona
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer Firebase

1. Créez un projet sur [Firebase Console](https://console.firebase.google.com/)
2. Activez Authentication, Firestore, Storage et Functions
3. Dans les paramètres du projet, récupérez les informations de configuration
4. Créez un fichier `.env` à la racine du projet avec ces informations

```
REACT_APP_FIREBASE_API_KEY=votre_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=votre_app.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=votre_app
REACT_APP_FIREBASE_STORAGE_BUCKET=votre_app.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=votre_messaging_id
REACT_APP_FIREBASE_APP_ID=votre_app_id
REACT_APP_MEASUREMENT_ID=votre_measurement_id
```

### 4. Configurer Stripe

1. Créez un compte sur [Stripe](https://stripe.com/)
2. Récupérez vos clés API (publique et secrète)
3. Ajoutez la clé publique dans votre fichier `.env`

```
REACT_APP_STRIPE_PUBLIC_KEY=votre_cle_publique_stripe
```

4. Configurez la clé secrète pour les fonctions Firebase

```bash
firebase functions:config:set stripe.secret=votre_cle_secrete_stripe
```

### 5. Installer les dépendances des fonctions Firebase

```bash
cd functions
npm install
cd ..
```

## 📁 Structure du projet

```
abona/
├── src/                    # Code source React
│   ├── components/         # Composants React réutilisables
│   ├── contexts/           # Contextes React (auth, stripe, subscriptions)
│   ├── pages/              # Pages principales
│   ├── firebase.js         # Configuration Firebase
│   └── App.js              # Composant principal
├── functions/              # Fonctions Firebase (backend)
├── public/                 # Fichiers statiques
└── README.md               # Ce fichier
```

## 🎯 Utilisation

### Démarrer en mode développement

```bash
npm start
```

### Construire pour la production

```bash
npm run build
```

### Déployer sur Firebase

```bash
firebase deploy
```

### Configuration initiale (après déploiement)

1. Créez un compte utilisateur sur l'application déployée
2. Dans Firebase Console > Firestore Database, trouvez le document utilisateur que vous venez de créer
3. Modifiez le champ `role` pour lui donner la valeur `admin`
4. Reconnectez-vous à l'application, vous aurez maintenant accès au panneau d'administration

## 💼 Gestion de l'application (Administrateur)

### Ajouter un service

1. Connectez-vous en tant qu'administrateur
2. Accédez au panneau d'administration
3. Cliquez sur "Ajouter un service"
4. Remplissez les informations (nom, description, prix, durée)
5. Ajoutez une image (optionnel)
6. Enregistrez le service

### Ajouter des identifiants

1. Dans le panneau d'administration, cliquez sur "Gérer les identifiants"
2. Sélectionnez le service concerné
3. Ajoutez les informations d'accès (email/mot de passe et/ou lien d'accès)
4. Les identifiants seront automatiquement attribués aux utilisateurs lors de l'achat

## 🔧 Personnalisation

### Modifier le thème

Le style de l'application est basé sur Tailwind CSS. Vous pouvez personnaliser les couleurs et autres styles dans le fichier `tailwind.config.js`.

### Ajouter de nouvelles fonctionnalités

Pour ajouter de nouvelles fonctionnalités:

1. Créez les composants React nécessaires dans le dossier `src/components`
2. Ajoutez les routes dans `src/App.js` si nécessaire
3. Implémentez la logique backend dans les fonctions Firebase si besoin

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

## 🙏 Crédits

Développé par [Votre Nom](https://github.com/votre-username)

---

Pour toute question ou assistance, n'hésitez pas à ouvrir une issue sur le dépôt GitHub.
