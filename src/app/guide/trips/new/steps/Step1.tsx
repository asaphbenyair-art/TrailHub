"use client";

import { useRef, useState } from "react";
import { WizardData } from "../types";

const REGIONS = ["גליל עליון", "גליל תחתון", "כרמל", "ירושלים", "שפלה", "נגב", "ערבה", "גולן", "עמק יזרעאל"];

interface Props {
  data: WizardData;
  onChange: (field: keyof WizardData, value: string | string[]) => void;
}

async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("upload failed");
  const { url } = await res.json();
  return url as string;
}

function ImageUpload({
  label,
  preview,
  onFile,
  multiple = false,
}: {
  label: string;
  preview?: string | string[];
  onFile: (files: File[]) => void;
  multiple?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const previews = Array.isArray(preview) ? preview : preview ? [preview] : [];

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      onFile(files);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length) onFile(files);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>

      {previews.length > 0 ? (
        <div className={`grid gap-2 ${multiple ? "grid-cols-3" : "grid-cols-1"}`}>
          {previews.map((src, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden bg-gray-100" style={{ height: multiple ? 80 : 160 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onFile([])}
                className="absolute top-1 left-1 bg-black/50 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-black/70"
              >
                ✕
              </button>
            </div>
          ))}
          {multiple && previews.length < 8 && (
            <button
              type="button"
              onClick={() => ref.current?.click()}
              className="rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-2xl hover:border-[#1A6B4A] transition-colors"
              style={{ height: 80 }}
            >
              +
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => !uploading && ref.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border border-dashed border-gray-200 rounded-lg p-5 text-center text-gray-400 text-sm cursor-pointer hover:border-[#1A6B4A] hover:bg-gray-50 transition-colors select-none"
        >
          {uploading ? (
            <div className="text-[#1A6B4A] text-sm">מעלה...</div>
          ) : (
            <>
              <div className="text-2xl mb-1">🖼</div>
              <div>גרור תמונה לכאן או <span className="text-[#1A6B4A] font-medium">לחץ להעלאה</span></div>
              <div className="text-xs text-gray-300 mt-1">JPG, PNG, WEBP — עד 10MB</div>
            </>
          )}
        </div>
      )}

      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

export default function Step1({ data, onChange }: Props) {
  const [mainPreview, setMainPreview] = useState<string>(data.mainImagePreview ?? "");
  const [extraPreviews, setExtraPreviews] = useState<string[]>(data.extraImagePreviews ?? []);
  const [uploading, setUploading] = useState(false);

  async function handleMainImage(files: File[]) {
    if (!files.length) {
      setMainPreview("");
      onChange("mainImagePreview", "");
      return;
    }
    // Show local preview immediately
    const localUrl = URL.createObjectURL(files[0]);
    setMainPreview(localUrl);
    // Upload in background; replace preview with server URL on success
    setUploading(true);
    try {
      const serverUrl = await uploadFile(files[0]);
      setMainPreview(serverUrl);
      onChange("mainImagePreview", serverUrl);
    } catch {
      // Keep blob preview visible; page.tsx will re-upload on save
      onChange("mainImagePreview", localUrl);
    } finally {
      setUploading(false);
    }
  }

  async function handleExtraImages(files: File[]) {
    if (!files.length) return;
    const localUrls = files.map((f) => URL.createObjectURL(f));
    const next = [...extraPreviews, ...localUrls].slice(0, 8);
    setExtraPreviews(next);
    setUploading(true);
    try {
      const serverUrls = await Promise.all(files.map((f) => uploadFile(f)));
      const nextServer = [...extraPreviews, ...serverUrls].slice(0, 8);
      setExtraPreviews(nextServer);
      onChange("extraImagePreviews", nextServer);
    } catch {
      onChange("extraImagePreviews", next);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-3 mb-1">
        פרטים בסיסיים
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">שם הטיול</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="למשל: טיול נחל פולג — מעיינות ובריכות"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">תיאור</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="תיאור חופשי — מה רואים, מה עושים, מה מיוחד..."
          rows={3}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">תאריך</label>
          <input
            type="date"
            value={data.date}
            onChange={(e) => onChange("date", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">שעת מפגש</label>
          <input
            type="time"
            value={data.startTime}
            onChange={(e) => onChange("startTime", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
            dir="ltr"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">איזור בארץ</label>
        <select
          value={data.region}
          onChange={(e) => onChange("region", e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] bg-white"
        >
          <option value="">בחר איזור...</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">נקודת מפגש</label>
        <input
          type="text"
          value={data.meetingPoint}
          onChange={(e) => onChange("meetingPoint", e.target.value)}
          placeholder="הקלד כתובת או שם מקום..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
        />
        <p className="text-xs text-gray-400 mt-1">ניתן להקליד כתובת מדויקת או שם מקום מוכר</p>
      </div>

      <ImageUpload
        label="תמונה ראשית"
        preview={mainPreview}
        onFile={handleMainImage}
      />

      <ImageUpload
        label="תמונות נוספות (עד 8)"
        preview={extraPreviews}
        onFile={handleExtraImages}
        multiple
      />
    </div>
  );
}
