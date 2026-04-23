// Firebase Configuration
// Using Firestore only — no Firebase Auth SDK (platform-independent, ad-blocker proof)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA2gD5Bdl3JRe0XMHsOSaSCqM88wwMiLTU",
  authDomain: "college-eve-management.firebaseapp.com",
  projectId: "college-eve-management",
  storageBucket: "college-eve-management.firebasestorage.app",
  messagingSenderId: "667557465602",
  appId: "1:667557465602:web:99e89520b69098b3afa11b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
