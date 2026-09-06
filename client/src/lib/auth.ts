import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export const ADMIN_EMAIL = "morrisadicialg@gmail.com";
export const PRODUCTION_ORIGIN = "https://atonicmusic.vercel.app";

export type ClientProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
};

export function getAppOrigin() {
  if (typeof window === "undefined") return PRODUCTION_ORIGIN;
  return window.location.origin;
}

export async function getSessionProfile(session?: Session | null) {
  const activeSession = session === undefined ? (await supabase.auth.getSession()).data.session : session;
  if (!activeSession?.user) return { session: null, profile: null, isAdmin: false } as const;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,avatar_url,role")
    .eq("id", activeSession.user.id)
    .maybeSingle();
  if (error) throw error;

  const email = (profile?.email ?? activeSession.user.email ?? "").trim().toLowerCase();
  const isAdmin = email === ADMIN_EMAIL && profile?.role === "admin";
  return { session: activeSession, profile: profile ? { ...profile, role: profile.role === "admin" ? "admin" : "user" } : null, isAdmin } as const;
}
