import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";
import { projectInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
const auth = await getAdminContext();

if (!auth.context) {
return auth.response;
}

const params = request.nextUrl.searchParams;
const rawPage = Number(params.get("page")) || 1;
const page = Math.max(1, Math.min(10000, Math.floor(rawPage)));
const status = params.get("status");

const allowedStatus = [
"draft",
"pending",
"published",
"rejected",
"archived",
].includes(status ?? "")
? status
: null;

const query = (params.get("q") ?? "").trim().slice(0, 120);

const { data, error } = await auth.context.supabase.rpc(
"admin_list_projects",
{
p_query: query || null,
p_status: allowedStatus,
p_page: page,
p_page_size: 20,
}
);

if (error || !Array.isArray(data)) {
console.error("[admin/projects GET] Load failed:", error);

```
return NextResponse.json(
  { error: "load_failed" },
  {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  }
);
```

}

const rows = data as Array<{
project: unknown;
total_count: number | string;
}>;

return NextResponse.json(
{
items: rows.map((row) => row.project),
total: Number(rows[0]?.total_count ?? 0),
page,
pageSize: 20,
},
{
headers: { "Cache-Control": "no-store" },
}
);
}

export async function POST(request: NextRequest) {
const auth = await getAdminContext();

if (!auth.context) {
return auth.response;
}

let body: unknown;

try {
body = await request.json();
} catch {
return NextResponse.json(
{
error: "invalid_request",
message: "The request body is not valid JSON.",
},
{ status: 400 }
);
}

const parsed = projectInputSchema.safeParse(body);

if (!parsed.success) {
const fields = parsed.error.flatten().fieldErrors;

```
console.error("[admin/projects POST] Validation failed:", fields);

return NextResponse.json(
  {
    error: "invalid_project",
    message: "Some project fields are invalid.",
    fields,
  },
  { status: 400 }
);
```

}

const { data, error } = await auth.context.supabase.rpc(
"admin_save_project",
{
p_payload: parsed.data,
p_project_id: null,
}
);

if (error) {
console.error("[admin/projects POST] Save failed:", {
code: error.code,
message: error.message,
details: error.details,
hint: error.hint,
});

```
const isSlugConflict = error.code === "23505";

return NextResponse.json(
  {
    error: isSlugConflict ? "slug_conflict" : "save_failed",
    message: isSlugConflict
      ? "This project slug already exists. Please use a different slug."
      : "The database could not save the project.",
    code: error.code,
  },
  {
    status: isSlugConflict ? 409 : 400,
    headers: { "Cache-Control": "no-store" },
  }
);
```

}

return NextResponse.json(
{
id: data,
saved: true,
},
{
status: 201,
headers: { "Cache-Control": "no-store" },
}
);
}
