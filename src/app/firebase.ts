import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "aiseo-ff704.firebaseapp.com",
  projectId: "aiseo-ff704",
  storageBucket: "aiseo-ff704.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Connect to Firestore Emulator if in development
if (process.env.NODE_ENV === 'development') {
    try {
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log("Firestore emulator connected");
    } catch (error) {
        console.warn("Could not connect to Firestore emulator. This is expected if you are not running the emulator.", error);
    }
}

export { app, db }; 