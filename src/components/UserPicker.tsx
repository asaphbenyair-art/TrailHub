"use client";

import { useEffect, useRef, useState } from "react";

interface FoundUser { id: string; name: string | null; email: string; isGuide: boolean }

// Autocomplete picker over existing platform users (search by name/email).
// Only users with an account can be added — no invite-by-email to non-users.
export default function UserPicker({
  placeholder,
  selected,
  onChange,
  max = 3,
  guidesOnly = false,
  managersOnly = false,
}: {
  placeholder?: string;
  selected: string[];        // selected emails
  onChange: (emails: string[]) => void;
  max?: number;
  guidesOnly?: boolean;
  managersOnly?: boolean;    // search only "מנהל טיול" (TRIP_MANAGER) users
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundUser[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const roleParam = managersOnly ? "&role=TRIP_MANAGER" : "";
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}${roleParam}`);
        const data: FoundUser[] = r.ok ? await r.json() : [];
        setResults(guidesOnly ? data.filter((u) => u.isGuide) : data);
        setOpen(true);
      } catch { setResults([]); }
    }, 250);
  }, [query, guidesOnly, managersOnly]);

  function add(u: FoundUser) {
    if (selected.includes(u.email) || selected.length >= max) return;
    onChange([...selected, u.email]);
    setQuery(""); setResults([]); setOpen(false);
  }
  function remove(email: string) {
    onChange(selected.filter((e) => e !== email));
  }

  return (
    <div className="flex flex-col gap-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((email) => (
            <span key={email} className="inline-flex items-center gap-1 bg-[#D6EDE3] text-[#0F5038] rounded-full px-2.5 py-1 text-xs">
              {email}
              <button type="button" onClick={() => remove(email)} className="text-[#0F5038]/60 hover:text-red-500">✕</button>
            </span>
          ))}
        </div>
      )}
      {selected.length < max && (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder={placeholder ?? "חפש לפי שם או אימייל..."}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
          />
          {open && results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
              {results.map((u) => (
                <button key={u.id} type="button" onClick={() => add(u)}
                  className="w-full text-right px-3 py-2 hover:bg-surface-2 flex items-center justify-between">
                  <span className="text-sm text-fg">{u.name ?? u.email}{u.isGuide && <span className="text-[10px] text-[#1A6B4A] mr-1">· מדריך</span>}</span>
                  <span className="text-[10px] text-fg-faint">{u.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {query.trim().length >= 2 && results.length === 0 && (
        <p className="text-[11px] text-fg-faint">לא נמצאו משתמשים. ניתן להוסיף רק משתמשים רשומים.</p>
      )}
    </div>
  );
}
