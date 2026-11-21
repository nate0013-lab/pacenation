import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from './auth-context';
import { db } from './firebase';
import { SETTING_FOR, setNotificationSender, watchNotifications, type AppNotification } from './notifications-service';
import type { PrivateSettings } from './types';

export type NotificationPrefs = PrivateSettings['notifications'];

export const DEFAULT_PREFS: NotificationPrefs = { followers: true, likesAndComments: true, challenges: true, events: true, milestones: true };

interface NotificationsState {
  /** Inbox items the person's settings allow, newest first. */
  items: AppNotification[];
  unread: number;
  prefs: NotificationPrefs;
  loaded: boolean;
}

const Ctx = createContext<NotificationsState>({ items: [], unread: 0, prefs: DEFAULT_PREFS, loaded: false });

/** Keeps the inbox and notification settings live, and names me as the sender of notifications I cause. */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { status, user, profile } = useAuth();
  const uid = status === 'ready' ? user?.uid : undefined;
  const [all, setAll] = useState<AppNotification[]>([]);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setNotificationSender(profile?.displayName ?? '');
  }, [profile?.displayName]);

  useEffect(() => {
    setAll([]);
    setLoaded(false);
    setPrefs(DEFAULT_PREFS);
    if (!uid) return;
    const a = watchNotifications(uid, (list) => {
      setAll(list);
      setLoaded(true);
    });
    const b = onSnapshot(
      doc(db, 'users', uid, 'private', 'settings'),
      (snap) => setPrefs({ ...DEFAULT_PREFS, ...((snap.data() as PrivateSettings | undefined)?.notifications ?? {}) }),
      () => undefined,
    );
    return () => {
      a();
      b();
    };
  }, [uid]);

  const value = useMemo(() => {
    const items = all.filter((n) => prefs[SETTING_FOR[n.type]] !== false);
    return { items, unread: items.filter((n) => !n.read).length, prefs, loaded };
  }, [all, prefs, loaded]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications(): NotificationsState {
  return useContext(Ctx);
}

export function saveNotificationPrefs(uid: string, prefs: NotificationPrefs) {
  return updateDoc(doc(db, 'users', uid, 'private', 'settings'), { notifications: prefs });
}
