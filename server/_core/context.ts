import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { getSupabaseAdmin } from "../supabase";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: "user" | "admin";
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AuthUser | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: AuthUser | null = null;
  const authorization = opts.req.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (token) {
    try {
      const supabase = getSupabaseAdmin();
      const { data: authData } = await supabase.auth.getUser(token);
      if (authData.user) {
        const { data: profile } = await supabase.from("profiles").select("id,email,full_name,role").eq("id", authData.user.id).maybeSingle();
        user = {
          id: authData.user.id,
          email: profile?.email ?? authData.user.email ?? null,
          name: profile?.full_name ?? (authData.user.user_metadata?.name as string | null) ?? null,
          role: profile?.role === "admin" ? "admin" : "user",
        };
      }
    } catch (error) {
      console.warn("[Auth] Supabase session validation failed", error);
    }
  }
  return { req: opts.req, res: opts.res, user };
}
