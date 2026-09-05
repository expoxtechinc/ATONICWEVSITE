import { supabase } from "@/lib/supabase";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
};

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<(SupabaseUser & { role?: Profile["role"]; full_name?: string | null; name?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const hydrate = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession?.user) {
      setUser(null);
      return;
    }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("id,email,full_name,avatar_url,role").eq("id", nextSession.user.id).maybeSingle();
    if (profileError) {
      setError(profileError);
      setUser({ ...nextSession.user, role: "user", name: nextSession.user.user_metadata?.name ?? null });
      return;
    }
    setUser({ ...nextSession.user, role: profile?.role === "admin" ? "admin" : "user", full_name: profile?.full_name ?? null, name: profile?.full_name ?? nextSession.user.user_metadata?.name ?? null });
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError(sessionError);
      hydrate(data.session).finally(() => mounted && setLoading(false));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      hydrate(nextSession).finally(() => mounted && setLoading(false));
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [hydrate]);

  useEffect(() => {
    if (!options?.redirectOnUnauthenticated || loading || user) return;
    if (options.redirectPath && window.location.pathname !== options.redirectPath) window.location.href = options.redirectPath;
  }, [loading, options, user]);

  const logout = useCallback(async () => {
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) throw logoutError;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error: signInError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/admin` } });
    if (signInError) throw signInError;
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    return result.data;
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    if (result.error) throw result.error;
    return result.data;
  }, []);

  return {
    session,
    user,
    loading,
    error,
    isAuthenticated: Boolean(session?.user),
    logout,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    refresh: async () => { const result = await supabase.auth.getSession(); await hydrate(result.data.session); },
  };
}
