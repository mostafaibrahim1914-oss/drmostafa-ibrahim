import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, BookOpen, CircleUserRound, GraduationCap, LayoutDashboard, LockKeyhole, Play, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { DashboardShell } from "@/components/site/DashboardShell";
import { AttemptsReport, Card, db, Guard, Leaderboard, ProfileEditor, QImage, VideoPlayer } from "@/components/site/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STAGE_LABEL, useApp } from "@/lib/app-context";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "لوحة الطالب | Researcher" },
      { name: "description", content: "فيديوهات وامتحانات وتقارير الطالب على منصة Researcher." },
      { property: "og:title", content: "Student Dashboard | Researcher" },
      { property: "og:description", content: "Videos, exams and reports for students." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <Guard><Student /></Guard>
    </div>
  ),
});

function Student() {
  const { tx, profile, lang, session } = useApp();
  const stage = profile?.stage;
  const [tab, setTab] = useState("content");
  if (!stage || !session) return null;
  const items = [
    { value: "content", label: tx("الرئيسية والمحتوى", "Home & content"), icon: LayoutDashboard },
    { value: "report", label: tx("تقرير الأداء", "Performance"), icon: BarChart3 },
    { value: "top", label: tx("المتصدرون", "Leaderboard"), icon: Trophy },
    { value: "me", label: tx("حسابي", "My account"), icon: CircleUserRound },
  ];
  return (
    <DashboardShell items={items} active={tab} onChange={setTab}>
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8 pb-24">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-bold text-primary">{STAGE_LABEL[stage][lang]}</p><h1 className="mt-1 text-3xl font-black">{tx("مرحباً،", "Welcome,")} {profile?.full_name}</h1><p className="mt-1 text-muted-foreground">{tx("جاهز تكمل رحلتك في التاريخ؟", "Ready to continue your history journey?")}</p></div><div className="flex items-center gap-3 rounded-lg border bg-card px-5 py-3"><GraduationCap className="text-primary"/><div><p className="text-xs text-muted-foreground">{tx("المستوى الحالي","Current level")}</p><p className="font-bold">{tx("باحث صاعد","Rising researcher")}</p></div></div></div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsContent value="content"><Content /></TabsContent>
        <TabsContent value="report"><Card><AttemptsReport userId={session.user.id} /></Card></TabsContent>
        <TabsContent value="top"><Leaderboard stage={stage} /></TabsContent>
        <TabsContent value="me"><ProfileEditor /></TabsContent>
      </Tabs>
      </div>
    </DashboardShell>
  );
}

