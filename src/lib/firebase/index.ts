export { auth, db, isFirebaseConfigured } from './config';
export { signInWithGoogle, signOut, onAuthChange, getCurrentUser } from './auth';
export {
  syncSavedSessionToCloud,
  syncRecoverySnapshotToCloud,
  syncClosedItemToCloud,
  deleteSavedSessionFromCloud,
  deleteRecoverySnapshotFromCloud,
  deleteClosedItemFromCloud,
  subscribeToSavedSessions,
  subscribeToRecoverySnapshots,
  subscribeToClosedItems,
  ensureUserDocument
} from './firestore';
