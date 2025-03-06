// filepath: /d:/we art web and design/We art metal website project/Accounting Software/we-art-accounting/src/utils/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "@firebase/firestore";

// Your web app's Firebase configuration
const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "";
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
const firebaseStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "";
const firebaseMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "";
const firebaseAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "";

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId,
  appId: firebaseAppId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export { db, app };