import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';

const firebaseConfig = {
    apiKey: "AIzaSyC4Jz3AnOLNy4y3phDwft_1qh2dKhU0HW0",
    authDomain: "abona-8d0c8.firebaseapp.com",
    projectId: "abona-8d0c8",
    storageBucket: "abona-8d0c8.firebasestorage.app",
    messagingSenderId: "232348280594",
    appId: "1:232348280594:web:012430f40210fe5755f5cb",
    measurementId: "G-R74P1Y89SE"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Exporter les services Firebase
export const auth = firebase.auth();
export const firestore = firebase.firestore();
export const functions = firebase.functions();
export default app;