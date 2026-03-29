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
export type TabGroupType = 'current' | 'saved' | 'temporary';

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
  dashboardEnabled: boolean;
  dashboardTabId?: number;
  dashboardWindowId?: number;
  dashboardLastWindowId?: number;
  dashboardLastOpenedAt?: number;
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

export interface UserProfileDoc {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt?: number;
  updatedAt?: number;
  lastActiveAt?: number;
}

export interface PreferencesDoc {
  theme: ThemeMode;
  tabViewMode: 'list' | 'card';
  sidebarWidth: number;
  openTabBehavior: 'new_tab';
  sortGroupsBy: SortMethod;
  updatedAt?: number;
}

export interface DeviceDoc {
  deviceId: string;
  deviceName: string;
  browser: string;
  platform: string;
  extensionVersion: string;
  lastSeenAt?: number;
  lastSyncAt?: number;
  createdAt?: number;
}

export interface TabGroupDoc {
  title: string;
  normalizedTitle: string;
  tags: string[];
  type: TabGroupType;
  isCurrentSession: boolean;
  isPinned: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  sortOrder: number;
  tabCount: number;
  preview: {
    firstTabTitle: string;
    firstTabUrl: string;
    firstFaviconUrl: string;
  } | null;
  createdByDeviceId: string;
  updatedByDeviceId: string;
  version: number;
  createdAt?: number;
  updatedAt?: number;
  lastOpenedAt?: number;
}

export interface TabDoc {
  title: string;
  url: string;
  normalizedUrl: string;
  faviconUrl: string;
  index: number;
  windowIndex: number;
  pinned: boolean;
  muted: boolean;
  isDeleted: boolean;
  browserTabId?: number;
  windowId?: number;
  createdByDeviceId: string;
  updatedByDeviceId: string;
  version: number;
  createdAt?: number;
  updatedAt?: number;
}
