
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAXoosAAiwE3mPBLhi8FxZVAca5C7idG2o",
  authDomain: "cricscore-e0136.firebaseapp.com",
  projectId: "cricscore-e0136",
  storageBucket: "cricscore-e0136.firebasestorage.app",
  messagingSenderId: "1085185239752",
  appId: "1:1085185239752:web:820e2ce27108c26719d3fd",
  measurementId: "G-5HPN7XJ2CN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
