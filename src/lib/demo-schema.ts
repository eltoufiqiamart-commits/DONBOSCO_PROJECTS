/** Returns true only for API/Postgres errors indicating the optional demo migration/RPC is missing. */
export function isMissingDemoSchemaError(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false;
  if (["PGRST202", "PGRST204", "42883", "42703"].includes(error.code ?? "")) return true;
  const message = error.message ?? "";
  return /could not find .+ (column|function) .+ schema cache|column .+ does not exist|function .+ does not exist/i.test(message);
}
