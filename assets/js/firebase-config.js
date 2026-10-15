import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
const firebaseConfig = { apiKey:'AIzaSyCBbowjJDhHqA2O8m33cKFJYYHDVWiRuLk',authDomain:'pas-prova.firebaseapp.com',projectId:'pas-prova',storageBucket:'pas-prova.firebasestorage.app',messagingSenderId:'908256265499',appId:'1:908256265499:web:4952a8cf7146b166cebfbe',measurementId:'G-TW5ZNYR2DT'};
const app=initializeApp(firebaseConfig);
export const db=getFirestore(app);
export const auth=getAuth(app);
