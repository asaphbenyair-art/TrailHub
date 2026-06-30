"use client";

import { useRef, useState } from "react";
import { SourceMaterial } from "../types";

export default function SourceMaterialsEditor({
  label = "חומרי מקור (PDF / קישורים)",
  materials,
  onChange,
}: {
  label?: string;
  materials: SourceMaterial[];
  onChange: (next: SourceMaterial[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  function addLink() {
    if (!linkUrl.trim()) return;
    onChange([...materials, { type: "link", url: linkUrl.trim(), title: linkTitle.trim() || linkUrl.trim() }]);
    setLinkTitle(""); setLinkUrl("");
  }
  function remove(i: number) {
    onChange(materials.filter((_, j) => j !== i));
  }
  function setDescription(i: number, description: string) {
    onChange(materials.map((m, j) => (j === i ? { ...m, description } : m)));
  }
  async function uploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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
      <label className="text-xs font-medium text-gray-500">{label}</label>
      {materials.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {materials.map((m, i) => (
            <div key={i} className="bg-gray-50 rounded-lg px-3 py-1.5 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs">
                <span>{m.type === "pdf" ? "📄" : "🔗"}</span>
                <span className="flex-1 truncate text-gray-700">{m.title}</span>
                <button type="button" onClick={() => remove(i)} className="text-gray-300 hover:text-red-400">✕</button>
              </div>
              <input type="text" value={m.description ?? ""} onChange={(e) => setDescription(i, e.target.value)}
                placeholder="תיאור קצר (על מה זה?) — אופציונלי"
                className="border border-gray-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#1A6B4A] bg-white" />
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input type="text" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="כותרת"
          className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1A6B4A]" />
        <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="קישור (https://...)" dir="ltr"
          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1A6B4A]" />
        <button type="button" onClick={addLink} className="px-2.5 py-1.5 bg-[#1A6B4A] text-white rounded-lg text-xs whitespace-nowrap">+ קישור</button>
      </div>
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
        className="text-xs text-[#1A6B4A] border border-dashed border-[#1A6B4A]/40 rounded-lg py-1.5 hover:bg-[#F0FAF5] disabled:opacity-60">
        {uploading ? "מעלה..." : "📄 העלה PDF"}
      </button>
      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={uploadPdf} />
    </div>
  );
}
