import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/site/Header";
import { Bubbles } from "@/components/site/Bubbles";
import { supabase } from "@/integrations/supabase/client";
import { LOGO_URL, STAGES, STAGE_LABEL, loginIdFromInput, useApp, type Stage } from "@/lib/app-context";

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => z.object({ mode: z.enum(["login", "signup"]).optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | Researcher" },
      { name: "description", content: "سجّل دخولك أو أنشئ حساباً جديداً على منصة Researcher." },
      { property: "og:title", content: "Sign in | Researcher" },
      { property: "og:description", content: "Sign in or create an account on Researcher." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const { tx, lang, session, profile, isAdmin, loading } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">(mode ?? "login");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ id: "", password: "", full_name: "", whatsapp: "", parent_phone: "", address: "", stage: "" as Stage | "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  useEffect(() => setTab(mode ?? "login"), [mode]);

  useEffect(() => {
    if (loading || !session) return;
    if (isAdmin) navigate({ to: "/admin", replace: true });
    else if (profile?.status === "approved") navigate({ to: "/student", replace: true });
  }, [loading, session, profile, isAdmin, navigate]);

  const pending = session && !isAdmin && profile && profile.status !== "approved";

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginIdFromInput(f.id), password: f.password });
    setBusy(false);
    if (error) toast.error(tx("بيانات الدخول غير صحيحة", "Invalid credentials"));
  }

  async function signup(e: React.FormEvent) {
    e.preventDefault();
    const wa = f.whatsapp.replace(/\D/g, "");
    if (f.full_name.trim().split(/\s+/).length < 3) return toast.error(tx("اكتب الاسم الثلاثي", "Enter your full triple name"));
    if (wa.length < 10) return toast.error(tx("رقم واتساب غير صحيح", "Invalid WhatsApp number"));
    if (f.parent_phone.replace(/\D/g, "").length < 10) return toast.error(tx("رقم ولي الأمر غير صحيح", "Invalid parent number"));
    if (!f.stage) return toast.error(tx("اختر المرحلة", "Choose your stage"));
    if (f.password.length < 6) return toast.error(tx("كلمة المرور 6 أحرف على الأقل", "Password must be 6+ characters"));
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: loginIdFromInput(wa),
      password: f.password,
      options: {
        data: { full_name: f.full_name.trim(), whatsapp: wa, parent_phone: f.parent_phone.trim(), address: f.address.trim(), stage: f.stage },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("registered") ? tx("هذا الرقم مسجل بالفعل", "This number is already registered") : error.message);
      return;
    }
    toast.success(tx("تم إنشاء الحساب! بانتظار موافقة المدرس", "Account created! Awaiting approval"));
    return;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-10">
        <Bubbles count={12} />
        <div className="relative w-full max-w-md rounded-3xl border bg-card/90 p-8 shadow-gold backdrop-blur">
          <img src={LOGO_URL} alt="" className="mx-auto h-20 w-20 rounded-full" />
          {pending ? (
            <div className="mt-6 text-center">
              <h1 className="text-2xl font-black">
                {profile.status === "blocked" ? tx("الحساب موقوف", "Account suspended") : tx("حسابك قيد المراجعة", "Account under review")}
              </h1>
              <p className="mt-3 text-muted-foreground">
                {profile.status === "blocked"
                  ? tx("تم إيقاف حسابك. تواصل مع المدرس.", "Your account was suspended. Contact the teacher.")
                  : tx("سيتم تفعيل حسابك بعد موافقة الأستاذ مصطفى. حاول الدخول لاحقاً.", "Your account will be activated after approval. Please check back later.")}
              </p>
              <Button className="mt-6" variant="outline" onClick={() => supabase.auth.signOut()}>
                {tx("تسجيل الخروج", "Sign out")}
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 rounded-xl bg-muted p-1">
                {(["login", "signup"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`rounded-lg py-2 text-sm font-bold transition ${tab === t ? "bg-gold-gradient text-primary-foreground" : "text-muted-foreground"}`}>
                    {t === "login" ? tx("دخول", "Sign in") : tx("حساب جديد", "Sign up")}
                  </button>
                ))}
              </div>
              {tab === "login" ? (
                <form onSubmit={login} className="mt-6 space-y-4">
                  <div>
                    <Label>{tx("رقم الواتساب أو البريد", "WhatsApp number or email")}</Label>
                    <Input value={f.id} onChange={set("id")} required dir="ltr" />
                  </div>
                  <div>
                    <Label>{tx("كلمة المرور", "Password")}</Label>
                    <Input type="password" value={f.password} onChange={set("password")} required dir="ltr" />
                  </div>
                  <Button className="w-full bg-gold-gradient" disabled={busy}>{tx("دخول", "Sign in")}</Button>
                </form>
              ) : (
                <form onSubmit={signup} className="mt-6 space-y-3">
                  <div><Label>{tx("الاسم الثلاثي", "Full name (3 parts)")}</Label><Input value={f.full_name} onChange={set("full_name")} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>{tx("رقم واتساب", "WhatsApp")}</Label><Input value={f.whatsapp} onChange={set("whatsapp")} required dir="ltr" inputMode="tel" /></div>
                    <div><Label>{tx("رقم ولي الأمر", "Parent phone")}</Label><Input value={f.parent_phone} onChange={set("parent_phone")} required dir="ltr" inputMode="tel" /></div>
                  </div>
                  <div><Label>{tx("العنوان", "Address")}</Label><Input value={f.address} onChange={set("address")} required /></div>
                  <div>
                    <Label>{tx("المرحلة الدراسية", "Grade")}</Label>
                    <Select value={f.stage} onValueChange={(v) => setF({ ...f, stage: v as Stage })}>
                      <SelectTrigger><SelectValue placeholder={tx("اختر", "Choose")} /></SelectTrigger>
                      <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s][lang]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>{tx("كلمة المرور", "Password")}</Label><Input type="password" value={f.password} onChange={set("password")} required dir="ltr" /></div>
                  <Button className="w-full bg-gold-gradient" disabled={busy}>{tx("إنشاء الحساب", "Create account")}</Button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
