import { createClient } from "@/lib/supabase/client";

/**
 * Returns the current user's Supabase JWT access token.
 * Throws if the user is not authenticated.
 *
 * This token is sent as a Bearer header to the backend API, which validates
 * it server-side using the Supabase service role key (kept exclusively in the
 * backend repo).
 */
export async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  return session.access_token;
}
