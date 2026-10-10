import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";
import { departmentInputSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminContext();
  if (!auth.context) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = departmentInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_department", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const payload = {
    name: parsed.data.name,
    description: parsed.data.description,
    coverImagePath: parsed.data.coverImagePath ?? null,
    isActive: parsed.data.isActive,
    displayOrder: parsed.data.displayOrder,
  };
  const { error } = await auth.context.supabase.rpc("admin_update_department", { p_department_id: id, p_payload: payload });
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 400 });
  return NextResponse.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
}
