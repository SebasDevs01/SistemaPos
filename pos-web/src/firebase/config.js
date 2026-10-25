import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Credenciales oficiales de Firebase de Miscelánea María José
const firebaseConfig = {
  apiKey: "AIzaSyDp2YM_yBMJ8r-eMace1AnUL4hwwxjAHzQ",
  authDomain: "sistema-pos-miselanea.firebaseapp.com",
  projectId: "sistema-pos-miselanea",
  storageBucket: "sistema-pos-miselanea.firebasestorage.app",
  messagingSenderId: "748387167632",
  appId: "1:748387167632:web:89df4a4347a93ddbd85715",
  measurementId: "G-01RB9LZ500"
};

// Inicializar la aplicación de Firebase
export const app = initializeApp(firebaseConfig);

// Inicializar Firestore con soporte offline para que funcione en mostrador incluso sin internet
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Inicializar Firebase Storage para imágenes de productos (con protección ante errores)
let storage = null;
try {
  storage = getStorage(app);
} catch (e) {
  console.warn("Firebase Storage no disponible:", e);
}
export { storage };


