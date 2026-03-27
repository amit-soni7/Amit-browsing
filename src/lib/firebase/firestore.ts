import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  type Unsubscribe
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import type { EClosedItem, ESession, SessionKind } from '@/lib/types';
import { log } from '@/lib/utils/log';

function userDoc(uid: string) {
  return doc(db, 'users', uid);
}

function savedSessionsRef(uid: string) {
  return collection(db, 'users', uid, 'savedSessions');
}

function recoverySnapshotsRef(uid: string) {
  return collection(db, 'users', uid, 'recoverySnapshots');
}

function closedItemsRef(uid: string) {
  return collection(db, 'users', uid, 'closedItems');
}

function savedSessionDoc(uid: string, sessionId: string) {
  return doc(db, 'users', uid, 'savedSessions', sessionId);
}

function recoverySnapshotDoc(uid: string, snapshotId: string) {
  return doc(db, 'users', uid, 'recoverySnapshots', snapshotId);
}

function closedItemDoc(uid: string, itemId: string) {
  return doc(db, 'users', uid, 'closedItems', itemId);
}

function sessionPayload(session: ESession, kind: SessionKind) {
  return {
    ...session,
    kind,
    windows: JSON.parse(JSON.stringify(session.windows)),
    remoteUpdatedAt: serverTimestamp()
  };
}

export async function syncSavedSessionToCloud(uid: string, session: ESession) {
  if (!isFirebaseConfigured) return;

  try {
    await setDoc(
      savedSessionDoc(uid, session.id as string),
      sessionPayload(session, 'saved')
    );
    log.info('[firestore] synced saved session:', session.id);
  } catch (error) {
    log.error('[firestore] sync saved session error:', error);
  }
}

export async function syncRecoverySnapshotToCloud(
  uid: string,
  session: ESession
) {
  if (!isFirebaseConfigured) return;

  try {
    await setDoc(
      recoverySnapshotDoc(uid, session.id as string),
      sessionPayload(session, session.kind ?? 'recovery')
    );
    log.info('[firestore] synced recovery snapshot:', session.id);
  } catch (error) {
    log.error('[firestore] sync recovery snapshot error:', error);
  }
}

export async function syncClosedItemToCloud(uid: string, item: EClosedItem) {
  if (!isFirebaseConfigured) return;

  try {
    await setDoc(closedItemDoc(uid, item.id as string), {
      ...item,
      remoteUpdatedAt: serverTimestamp()
    });
    log.info('[firestore] synced closed item:', item.id);
  } catch (error) {
    log.error('[firestore] sync closed item error:', error);
  }
}

export async function deleteSavedSessionFromCloud(uid: string, sessionId: string) {
  if (!isFirebaseConfigured) return;

  try {
    await deleteDoc(savedSessionDoc(uid, sessionId));
  } catch (error) {
    log.error('[firestore] delete saved session error:', error);
  }
}

export async function deleteRecoverySnapshotFromCloud(
  uid: string,
  snapshotId: string
) {
  if (!isFirebaseConfigured) return;

  try {
    await deleteDoc(recoverySnapshotDoc(uid, snapshotId));
  } catch (error) {
    log.error('[firestore] delete recovery snapshot error:', error);
  }
}

export async function deleteClosedItemFromCloud(uid: string, itemId: string) {
  if (!isFirebaseConfigured) return;

  try {
    await deleteDoc(closedItemDoc(uid, itemId));
  } catch (error) {
    log.error('[firestore] delete closed item error:', error);
  }
}

function mapSession(docSnap: { id: string; data(): Record<string, any> }): ESession {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    title: data.title,
    windows: data.windows ?? [],
    tabsNumber: data.tabsNumber ?? 0,
    dateSaved: data.dateSaved,
    dateModified: data.dateModified,
    tags: data.tags,
    kind: data.kind,
    source: data.source,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    lastOpenedAt: data.lastOpenedAt,
    deviceId: data.deviceId,
    schemaVersion: data.schemaVersion,
    deletedAt: data.deletedAt,
    remoteUpdatedAt: data.remoteUpdatedAt?.seconds
      ? data.remoteUpdatedAt.seconds * 1000
      : data.remoteUpdatedAt
  };
}

function mapClosedItem(docSnap: {
  id: string;
  data(): Record<string, any>;
}): EClosedItem {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    itemType: data.itemType,
    title: data.title,
    tab: data.tab,
    session: data.session,
    closedAt: data.closedAt,
    updatedAt: data.updatedAt,
    deviceId: data.deviceId,
    schemaVersion: data.schemaVersion,
    deletedAt: data.deletedAt,
    remoteUpdatedAt: data.remoteUpdatedAt?.seconds
      ? data.remoteUpdatedAt.seconds * 1000
      : data.remoteUpdatedAt
  };
}

export function subscribeToSavedSessions(
  uid: string,
  onUpdate: (sessions: ESession[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured) return () => {};

  return onSnapshot(
    query(savedSessionsRef(uid), orderBy('dateSaved', 'desc')),
    (snapshot) => onUpdate(snapshot.docs.map(mapSession)),
    (error) => {
      log.error('[firestore] saved sessions snapshot error:', error);
      onError?.(error);
    }
  );
}

export function subscribeToRecoverySnapshots(
  uid: string,
  onUpdate: (sessions: ESession[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured) return () => {};

  return onSnapshot(
    query(recoverySnapshotsRef(uid), orderBy('updatedAt', 'desc')),
    (snapshot) => onUpdate(snapshot.docs.map(mapSession)),
    (error) => {
      log.error('[firestore] recovery snapshots snapshot error:', error);
      onError?.(error);
    }
  );
}

export function subscribeToClosedItems(
  uid: string,
  onUpdate: (items: EClosedItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured) return () => {};

  return onSnapshot(
    query(closedItemsRef(uid), orderBy('closedAt', 'desc')),
    (snapshot) => onUpdate(snapshot.docs.map(mapClosedItem)),
    (error) => {
      log.error('[firestore] closed items snapshot error:', error);
      onError?.(error);
    }
  );
}

export async function ensureUserDocument(
  uid: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null
): Promise<void> {
  if (!isFirebaseConfigured) return;

  try {
    await setDoc(
      userDoc(uid),
      {
        uid,
        email,
        displayName,
        photoURL,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    log.error('[firestore] ensureUserDocument error:', error);
  }
}
