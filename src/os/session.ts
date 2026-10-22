import { supabase } from "@/integrations/supabase/client";

/**
 * OriginTV devices identify themselves with a silent device session —
 * no account screens, the TV just gets its own cloud identity.
 */
export async function ensureDeviceSession(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) return;
    await supabase.auth.signInAnonymously();
  } catch (err) {
    console.warn("[OriginTV] device session unavailable", err);
  }
}
