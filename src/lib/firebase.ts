import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBi9JYhdmntye4WM7qu56-QWomsWshmR04',
  authDomain: 'studio-410160912-84d59.firebaseapp.com',
  projectId: 'studio-410160912-84d59',
  storageBucket: 'studio-410160912-84d59.firebasestorage.app',
  messagingSenderId: '410509428773',
  appId: '1:410509428773:web:a158f5b79a559b25c097cc'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
