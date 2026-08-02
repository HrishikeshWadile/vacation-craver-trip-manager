import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";
import type { Profile } from "../types/user";
import { cache } from "../services/cache";

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Failed to load profile", error.message);
    return null;
  }
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Tracks whose profile is currently loaded so we can tell a real
  // sign-in/sign-out apart from Supabase's routine background token
  // refresh (which fires on every tab focus for the *same* user and
  // was previously triggering a full loading-spinner remount of the
  // whole app — that's the "page refreshes on tab switch" bug).
  const currentUserIdRef = useRef<string | undefined>(undefined);

  async function loadProfileFor(userId: string | undefined) {
    if (!userId) {
      setProfile(null);
      return;
    }
    const p = await fetchProfile(userId);
    setProfile(p);
  }

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      const userId = data.session?.user.id;
      currentUserIdRef.current = userId;
      setSession(data.session);
      await loadProfileFor(userId);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;

        const newUserId = newSession?.user.id;
        const userActuallyChanged = newUserId !== currentUserIdRef.current;

        setSession(newSession);

        if (!userActuallyChanged) {
          // Same user, e.g. a background TOKEN_REFRESHED on tab focus —
          // update the session silently, but don't toggle `loading` or
          // reload the profile. Toggling loading here is what unmounted
          // pages (forms, admin dashboard state) via ProtectedRoute's
          // spinner every time you switched tabs.
          return;
        }

        currentUserIdRef.current = newUserId;
        setLoading(true);
        await loadProfileFor(newUserId);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      isAdmin: profile?.role === "admin",
      loading,
      refreshProfile: () => loadProfileFor(session?.user.id),
      signOut: async () => {
        cache.clear();
        currentUserIdRef.current = undefined;
        await supabase.auth.signOut();
      },
    }),
    [session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}