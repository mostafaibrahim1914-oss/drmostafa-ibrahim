import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Lang = "ar" | "en";
export type Stage = "prep3" | "sec1" | "sec2" | "sec3";
export type Profile = Tables<"profiles">;

export const STAGES: Stage[] = ["sec1", "sec2", "sec3", "prep3"];
export const STAGE_LABEL: Record<Stage, { ar: string; en: string }> = {
  sec1: { ar: "الصف الأول الثانوي", en: "1st Secondary" },
  sec2: { ar: "الصف الثاني الثانوي", en: "2nd Secondary" },
  sec3: { ar: "الصف الثالث الثانوي", en: "3rd Secondary" },
  prep3: { ar: "الصف الثالث الإعدادي", en: "3rd Preparatory" },
};

export const LOGO_URL = "/__l5e/assets-v1/1ac5ec57-2fb1-4eeb-82c9-28c4e8d19078/logo-eagle.png";

/** Students sign in with their WhatsApp number; it maps to an internal login id. */
export function loginIdFromInput(input: string) {
  const v = input.trim();
  if (v.includes("@")) return v.toLowerCase();
  const digits = v.replace(/\D/g, "");
  return `${digits}@students.researcher.app`;
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  tx: (ar: string, en: string) => string;
  dark: boolean;
  toggleDark: () => void;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [dark, setDark] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const l = localStorage.getItem("lang") as Lang | null;
    const d = localStorage.getItem("theme");
    if (l) setLangState(l);
    if (d) setDark(d === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const loadUser = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", s.user.id),
    ]);
    setProfile(p ?? null);
    setIsAdmin(!!r?.some((x) => x.role === "admin"));
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => loadUser(s), 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadUser(data.session);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadUser]);

  const value: Ctx = {
    lang,
    setLang: (l) => {
      setLangState(l);
      localStorage.setItem("lang", l);
    },
    tx: (ar, en) => (lang === "ar" ? ar : en),
    dark,
    toggleDark: () =>
      setDark((d) => {
        localStorage.setItem("theme", d ? "light" : "dark");
        return !d;
      }),
    session,
    profile,
    isAdmin,
    loading,
    refreshProfile: () => loadUser(session),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}

/** Private storage: resolve a stored path to a temporary signed URL. */
const urlCache = new Map<string, string>();
export async function signedUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const key = bucket + ":" + path;
  if (urlCache.has(key)) return urlCache.get(key)!;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 6);
  if (data?.signedUrl) urlCache.set(key, data.signedUrl);
  return data?.signedUrl ?? null;
}

export function useSignedUrl(bucket: string, path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    signedUrl(bucket, path).then((u) => on && setUrl(u));
    return () => {
      on = false;
    };
  }, [bucket, path]);
  return url;
}

export async function uploadFile(bucket: string, folder: string, file: File) {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}
