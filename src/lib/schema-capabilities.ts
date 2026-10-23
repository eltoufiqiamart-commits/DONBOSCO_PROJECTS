import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Detects whether migration 007 is installed without granting client roles direct
 * SELECT access to demo_url. The RPC exists only after the migration is applied.
 */
export async function projectDemoColumnsSupported(supabase: SupabaseClient | null): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("project_demo_columns_supported");
  return !error && data === true;
}
