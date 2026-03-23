import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCJfC_TZyGcC9hLhSMXy7t8x2kmKQviGxo",
  authDomain: "furnifind-30b78.firebaseapp.com",
  projectId: "furnifind-30b78",
  storageBucket: "furnifind-30b78.firebasestorage.app",
  messagingSenderId: "1511680265",
  appId: "1:1511680265:web:2579f78de4b3e99e2d4bd8"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);




