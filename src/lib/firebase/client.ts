"use client"

import { initializeApp, getApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyD-WW2otioo_Z_hYl3ZjAzxnuaeayJn8gE",
  authDomain: "technoverse26sg.firebaseapp.com",
  projectId: "technoverse26sg",
  storageBucket: "technoverse26sg.firebasestorage.app",
  messagingSenderId: "477749394566",
  appId: "1:477749394566:web:2605eed834989473842507",
  measurementId: "G-HMJ2BRZM8X"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
