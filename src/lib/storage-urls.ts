export type PublicMediaEntity = "project-cover" | "project-gallery" | "department" | "team";

export function publicMediaEndpoint(
  entity: PublicMediaEntity,
  values: { slug: string; path?: string | null; mediaId?: string | null },
): string | null {
  if (!values.slug) return null;
  const params = new URLSearchParams({ entity, slug: values.slug });
  if (entity === "project-gallery") {
    if (!values.mediaId) return null;
    params.set("media", values.mediaId);
  } else {
    if (!values.path) return null;
    params.set("path", values.path);
  }
  return `/api/public/media?${params.toString()}`;
}
