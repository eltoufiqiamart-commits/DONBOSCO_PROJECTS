"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { Check, FileText, ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { t } from "@/i18n/dictionaries";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Purpose = "cover" | "gallery" | "department" | "team" | "document";
type Props = { locale: Locale; purpose: Purpose; label: string; hint: string; value: string | null; onChange: (path: string | null) => void; image?: boolean };

export function MediaUploader({ locale, purpose, label, hint, value, onChange, image = true }: Props) {
  const inputId = useId();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const bucketByPurpose: Record<Purpose, string> = {
    cover: "project-covers", gallery: "project-gallery", department: "department-images", team: "team-images", document: "approved-documents",
  };
  const bucket = bucketByPurpose[purpose];

  async function handleFile(file?: File) {
    setMessage("");
    if (!file) return;
    const allowed = image ? ["image/jpeg", "image/png", "image/webp"] : ["application/pdf"];
    const maxSize = image ? 8 * 1024 * 1024 : 12 * 1024 * 1024;
    if (!allowed.includes(file.type) || file.size <= 0 || file.size > maxSize) {
      setMessage(t(locale, "admin.uploadError"));
      return;
    }
    setPending(true);
    try {
      const signedResponse = await fetch("/api/admin/uploads/sign", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ purpose, mime: file.type, size: file.size }),
      });
      const signed = await signedResponse.json();
      if (!signedResponse.ok || !signed.token || signed.bucket !== bucket) throw new Error("sign_failed");
      const supabase = createBrowserSupabase();
      if (!supabase) throw new Error("storage_not_configured");
      const { error: uploadError } = await supabase.storage.from(bucket).uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error("upload_failed");
      const completeResponse = await fetch("/api/admin/uploads/complete", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ bucket, path: signed.path }),
      });
      const complete = await completeResponse.json();
      if (!completeResponse.ok || complete.verified !== true) throw new Error("verification_failed");
      onChange(signed.path);
      setMessage(t(locale, "admin.uploadSuccess"));
    } catch {
      setMessage(t(locale, "admin.uploadError"));
    } finally {
      setPending(false);
    }
  }

  function clear() {
    onChange(null);
    setMessage("");
  }

  const adminImage = value ? `/api/admin/media?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(value)}` : "";
  return (
    <div className="media-uploader">
      <div className="media-uploader-label-row"><label htmlFor={inputId}>{label}</label>{hint && <span>{hint}</span>}</div>
      {image && value ? <div className="media-preview"><Image src={adminImage} alt="" width={520} height={300} unoptimized /><button type="button" className="media-remove" onClick={clear} aria-label={t(locale, "common.delete")}><Trash2 size={15} /></button></div> : null}
      {!image && value ? <div className="document-preview"><FileText size={18} aria-hidden="true" /><span>{value.split("/").pop()}</span><button type="button" className="icon-button" onClick={clear} aria-label={t(locale, "common.delete")}><Trash2 size={15} /></button></div> : null}
      <div className="media-upload-row">
        <input
          id={inputId}
          type="file"
          accept={image ? "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" : "application/pdf,.pdf"}
          disabled={pending}
          onChange={(event) => { void handleFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }}
        />
        <label htmlFor={inputId} className={`upload-button${pending ? " is-disabled" : ""}`}>
          {pending ? <LoaderCircle size={16} className="spin" /> : value ? <ImagePlus size={16} /> : <Upload size={16} />}
          {pending ? t(locale, "admin.uploading") : value ? t(locale, "admin.uploadSuccess") : label}
        </label>
        {value && <span className="upload-complete"><Check size={14} aria-hidden="true" />{t(locale, "admin.uploadSuccess")}</span>}
      </div>
      {message && <p className={message === t(locale, "admin.uploadSuccess") ? "upload-success" : "upload-error"} role="status">{message}</p>}
    </div>
  );
}
