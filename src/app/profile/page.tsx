"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";
import { useCalendarMode } from "@/components/CalendarModeProvider";
import ModeIndicator from "@/components/ModeIndicator";
import { SignOutButton } from "@/components/SignOutButton";

const REGIONS = ["גליל עליון", "גליל תחתון", "כרמל", "ירושלים", "שפלה", "נגב", "ערבה", "גולן", "עמק יזרעאל"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "EXTREME"];
const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: "קל", MEDIUM: "בינוני", HARD: "קשה", EXTREME: "קיצוני",
};
const FITNESS_OPTIONS = [
  { value: "", label: "לא צוין" },
  { value: "low", label: "נמוך" },
  { value: "medium", label: "בינוני" },
  { value: "high", label: "גבוה" },
  { value: "excellent", label: "מצוין" },
];

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  gender: string | null;
  birthYear: number | null;
  bio: string | null;
  slogan: string | null;
  phone: string | null;
  fitnessLevel: string | null;
  preferredRegions: string[];
  preferredDifficulties: string[];
  role: string;
  hasPassword: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { status } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"info" | "prefs" | "guide" | "password">("info");

  // Guide profile fields (only for GUIDE role)
  const [gHeadline, setGHeadline] = useState("");
  const [gBio, setGBio] = useState("");
  const [gYears, setGYears] = useState("");
  const [gTraining, setGTraining] = useState("");
  const [gRegions, setGRegions] = useState("");
  const [gInterests, setGInterests] = useState("");
  const [gYoutube, setGYoutube] = useState("");
  const [gPodcast, setGPodcast] = useState("");

  // Info fields
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [bio, setBio] = useState("");
  const [slogan, setSlogan] = useState("");
  const { mode: calMode, setProfileMode } = useCalendarMode();
  const [phone, setPhone] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("");

  // Preferences
  const [prefRegions, setPrefRegions] = useState<string[]>([]);
  const [prefDiffs, setPrefDiffs] = useState<string[]>([]);

  // Password
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // Avatar upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: UserProfile) => {
        setProfile(data);
        setName(data.name ?? "");
        setGender(data.gender ?? "");
        setBirthYear(data.birthYear ? String(data.birthYear) : "");
        setBio(data.bio ?? "");
        setSlogan(data.slogan ?? "");
        setPhone(data.phone ?? "");
        setFitnessLevel(data.fitnessLevel ?? "");
        setPrefRegions(data.preferredRegions ?? []);
        setPrefDiffs(data.preferredDifficulties ?? []);
        setLoading(false);
        if (data.role === "GUIDE") {
          fetch("/api/guide/profile").then((r) => r.ok ? r.json() : null).then((g) => {
            if (!g) return;
            setGHeadline(g.headline ?? "");
            setGBio(g.bio ?? "");
            setGYears(g.yearsActive ? String(g.yearsActive) : "");
            setGTraining(g.trainingInstitution ?? "");
            setGRegions((g.specialtyRegions ?? []).join(", "));
            setGInterests((g.interests ?? []).join(", "));
            setGYoutube(g.youtubeUrl ?? "");
            setGPodcast(g.podcastUrl ?? "");
          }).catch(() => {});
        }
      })
      .catch(() => setLoading(false));
  }, [status, router]);

  async function handleSaveGuide() {
    setSaving(true);
    setSaveMsg("");
    const res = await fetch("/api/guide/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: gHeadline, bio: gBio, yearsActive: gYears ? Number(gYears) : null,
        trainingInstitution: gTraining,
        specialtyRegions: gRegions.split(",").map((s) => s.trim()).filter(Boolean),
        interests: gInterests.split(",").map((s) => s.trim()).filter(Boolean),
        youtubeUrl: gYoutube, podcastUrl: gPodcast,
      }),
    });
    setSaving(false);
    if (res.ok) { setSaveMsg("פרופיל המדריך נשמר ✓"); setTimeout(() => router.back(), 800); }
    else setSaveMsg("שגיאה בשמירה");
  }

  async function handleSaveInfo() {
    setSaving(true);
    setSaveMsg("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, gender, birthYear: birthYear ? Number(birthYear) : null, bio, slogan, phone, fitnessLevel }),
    });
    setSaving(false);
    if (res.ok) { setSaveMsg("השינויים נשמרו ✓"); setTimeout(() => router.back(), 800); }
    else setSaveMsg("שגיאה בשמירה");
  }

  async function handleSavePrefs() {
    setSaving(true);
    setSaveMsg("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredRegions: prefRegions, preferredDifficulties: prefDiffs }),
    });
    setSaving(false);
    if (res.ok) { setSaveMsg("ההעדפות נשמרו ✓"); setTimeout(() => router.back(), 800); }
    else setSaveMsg("שגיאה בשמירה");
  }

  async function handleChangePassword() {
    setPwdMsg("");
    if (newPwd !== confirmPwd) { setPwdMsg("הסיסמאות אינן תואמות"); return; }
    if (newPwd.length < 6) { setPwdMsg("סיסמה חייבת להיות לפחות 6 תווים"); return; }
    setSaving(true);
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    });
    setSaving(false);
    if (res.ok) {
      setPwdMsg("הסיסמה שונתה בהצלחה");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } else {
      const d = await res.json();
      setPwdMsg(d.error ?? "שגיאה בשינוי סיסמה");
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const up = await fetch("/api/upload", { method: "POST", body: form });
      if (up.ok) {
        const { url } = await up.json();
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: url }),
        });
        setProfile((p) => p ? { ...p, image: url } : p);
      }
    } finally {
      setAvatarUploading(false);
    }
  }

  function toggleArr(arr: string[], val: string, setter: (a: string[]) => void) {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-fg-faint" dir="rtl">
        טוען...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-8 px-4 pb-24" dir="rtl">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-fg">הפרופיל שלי</h1>
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            מצב תצוגה
            <ThemeToggle />
          </div>
        </div>

        {/* Avatar */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-5 mb-4 flex items-center gap-4">
          <div className="relative">
            {profile?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.image}
                alt=""
                className="w-16 h-16 rounded-full object-cover border-2 border-[#1A6B4A]/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#D6EDE3] flex items-center justify-center text-2xl text-[#1A6B4A]">
                {(profile?.name ?? "?")[0]}
              </div>
            )}
            {avatarUploading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <span className="text-white text-xs">...</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-fg">{profile?.name ?? "—"}</span>
            <span className="text-xs text-fg-faint">{profile?.email}</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs text-[#1A6B4A] font-medium mt-1"
            >
              החלף תמונה
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex border-b border-border">
            {([["info", "פרטים אישיים"], ["prefs", "העדפות טיולים"], ...(profile?.role === "GUIDE" ? [["guide", "פרופיל מדריך"] as const] : []), ...(profile?.hasPassword ? [["password", "שינוי סיסמה"] as const] : [])] as const).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setActiveTab(tab); setSaveMsg(""); setPwdMsg(""); }}
                className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-[#1A6B4A] text-[#1A6B4A] bg-surface"
                    : "border-transparent text-fg-faint hover:text-fg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* Personal Info */}
            {activeTab === "info" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-fg-muted">שם מלא</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-fg-muted">מגדר</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] bg-surface"
                    >
                      <option value="">לא צוין</option>
                      <option value="male">זכר</option>
                      <option value="female">נקבה</option>
                      <option value="other">אחר</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-fg-muted">שנת לידה</label>
                    <input
                      type="number"
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      placeholder="1990"
                      min="1920"
                      max="2010"
                      className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-fg-muted">טלפון</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="05X-XXXXXXX"
                      className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-fg-muted">רמת כושר</label>
                    <select
                      value={fitnessLevel}
                      onChange={(e) => setFitnessLevel(e.target.value)}
                      className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] bg-surface"
                    >
                      {FITNESS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-fg-muted">ביוגרפיה קצרה</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="ספר/י קצת על עצמך..."
                    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-fg-muted">סלוגן אישי <span className="text-fg-faint">(אופציונלי)</span></label>
                  <input
                    type="text"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    maxLength={60}
                    placeholder="משפט קצר שמייצג אותך — מוצג לרשומים אחרים בטיול"
                    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-fg-muted">לוח שנה</label>
                  <div className="inline-flex bg-surface-2 rounded-full p-0.5 self-start">
                    {([["gregorian", "לוח שנה לועזי"], ["hebrew", "לוח שנה עברי"]] as const).map(([v, label]) => (
                      <button key={v} type="button" onClick={() => setProfileMode(v)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          calMode === v ? "bg-[#1A6B4A] text-white" : "text-fg-muted"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {saveMsg && (
                  <p className={`text-xs text-center ${saveMsg.includes("שגיאה") ? "text-red-500" : "text-[#1A6B4A]"}`}>
                    {saveMsg}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSaveInfo}
                  disabled={saving}
                  className="w-full py-2.5 bg-[#1A6B4A] text-white text-sm rounded-xl font-medium hover:bg-[#155a3e] transition-colors disabled:opacity-60"
                >
                  {saving ? "שומר..." : "שמור שינויים"}
                </button>
              </>
            )}

            {/* Hiking Preferences */}
            {activeTab === "prefs" && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-fg-muted">אזורים מועדפים</label>
                  <div className="flex flex-wrap gap-2">
                    {REGIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleArr(prefRegions, r, setPrefRegions)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          prefRegions.includes(r)
                            ? "border-[#1A6B4A] bg-[#D6EDE3] text-[#1A6B4A]"
                            : "border-border text-fg-muted hover:border-border"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-fg-muted">רמות קושי מועדפות</label>
                  <div className="flex flex-wrap gap-2">
                    {DIFFICULTIES.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleArr(prefDiffs, d, setPrefDiffs)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          prefDiffs.includes(d)
                            ? "border-[#1A6B4A] bg-[#D6EDE3] text-[#1A6B4A]"
                            : "border-border text-fg-muted hover:border-border"
                        }`}
                      >
                        {DIFFICULTY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-fg-faint bg-surface-2 rounded-lg p-2.5 leading-relaxed">
                  💡 ההעדפות משמשות כברירת מחדל לפילטרים בחיפוש בלבד — הן לעולם לא חוסמות או מסתירות ממך טיולים אחרים. תמיד תוכל לשנות או לנקות את הפילטרים ולראות את הכל.
                </p>

                {saveMsg && (
                  <p className={`text-xs text-center ${saveMsg.includes("שגיאה") ? "text-red-500" : "text-[#1A6B4A]"}`}>
                    {saveMsg}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSavePrefs}
                  disabled={saving}
                  className="w-full py-2.5 bg-[#1A6B4A] text-white text-sm rounded-xl font-medium hover:bg-[#155a3e] transition-colors disabled:opacity-60"
                >
                  {saving ? "שומר..." : "שמור העדפות"}
                </button>
              </>
            )}

            {/* Guide profile */}
            {activeTab === "guide" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-fg-muted">כותרת (למשל: מדריך טיולים מוסמך)</label>
                  <input type="text" value={gHeadline} onChange={(e) => setGHeadline(e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-fg-muted">ביוגרפיה</label>
                  <textarea value={gBio} onChange={(e) => setGBio(e.target.value)} rows={3}
                    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A] resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-fg-muted">שנות ניסיון</label>
                    <input type="number" value={gYears} onChange={(e) => setGYears(e.target.value)} dir="ltr"
                      className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-fg-muted">מוסד הכשרה</label>
                    <input type="text" value={gTraining} onChange={(e) => setGTraining(e.target.value)}
                      className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-fg-muted">אזורי התמחות (מופרדים בפסיק)</label>
                  <input type="text" value={gRegions} onChange={(e) => setGRegions(e.target.value)} placeholder="גליל, כרמל, ירושלים"
                    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-fg-muted">תחומי עניין (מופרדים בפסיק)</label>
                  <input type="text" value={gInterests} onChange={(e) => setGInterests(e.target.value)} placeholder="נחלים, היסטוריה, בוטניקה"
                    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-fg-muted">קישור יוטיוב</label>
                    <input type="url" value={gYoutube} onChange={(e) => setGYoutube(e.target.value)} dir="ltr"
                      className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-fg-muted">קישור פודקאסט</label>
                    <input type="url" value={gPodcast} onChange={(e) => setGPodcast(e.target.value)} dir="ltr"
                      className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]" />
                  </div>
                </div>
                {saveMsg && <p className={`text-xs text-center ${saveMsg.includes("שגיאה") ? "text-red-500" : "text-[#1A6B4A]"}`}>{saveMsg}</p>}
                <button type="button" onClick={handleSaveGuide} disabled={saving}
                  className="w-full py-2.5 bg-[#1A6B4A] text-white text-sm rounded-xl font-medium hover:bg-[#155a3e] transition-colors disabled:opacity-60">
                  {saving ? "שומר..." : "שמור פרופיל מדריך"}
                </button>
              </>
            )}

            {/* Password Change */}
            {activeTab === "password" && (
              <>
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  className="self-end text-[11px] text-fg-muted hover:text-[#1A6B4A] flex items-center gap-1">
                  {showPwd ? "🙈 הסתר סיסמאות" : "👁 הצג סיסמאות"}
                </button>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-fg-muted">סיסמה נוכחית</label>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    placeholder="הזן סיסמה נוכחית"
                    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                    dir="ltr"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-fg-muted">סיסמה חדשה</label>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="לפחות 6 תווים"
                    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                    dir="ltr"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-fg-muted">אימות סיסמה חדשה</label>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="חזור על הסיסמה החדשה"
                    className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A6B4A]"
                    dir="ltr"
                  />
                </div>

                {pwdMsg && (
                  <p className={`text-xs text-center ${pwdMsg.includes("שגיאה") || pwdMsg.includes("שגויה") || pwdMsg.includes("אינן") ? "text-red-500" : "text-[#1A6B4A]"}`}>
                    {pwdMsg}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="w-full py-2.5 bg-[#1A6B4A] text-white text-sm rounded-xl font-medium hover:bg-[#155a3e] transition-colors disabled:opacity-60"
                >
                  {saving ? "משנה..." : "שנה סיסמה"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Account actions — mode switch + sign out */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-5 flex items-center justify-between">
          <span className="text-sm font-medium text-fg">חשבון</span>
          <div className="flex items-center gap-3">
            <ModeIndicator />
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
