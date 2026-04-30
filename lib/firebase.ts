import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCi_pQ0-Q2L0jyY6wQHmEH27MHZfVm7Hug",
  authDomain: "xo-guess.firebaseapp.com",

    databaseURL: "https://xo-guess-default-rtdb.firebaseio.com",

  projectId: "xo-guess",
  storageBucket: "xo-guess.firebasestorage.app",
  messagingSenderId: "638213094283",
  appId: "1:638213094283:web:729ac007556f80db3b8d8e",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);