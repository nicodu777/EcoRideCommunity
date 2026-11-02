import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// Validate Firebase configuration
const requiredEnvVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if all required environment variables are present
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => `VITE_FIREBASE_${key.toUpperCase()}`);

if (missingVars.length > 0) {
  console.error("Missing Firebase configuration:", missingVars);
  throw new Error(`Missing Firebase environment variables: ${missingVars.join(", ")}`);
}

const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey,
  authDomain: `${requiredEnvVars.projectId}.firebaseapp.com`,
  projectId: requiredEnvVars.projectId,
  storageBucket: `${requiredEnvVars.projectId}.firebasestorage.app`,
  appId: requiredEnvVars.appId,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// En développement uniquement : émulateur Firebase Auth local (comptes de démo)
const emulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
if (import.meta.env.DEV && emulatorHost) {
  connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
}

export default app;
