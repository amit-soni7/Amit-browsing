import {
  openDB,
  type DBSchema,
  type IDBPDatabase,
  type IDBPTransaction,
  type StoreNames
} from 'idb';
import type { UUID } from 'crypto';
import type { EClosedItem, ESession, EWindow, SessionKind } from '@/lib/types';
import { log } from '@/lib/utils/log';
import { recoveryDefaults } from '@/lib/constants/shared';

interface DB extends DBSchema {
  sessions: {
    value: ESession;
    key: UUID | string;
    indexes: {
      title: string;
      dateSaved: number;
      tags: string | string[];
      kind: string;
      updatedAt: number;
    };
  };
  closedItems: {
    value: EClosedItem;
    key: string;
    indexes: { closedAt: number; itemType: string; updatedAt: number };
  };
}

class SessionsDB {
  private static instance: SessionsDB;
  private db!: IDBPDatabase<DB>;
  private open = false;
  private version = 2;

  constructor() {
    if (!SessionsDB.instance) SessionsDB.instance = this;

    return SessionsDB.instance;
  }

  async initDB() {
    if (this.open) {
      log.debug('[db.initDB[] already open');
      return;
    }

    log.info('[db.initDB] init');

    this.db = await openDB<DB>('sessions', this.version, {
      upgrade: this.upgradeSessions
    });

    this.open = true;

    this.db.onclose = () => log.info('[db.initDB] closing db');

    this.db.onerror = () => log.error('[db.initDB] error in db: ', this.db);

    this.db.onabort = () =>
      log.error('[db.initDB]: aborted transactions in db: ', this.db);
  }

  async loadSessions(query?: number | IDBKeyRange, count?: number) {
    log.info('[db.loadSessions] init');

    await this.initDB();

    const items = await this.db.getAllFromIndex('sessions', 'dateSaved', query, count);

    return items.filter(
      (session) => !session.kind || session.kind === 'saved'
    );
  }

  async loadSessionsByKinds(kinds: SessionKind[]) {
    log.info('[db.loadSessionsByKinds] init');

    await this.initDB();

    const sessions = await this.db.getAll('sessions');

    return sessions.filter((session) => kinds.includes(session.kind ?? 'saved'));
  }

  async streamSessions(
    index: keyof DB['sessions']['indexes'] = 'dateSaved',
    callback: (sessions: ESession[]) => unknown,
    maxBatch?: number | IDBKeyRange,
    direction?: IDBCursorDirection
  ) {
    log.info('[db.lazyLoadSessions] init');

    const sessions: ESession[] = [];

    await this.initDB();

    const tx = this.db.transaction('sessions').store.index(index);

    const totalCount = await tx.count();
    let currentCount = 0;

    if (!maxBatch) maxBatch = totalCount;

    for await (const cursor of tx.iterate(undefined, direction)) {
      cursor.value.windows = {
        length: cursor.value.windows.length
      } as EWindow[];

      sessions.push(cursor.value);

      currentCount++;

      if (currentCount === maxBatch || sessions.length === totalCount) {
        currentCount = 0;
        callback(sessions);
      }
    }

    return totalCount;
  }

  async streamSessionsByKinds(
    kinds: SessionKind[],
    callback: (sessions: ESession[]) => unknown
  ) {
    log.info('[db.streamSessionsByKinds] init');

    await this.initDB();

    const sessions = (await this.db.getAll('sessions'))
      .filter((session) => kinds.includes(session.kind ?? 'saved'))
      .sort((a, b) => (b.updatedAt ?? b.dateSaved ?? 0) - (a.updatedAt ?? a.dateSaved ?? 0));

    for (const session of sessions) {
      session.windows = { length: session.windows.length } as EWindow[];
    }

    callback(sessions);

    return sessions.length;
  }

  async loadSessionWindows(id: UUID) {
    log.info('[db.loadSessionWindows] init');

    await this.initDB();

    return (await this.db.get('sessions', id))?.windows;
  }

  async saveSession(session: ESession) {
    log.info('[db.saveSession] init');

    await this.initDB();

    return this.db.add('sessions', session);
  }

  async upsertSession(session: ESession) {
    log.info('[db.upsertSession] init');

    await this.initDB();

    return this.db.put('sessions', session);
  }

  async saveSessions(sessions: ESession[]) {
    log.info('[db.saveSessions] init');

    await this.initDB();

    const tx = this.db.transaction('sessions', 'readwrite');

    return new Promise<void>((resolve, reject) => {
      for (const session of sessions) {
        tx.store.add(session);
      }

      tx.oncomplete = () => {
        log.info('[db.saveSessions] saved batch sessions: ', sessions);
        resolve();
      };

      tx.onerror = () => {
        log.error('[db.saveSessions] error saving sessions: ', sessions);
        reject();
      };

      tx.onabort = () => {
        log.error('[db.saveSessions] aborted saving sessions: ', sessions);
        reject();
      };
    });
  }

  async updateSession(session: ESession) {
    log.info('[db.updateSession] init');

    await this.initDB();

    return this.db.put('sessions', session);
  }

