import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from './auth-context';
import { watchFollowing, watchFollowRequests } from './social-service';

interface SocialState {
  /** Uids I follow. */
  following: string[];
  /** People waiting for me to approve their follow request, newest first. */
  requests: { uid: string; at: number }[];
  loaded: boolean;
}

const SocialContext = createContext<SocialState>({ following: [], requests: [], loaded: false });

/** Keeps who I follow and my pending follow requests live for the whole app. */
export function SocialProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const uid = status === 'ready' ? user?.uid : undefined;
  const [state, setState] = useState<SocialState>({ following: [], requests: [], loaded: false });

  useEffect(() => {
    setState({ following: [], requests: [], loaded: false });
    if (!uid) return;
    const a = watchFollowing(uid, (following) => setState((s) => ({ ...s, following, loaded: true })));
    const b = watchFollowRequests(uid, (requests) => setState((s) => ({ ...s, requests })));
    return () => {
      a();
      b();
    };
  }, [uid]);

  return <SocialContext.Provider value={state}>{children}</SocialContext.Provider>;
}

export function useSocial(): SocialState {
  return useContext(SocialContext);
}
