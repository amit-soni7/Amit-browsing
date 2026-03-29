export { auth, db, isFirebaseConfigured } from './config';
export { signInWithGoogle, signOut, onAuthChange, getCurrentUser } from './auth';
export {
  syncSavedSessionToCloud,
  syncCurrentSessionToCloud,
  deleteSavedSessionFromCloud,
  subscribeToSavedSessions,
  subscribeToPreferences,
  syncPreferencesToCloud,
  upsertDeviceToCloud,
  ensureUserDocument
} from './firestore';
