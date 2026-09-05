import { supabase } from "@/lib/supabase";

export const startLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/admin` } });
  if (error) throw error;
};
