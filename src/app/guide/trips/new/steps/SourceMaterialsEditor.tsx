"use client";

import { useRef, useState } from "react";
import { SourceMaterial } from "../types";

/**
 * PDF source-materials uploader. Shows each uploaded file's name with a delete
 * button; limited to `maxFiles` (default 2) per waypoint / trip. Web links were
 * removed (Round 6 item 5) — PDF only.
 */
export default function SourceMaterialsEditor({
  label = "חומרי מקור (PDF)",
  materials,
  onChange,
  maxFiles = 2,
}: {
  label?: string;
  materials: SourceMaterial[];
  onChange: (next: SourceMaterial[]) => void;
  maxFiles?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const atLimit = materials.length >= maxFiles;

  function remove(i: number) {
    onChange(materials.filter((_, j) => j !== i));
  }
  function setDescription(i: number, description: string) {
    onChange(materials.map((m, j) => (j === i ? { ...m, description } : m)));
  }
  async function uploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (materials.length >= maxFiles) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.ok) {
        const { url } = await res.json();
        onChange([...materials, { type: "pdf", url, title: file.name }]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-fg-muted">{label} <span className="text-fg-faint">(עד {maxFiles} קבצים)</span></label>
      {materials.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {materials.map((m, i) => (
            <div key={i} className="bg-surface-2 rounded-lg px-3 py-1.5 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs">
                <span>{m.type === "pdf" ? "📄" : "🔗"}</span>
                {m.url ? (
                  <a href={m.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-fg hover:text-[#1A6B4A] underline">{m.title}</a>
                ) : (
                  <span className="flex-1 truncate text-fg">{m.title}</span>
                )}
                <button type="button" onClick={() => remove(i)} className="text-fg-faint hover:text-red-400" aria-label="מחק">✕</button>
              </div>
              <input type="text" value={m.description ?? ""} onChange={(e) => setDescription(i, e.target.value)}
                placeholder="תיאור קצר (על מה זה?) — אופציונלי"
                className="border border-border rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#1A6B4A] bg-surface" />
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || atLimit}
        className="text-xs text-[#1A6B4A] border border-dashed border-[#1A6B4A]/40 rounded-lg py-1.5 hover:bg-[#F0FAF5] disabled:opacity-50">
        {uploading ? "מעלה..." : atLimit ? `הגעת למקסימום (${maxFiles})` : "📄 העלה PDF"}
      </button>
      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={uploadPdf} />
    </div>
  );
}
