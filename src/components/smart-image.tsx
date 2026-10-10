"use client";

import Image from "next/image";
import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { publicMediaEndpoint, type PublicMediaEntity } from "@/lib/storage-urls";

type Props = {
  path?: string | null;
  bucket: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fallbackLabel?: string;
  entity?: PublicMediaEntity;
  slug?: string;
  mediaId?: string;
};

export function SmartImage({ path, bucket, alt, className = "", sizes = "(max-width: 700px) 100vw, 50vw", priority = false, fallbackLabel, entity, slug, mediaId }: Props) {
  const [failed, setFailed] = useState(false);
  const expectedBucket: Record<PublicMediaEntity, string> = { "project-cover": "project-covers", "project-gallery": "project-gallery", department: "department-images", team: "team-images" };
  const src = entity && slug && expectedBucket[entity] === bucket ? publicMediaEndpoint(entity, { slug, path, mediaId }) : null;
  if (!src || failed) {
    return (
      <div className={`smart-image-fallback ${className}`} role="img" aria-label={alt || fallbackLabel || ""}>
        <span className="fallback-mark" aria-hidden="true"><ImageIcon size={21} strokeWidth={1.5} /></span>
        {fallbackLabel && <span className="fallback-label">{fallbackLabel}</span>}
        <span className="fallback-lines" aria-hidden="true"><i /><i /><i /></span>
      </div>
    );
  }
  return (
    <div className={`smart-image ${className}`}>
      <div className="smart-image-underlay" aria-hidden="true">
        <span className="fallback-mark"><ImageIcon size={21} strokeWidth={1.5} /></span>
      </div>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized
        onError={() => setFailed(true)}
        className="smart-image-content"
      />
    </div>
  );
}