function Content() {
  const { tx } = useApp();
  const [folders, setFolders] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [unlocks, setUnlocks] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [open, setOpen] = useState<any>(null);
  const load = async () => {
    const [f, v, e, u, a] = await Promise.all([
      db.from("folders").select("*").order("created_at"),
      db.from("videos").select("*").order("created_at"),
      db.from("exams").select("*").order("created_at"),
      db.from("video_unlocks").select("video_id"),
      db.from("attempts").select("exam_id,score,total"),
    ]);
    setFolders(f.data ?? []); setVideos(v.data ?? []); setExams(e.data ?? []);
    setUnlocks((u.data ?? []).map((x: any) => x.video_id)); setAttempts(a.data ?? []);
  };
  useEffect(() => { load(); }, []);
  if (open) return <ExamView exam={open} attempt={attempts.find((a) => a.exam_id === open.id)} back={() => { setOpen(null); load(); }} />;
  const groups = [...folders, { id: null, title: tx("عام", "General") }];
  return (
    <div className="space-y-6">
      {groups.map((f) => {
        const vs = videos.filter((v) => v.folder_id === f.id), es = exams.filter((e) => e.folder_id === f.id);
        if (!vs.length && !es.length) return null;
        return (
          <section key={f.id ?? "g"} className="space-y-4">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary"><BookOpen className="h-5 w-5"/></div><div><h2 className="text-xl font-bold">{f.title}</h2><p className="text-xs text-muted-foreground">{vs.length} {tx("محاضرة", "lectures")} · {es.length} {tx("امتحان", "exams")}</p></div></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {vs.map((v) => <VideoCard key={v.id} v={v} unlocked={!v.is_locked || unlocks.includes(v.id)} onUnlock={load} />)}
            </div>
            {es.map((e) => {
              const a = attempts.find((x) => x.exam_id === e.id);
              return (
                <div key={e.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
                  <span className="flex items-center gap-2 font-semibold"><BarChart3 className="h-5 w-5 text-primary"/>{e.title}</span>
                  <div className="flex items-center gap-2">
                    {a && <span className="font-bold">{a.score}/{a.total}</span>}
                    {(!a || e.is_closed) && (
                      <Button size="sm" onClick={() => setOpen(e)}>{a ? tx("مراجعة", "Review") : tx("ابدأ", "Start")}</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function VideoCard({ v, unlocked, onUnlock }: { v: any; unlocked: boolean; onUnlock: () => void }) {
  const { tx } = useApp();
  const [code, setCode] = useState("");
  const redeem = async () => {
    const { data } = await db.rpc("redeem_code", { _code: code, _video_id: v.id });
    if (data?.ok) { toast.success(tx("تم فتح الفيديو", "Unlocked")); onUnlock(); }
    else toast.error(data?.error === "used" ? tx("الكود مستخدم", "Code used") : tx("كود غير صحيح", "Invalid code"));
  };
  return (
    <article className="overflow-hidden rounded-lg border bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-gold">
      <div className="relative aspect-video bg-navy-deep">
        {unlocked ? <VideoPlayer v={v} /> : <div className="absolute inset-0 grid place-items-center bg-navy-deep"><div className="text-center"><LockKeyhole className="mx-auto h-9 w-9 text-primary"/><p className="mt-3 text-sm text-secondary-foreground/70">{tx("محاضرة مقفولة","Locked lecture")}</p></div></div>}
      </div>
      <div className="p-4"><div className="mb-2 flex items-center justify-between gap-3"><h3 className="font-bold">{v.title}</h3><span className="rounded-full bg-primary/15 px-2 py-1 text-xs font-bold text-primary"><Play className="me-1 inline h-3 w-3"/>{tx("فيديو","Video")}</span></div>
      {v.description && <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{v.description}</p>}
      {!unlocked && <div className="space-y-2 border-t pt-3">
          <p className="text-sm">{tx("سعر الحصة", "Price")}: <b className="text-primary">{v.price} {tx("جنيه", "EGP")}</b></p>
          <div className="flex gap-2"><Input placeholder={tx("أدخل الكود", "Enter code")} value={code} onChange={(e) => setCode(e.target.value)} /><Button onClick={redeem}>{tx("فتح", "Unlock")}</Button></div>
      </div>}</div>
    </article>
  );
}

function ExamView({ exam, attempt, back }: { exam: any; attempt: any; back: () => void }) {
  const { tx } = useApp();
  const [qs, setQs] = useState<any[]>([]);
  const [ans, setAns] = useState<Record<string, number>>({});
  const [my, setMy] = useState<any>({});
  const review = !!attempt && exam.is_closed;
  useEffect(() => {
    db.rpc(review ? "get_exam_review" : "get_exam_questions", { _exam_id: exam.id }).then(({ data }: any) => setQs(data ?? []));
    if (review) db.from("attempts").select("answers").eq("exam_id", exam.id).maybeSingle().then(({ data }: any) => setMy(data?.answers ?? {}));
  }, []);
  const submit = async () => {
    const { data, error } = await db.rpc("submit_attempt", { _exam_id: exam.id, _answers: ans });
    if (error || !data?.ok) return toast.error(error?.message ?? tx("تم التسليم من قبل", "Already submitted"));
    toast.success(`${tx("درجتك", "Your score")}: ${data.score}/${data.total}`);
    back();
  };
  return (
    <Card>
      <div className="mb-4 flex justify-between"><h2 className="text-xl font-bold">{exam.title}</h2><Button variant="ghost" onClick={back}>{tx("رجوع", "Back")}</Button></div>
      {qs.map((q, i) => (
        <div key={q.id} className="mb-5 border-b border-border/40 pb-4">
          <p className="font-semibold">{i + 1}. {q.prompt}</p>
          <QImage path={q.image_url} />
          <div className="mt-2 grid gap-2">
            {(q.options as string[]).map((o, j) => {
              const picked = review ? Number(my[q.id]) === j : ans[q.id] === j;
              const cls = review ? (j === q.correct_index ? "border-green-500 bg-green-500/15" : picked ? "border-destructive bg-destructive/15" : "") : picked ? "border-primary bg-primary/15" : "";
              return (
                <button key={j} disabled={review} onClick={() => setAns({ ...ans, [q.id]: j })} className={`rounded-lg border p-2 text-start ${cls}`}>{o}</button>
              );
            })}
          </div>
        </div>
      ))}
      {!review && <Button onClick={submit} disabled={Object.keys(ans).length < qs.length}>{tx("تسليم", "Submit")}</Button>}
    </Card>
  );
}
