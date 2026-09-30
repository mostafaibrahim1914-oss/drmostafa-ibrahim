import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { ExternalLink, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { STAGE_LABEL, type Stage, uploadFile, useApp, useSignedUrl } from "@/lib/app-context";

export const db = supabase as any;

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border/70 bg-card p-5 shadow-sm ${className}`}>{children}</div>;
}

export function Avatar({ path, size = 48 }: { path?: string | null; size?: number }) {
  const url = useSignedUrl("avatars", path);
  return (
    <div className="shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-primary/40" style={{ width: size, height: size }}>
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </div>
  );
}

export function Guard({ admin, children }: { admin?: boolean; children: ReactNode }) {
  const { session, isAdmin, profile, loading, tx } = useApp();
  if (loading) return <div className="p-20 text-center text-muted-foreground">…</div>;
  if (!session) return <Navigate to="/auth" search={{ mode: "login" } as any} />;
  if (admin && !isAdmin) return <Navigate to="/student" />;
  if (!admin && isAdmin) return <Navigate to="/admin" />;
  if (!admin && profile?.status !== "approved")
    return (
      <div className="mx-auto max-w-lg p-20 text-center">
        <h2 className="text-2xl font-bold">
          {profile?.status === "blocked" ? tx("تم إيقاف حسابك", "Your account is blocked") : tx("حسابك في انتظار موافقة الأدمن", "Awaiting admin approval")}
        </h2>
        <p className="mt-3 text-muted-foreground">{tx("تواصل مع الأستاذ للتفعيل.", "Contact the teacher to activate.")}</p>
      </div>
    );
  return <>{children}</>;
}

export function Leaderboard({ stage, top }: { stage: Stage; top?: number }) {
  const { tx, lang } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    db.rpc("leaderboard", { _stage: stage }).then(({ data }: any) => setRows(data ?? []));
  }, [stage]);
  const list = top ? rows.slice(0, top) : rows;
  return (
    <Card>
      <h3 className="mb-3 font-bold text-primary">🏆 {tx("الأوائل", "Top students")} — {STAGE_LABEL[stage][lang]}</h3>
      {list.length === 0 && <p className="text-sm text-muted-foreground">{tx("لا توجد نتائج بعد", "No results yet")}</p>}
      {list.map((r, i) => (
        <div key={r.user_id} className="flex items-center gap-3 border-b border-border/40 py-2 last:border-0">
          <span className="w-6 text-center font-black text-primary">{i + 1}</span>
          <Avatar path={r.avatar_url} size={32} />
          <span className="flex-1 font-medium">{r.full_name}</span>
          <span className="text-sm text-muted-foreground">{r.score}/{r.total}</span>
          <span className="font-bold">{r.percent}%</span>
        </div>
      ))}
    </Card>
  );
}

export function AttemptsReport({ userId }: { userId: string }) {
  const { tx } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    db.from("attempts").select("score,total,submitted_at,exams(title)").eq("user_id", userId).order("submitted_at", { ascending: false })
      .then(({ data }: any) => setRows(data ?? []));
  }, [userId]);
  const s = rows.reduce((a, r) => a + r.score, 0), t = rows.reduce((a, r) => a + r.total, 0);
  return (
    <div>
      <p className="mb-2 font-bold">{tx("المستوى العام", "Overall")}: {t ? Math.round((100 * s) / t) : 0}% ({rows.length} {tx("امتحان", "exams")})</p>
      {rows.map((r, i) => (
        <div key={i} className="flex justify-between border-b border-border/40 py-1.5 text-sm">
          <span>{r.exams?.title}</span><span className="font-bold">{r.score}/{r.total}</span>
        </div>
      ))}
    </div>
  );
}

export function ProfileEditor() {
  const { profile, session, tx, refreshProfile } = useApp();
  const [f, setF] = useState({ full_name: "", whatsapp: "", parent_phone: "", address: "" });
  const [pw, setPw] = useState("");
  useEffect(() => {
    if (profile) setF({ full_name: profile.full_name, whatsapp: profile.whatsapp, parent_phone: profile.parent_phone, address: profile.address });
  }, [profile]);
  if (!session) return null;
  const save = async () => {
    const { error } = await db.from("profiles").update(f).eq("id", session.user.id);
    error ? toast.error(error.message) : (toast.success(tx("تم الحفظ", "Saved")), refreshProfile());
  };
  const avatar = async (file?: File) => {
    if (!file) return;
    try {
      const p = await uploadFile("avatars", session.user.id, file);
      await db.from("profiles").update({ avatar_url: p }).eq("id", session.user.id);
      await refreshProfile();
      toast.success(tx("تم تحديث الصورة", "Photo updated"));
    } catch (e: any) { toast.error(e.message); }
  };
  const changePw = async () => {
    if (pw.length < 6) return toast.error(tx("6 أحرف على الأقل", "Min 6 chars"));
    const { error } = await supabase.auth.updateUser({ password: pw });
    error ? toast.error(error.message) : (toast.success(tx("تم تغيير كلمة المرور", "Password changed")), setPw(""));
  };
  const fields: [keyof typeof f, string, string][] = [
    ["full_name", "الاسم", "Name"], ["whatsapp", "واتساب", "WhatsApp"], ["parent_phone", "رقم ولي الأمر", "Parent phone"], ["address", "العنوان", "Address"],
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <div className="mb-4 flex items-center gap-4">
          <Avatar path={profile?.avatar_url} size={72} />
          <Label className="cursor-pointer text-primary underline">
            {tx("تغيير الصورة", "Change photo")}
            <input type="file" accept="image/*" hidden onChange={(e) => avatar(e.target.files?.[0])} />
          </Label>
        </div>
        {fields.map(([k, ar, en]) => (
          <div key={k} className="mb-3"><Label>{tx(ar, en)}</Label><Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
        ))}
        <Button onClick={save}>{tx("حفظ", "Save")}</Button>
      </Card>
      <Card>
        <Label>{tx("كلمة مرور جديدة", "New password")}</Label>
        <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="mb-3" />
        <Button onClick={changePw}>{tx("تغيير", "Change")}</Button>
      </Card>
    </div>
  );
}

export function VideoPlayer({ v }: { v: any }) {
  const up = useSignedUrl("videos", v.source === "upload" ? v.url : null);
  if (v.source === "upload") return up ? <div className="overflow-hidden rounded-lg border bg-navy-deep shadow-xl"><video src={up} controls controlsList="nodownload" className="aspect-video w-full bg-navy-deep object-contain" /></div> : null;
  const yt = v.url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/)?.[1];
  if (v.source === "youtube" && yt)
    return <div className="overflow-hidden rounded-lg border bg-navy-deep shadow-xl"><iframe title={v.title} className="aspect-video w-full" src={`https://www.youtube-nocookie.com/embed/${yt}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>;
  return <Button asChild className="w-full"><a href={v.url} target="_blank" rel="noreferrer"><Play className="h-4 w-4" />{useApp().tx("فتح المحاضرة", "Open lecture")}<ExternalLink className="h-4 w-4" /></a></Button>;
}

export function QImage({ path }: { path?: string | null }) {
  const url = useSignedUrl("media", path);
  return url ? <img src={url} alt="" className="my-2 max-h-72 rounded-lg" /> : null;
}
