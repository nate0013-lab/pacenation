import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { auth, db } from './firebase';
import type { UserProfile } from './types';

export type AuthStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  profile: UserProfile | null;
}

const AuthContext = createContext<AuthState>({ status: 'loading', user: null, profile: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, profile: null });

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubProfile?.();
      unsubProfile = undefined;
      if (!user) {
        setState({ status: 'signedOut', user: null, profile: null });
        return;
      }
      setState((s) => ({ ...s, status: 'loading', user }));
      unsubProfile = onSnapshot(
        doc(db, 'users', user.uid),
        (snap) => {
          const profile = snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null;
          setState({ status: profile ? 'ready' : 'needsProfile', user, profile });
        },
        () => setState({ status: 'needsProfile', user, profile: null }),
      );
    });
    return () => {
      unsubProfile?.();
      unsubAuth();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

/** For screens inside the signed-in area, where a profile always exists. */
export function useProfile(): { user: User; profile: UserProfile } {
  const { user, profile } = useAuth();
  if (!user || !profile) throw new Error('useProfile used outside the signed-in area');
  return { user, profile };
}
