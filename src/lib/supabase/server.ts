import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from "./env";

export async function createServerSupabase(): Promise<SupabaseClient | null> {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server components cannot always mutate response cookies. Middleware refreshes sessions.
        }
      },
    },
  });
}

export function createPublicServerSupabase(): SupabaseClient | null {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  return createClient(env.url, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "don-bosco-projects/public" } },
  });
}

export function createServiceSupabase(): SupabaseClient | null {
  const env = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!env || !serviceRoleKey) return null;
  return createClient(env.url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "don-bosco-projects/server" } },
  });
}

export async function isAuthorizedAdministrator(client?: SupabaseClient | null): Promise<boolean> {
  const supabase = client === undefined ? await createServerSupabase() : client;
  if (!supabase) return false;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return false;
  const { data, error } = await supabase.rpc("is_project_admin");
  return !error && data === true;
}
