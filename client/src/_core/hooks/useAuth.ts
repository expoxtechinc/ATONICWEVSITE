import { supabase } from "@/lib/supabase";
import { ADMIN_EMAIL, getAppOrigin, getSessionProfile } from "@/lib/auth";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

type AppUser = SupabaseUser & {
  role?: "user" | "admin";
  full_name?: string | null;
  name?: string | null;
};

export function useAuth(options?: UseAuthOptions) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const requestId = useRef(0);

  const hydrate = useCallback(async (nextSession: Session | null) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const resolved = await getSessionProfile(nextSession);
      if (currentRequest !== requestId.current) return;
      setSession(resolved.session);
      if (!resolved.session?.user) {
        setUser(null);
      } else {
        const fullName = resolved.profile?.full_name ?? resolved.session.user.user_metadata?.name ?? null;
        setUser({
          ...resolved.session.user,
          role: resolved.isAdmin ? "admin" : "user",
          full_name: fullName,
          name: fullName,
        });
      }
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setSession(nextSession);
      setUser(nextSession?.user ? { ...nextSession.user, role: "user", name: nextSession.user.user_metadata?.name ?? null } : null);
      setError(cause instanceof Error ? cause : new Error("Unable to load the Supabase profile"));
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => { if (mounted) void hydrate(nextSession); }, 0);
    });
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError(sessionError);
      void hydrate(data.session);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [hydrate]);

  useEffect(() => {
    if (!options?.redirectOnUnauthenticated || loading || user) return;
    if (options.redirectPath && window.location.pathname !== options.redirectPath) window.location.replace(options.redirectPath);
  }, [loading, options?.redirectOnUnauthenticated, options?.redirectPath, user]);

  const logout = useCallback(async () => {
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) throw logoutError;
    setSession(null);
    setUser(null);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${getAppOrigin()}/auth/callback?next=/admin` },
    });
    if (signInError) throw signInError;
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    await hydrate(result.data.session);
    return result.data;
  }, [hydrate]);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${getAppOrigin()}/auth/callback?next=/admin` } });
    if (result.error) throw result.error;
    if (result.data.session) await hydrate(result.data.session);
    return result.data;
  }, [hydrate]);

  const refresh = useCallback(async () => {
    const result = await supabase.auth.getSession();
    await hydrate(result.data.session);
  }, [hydrate]);

  return {
    session,
    user,
    loading,
    error,
    isAuthenticated: Boolean(session?.user),
    isAdmin: Boolean(user?.role === "admin" && user.email?.trim().toLowerCase() === ADMIN_EMAIL),
    logout,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    refresh,
  };
}
