
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBEhrb5TUj1sutYkGCE-w4-gV8j7GJlEYw",
  authDomain: "lcoilpi.firebaseapp.com",
  projectId: "lcoilpi",
  storageBucket: "lcoilpi.firebasestorage.app",
  messagingSenderId: "273783218577",
  appId: "1:273783218577:web:9cd79c35fbb0d8522f3a30"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
