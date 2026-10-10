import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

export type AdminContext = { supabase: SupabaseClient; user: User };
export type AdminAuthResult = { context: AdminContext; response?: never } | { context?: never; response: Response };

export async function getAdminContext(): Promise<AdminAuthResult> {
  const supabase = await createServerSupabase();
  if (!supabase) return { response: Response.json({ error: "not_configured" }, { status: 503 }) };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { response: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { data: allowed, error: permissionError } = await supabase.rpc("is_project_admin");
  if (permissionError || allowed !== true) return { response: Response.json({ error: "forbidden" }, { status: 403 }) };
  return { context: { supabase, user: authData.user } };
}

export async function logAdminActivity(
  supabase: SupabaseClient,
  adminUserId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
) {
  await supabase.from("admin_activity_logs").insert({
    admin_user_id: adminUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}

export function jsonAdminError(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
