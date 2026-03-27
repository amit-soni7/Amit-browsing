import type { UUID } from 'crypto';
import type { EWindow } from '@/lib/types';
import type { ETab } from '@/lib/types';

export type SessionKind = 'saved' | 'autosave' | 'recovery';
export type SessionSource =
  | 'manual'
  | 'timer'
  | 'tab-close'
  | 'window-close'
  | 'startup-shutdown';

export type SyncState = 'local' | 'pending' | 'synced' | 'failed';

export interface ESession {
  title: string;
  windows: EWindow[];
  tabsNumber: number;
  dateSaved: number | undefined;
  dateModified: number | undefined;
  id: UUID | 'current';
  tags?: string;
  kind?: SessionKind;
  source?: SessionSource;
  createdAt?: number;
  updatedAt?: number;
  lastOpenedAt?: number;
  deviceId?: string;
  schemaVersion?: number;
  deletedAt?: number | null;
  syncState?: SyncState;
  remoteUpdatedAt?: number;
}

export interface FilterOptions {
  query: string;
  sortMethod: SortMethod;
  tagsFilter: '__all__' | (string & NonNullable<unknown>);
  default_tabs?: boolean;
}

export type Page = 'popup' | 'options' | 'discarded';

export type Icon =
  | 'default'
  | 'copy'
  | 'check'
  | 'save'
  | 'rename'
  | 'delete'
  | 'open'
  | 'close'
  | 'incognito'
  | 'window'
  | 'tab'
  | 'global'
  | 'extension'
  | 'history'
  | 'expand'
  | 'collapse'
  | 'tag'
  | 'untag'
  | 'search'
  | 'settings'
  | 'donate';

export interface ENotification {
  type: 'info' | 'success' | 'warning' | 'error';
  msg: string;
  duration?: number;
}

export type URLFilterList = string[] | ['<all_urls>'] | undefined;

export type SortMethod = 'newest' | 'oldest' | 'az' | 'za';
export type ThemeMode = 'system' | 'dark' | 'light';

export interface EClosedItem {
  id: UUID | string;
  itemType: 'tab' | 'window';
  title: string;
  tab?: ETab;
  session?: ESession;
  closedAt: number;
  updatedAt: number;
  deviceId?: string;
  schemaVersion?: number;
  deletedAt?: number | null;
  syncState?: SyncState;
  remoteUpdatedAt?: number;
}

export interface ESettings {
  theme: ThemeMode;
  darkMode: boolean;
  popupView: boolean;
  selectionId: 'current' | UUID;
  discarded: boolean;
  urlFilterList: URLFilterList;
  autoSave: boolean;
  autoSaveMaxSessions: number;
  autoSaveTimer: number;
  tags: Record<
    string,
    {
      name?: string;
      bgColor: string;
      textColor: string;
    }
  >;
  doNotAskForTitle: boolean;
  excludePinned: boolean;
  exportCompressed: boolean;
  sortMethod: SortMethod;
  tagsFilter: '__all__' | (string & NonNullable<unknown>);
}
