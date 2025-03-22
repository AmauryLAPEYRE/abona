import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';

// Utiliser des variables d'environnement pour sécuriser les clés Firebase
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyC4Jz3AnOLNy4y3phDwft_1qh2dKhU0HW0",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "abona-8d0c8.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "abona-8d0c8",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "abona-8d0c8.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "232348280594",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:232348280594:web:012430f40210fe5755f5cb",
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-R74P1Y89SE"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Exporter les services Firebase
export const auth = firebase.auth();
export const firestore = firebase.firestore();
export const functions = firebase.functions();
export default app;