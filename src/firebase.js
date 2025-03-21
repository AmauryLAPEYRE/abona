import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';

const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "votre-app.firebaseapp.com",
  projectId: "votre-app",
  storageBucket: "votre-app.appspot.com",
  messagingSenderId: "VOTRE_MESSAGING_ID",
  appId: "VOTRE_APP_ID"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const firestore = firebase.firestore();
export const functions = firebase.functions();