"use client";

import { useEffect } from "react";

export function ProjectViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/projects/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      signal: controller.signal,
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: "{}",
    }).catch(() => undefined);
    return () => controller.abort();
  }, [slug]);
  return null;
}
