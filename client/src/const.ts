import { supabase } from "@/lib/supabase";
import { getAppOrigin } from "@/lib/auth";

export const startLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${getAppOrigin()}/auth/callback?next=/admin` } });
  if (error) throw error;
};