  async deleteSession(session: ESession) {
    log.info('[db.deleteSession] init');

    await this.initDB();

    return this.db.delete('sessions', session.id as UUID);
  }

  async getAutosavedCount() {
    log.info('[db.getAutosavedCount] init');

    await this.initDB();

    return this.db.countFromIndex('sessions', 'tags', 'Autosave');
  }

  async deleteLastAutosavedSession(count: number = 1) {
    log.info('[db.deleteLastAutosavedSession] init');

    await this.initDB();

    const tx = this.db
      .transaction('sessions', 'readwrite')
      .store.index('dateSaved');

    for await (const cursor of tx.iterate(null, 'next')) {
      if (cursor.value.tags === 'Autosave') {
        cursor.delete();

        count--;
        if (!count) break;
      }
    }
  }

  async deleteSessions() {
    log.info('[db.deleteSessions] init');

    await this.initDB();

    return this.db.clear('sessions');
  }

  async deleteSessionsByKinds(kinds: SessionKind[]) {
    log.info('[db.deleteSessionsByKinds] init');

    await this.initDB();

    const tx = this.db.transaction('sessions', 'readwrite');

    for await (const cursor of tx.store.iterate()) {
      if (kinds.includes(cursor.value.kind ?? 'saved')) {
        cursor.delete();
      }
    }

    await tx.done;
  }

  async replaceSessionsByKinds(kinds: SessionKind[], sessions: ESession[]) {
    log.info('[db.replaceSessionsByKinds] init');

    await this.initDB();

    const tx = this.db.transaction('sessions', 'readwrite');

    for await (const cursor of tx.store.iterate()) {
      if (kinds.includes(cursor.value.kind ?? 'saved')) {
        cursor.delete();
      }
    }

    for (const session of sessions) {
      tx.store.put(session);
    }

    await tx.done;
  }

  async loadClosedItems(count?: number) {
    log.info('[db.loadClosedItems] init');

    await this.initDB();

    return this.db.getAllFromIndex('closedItems', 'closedAt', undefined, count);
  }

  async streamClosedItems(callback: (items: EClosedItem[]) => unknown) {
    log.info('[db.streamClosedItems] init');

    await this.initDB();

    const items = (await this.db.getAll('closedItems')).sort(
      (a, b) => b.closedAt - a.closedAt
    );

    callback(items);

    return items.length;
  }

  async saveClosedItem(item: EClosedItem) {
    log.info('[db.saveClosedItem] init');

    await this.initDB();

    return this.db.put('closedItems', item);
  }

  async deleteClosedItem(id: string) {
    log.info('[db.deleteClosedItem] init');

    await this.initDB();

    return this.db.delete('closedItems', id);
  }

  async replaceClosedItems(items: EClosedItem[]) {
    log.info('[db.replaceClosedItems] init');

    await this.initDB();

    const tx = this.db.transaction('closedItems', 'readwrite');
    await tx.store.clear();

    for (const item of items) {
      tx.store.put(item);
    }

    await tx.done;
  }

  async pruneClosedItems(maxCount: number = recoveryDefaults.closedItemsMax) {
    log.info('[db.pruneClosedItems] init');

    await this.initDB();

    const items = (await this.db.getAll('closedItems')).sort(
      (a, b) => b.closedAt - a.closedAt
    );

    const toDelete = items.slice(maxCount);
    await Promise.all(toDelete.map((item) => this.db.delete('closedItems', item.id as string)));
  }

  upgradeSessions(
    db: IDBPDatabase<DB>,
    oldVersion: number,
    newVersion: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transaction: IDBPTransaction<
      DB,
      ArrayLike<StoreNames<DB>>,
      'versionchange'
    >,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    event: IDBVersionChangeEvent
  ) {
    log.info(
      `[db.upgradeSession] init - version: ${newVersion}, old: ${oldVersion}`
    );

    if (oldVersion < 1) {
      log.info('[db.upgradeSession] creating object store');

      const sessionsStore = db.createObjectStore('sessions', {
        keyPath: 'id'
      });

      sessionsStore.createIndex('title', 'title', { unique: false });
      sessionsStore.createIndex('dateSaved', 'dateSaved', { unique: false });
      sessionsStore.createIndex('tags', 'tags', { unique: false });
    }

    const sessionsStore =
      transaction.objectStore('sessions');

    if (oldVersion < 2) {
      if (!sessionsStore.indexNames.contains('kind'))
        sessionsStore.createIndex('kind', 'kind', { unique: false });
      if (!sessionsStore.indexNames.contains('updatedAt'))
        sessionsStore.createIndex('updatedAt', 'updatedAt', { unique: false });

      const closedItemsStore = db.createObjectStore('closedItems', {
        keyPath: 'id'
      });

      closedItemsStore.createIndex('closedAt', 'closedAt', { unique: false });
      closedItemsStore.createIndex('itemType', 'itemType', { unique: false });
      closedItemsStore.createIndex('updatedAt', 'updatedAt', {
        unique: false
      });
    }
  }
}

export const sessionsDB = new SessionsDB();
