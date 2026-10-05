import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, BookOpen, CheckCircle2, CircleUserRound, GraduationCap, LayoutDashboard, Play, Sparkles, Trophy, Video, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { DashboardShell } from "@/components/site/DashboardShell";
import { Card, db, Guard, Leaderboard, ProfileEditor, VideoPlayer } from "@/components/site/shared";
import { StudentAnalytics } from "@/components/site/Analytics";
import { StudentLectures } from "@/components/site/StudentLectures";
import { StudentExams } from "@/components/site/StudentExams";
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
  const [tab, setTab] = useState("home");
  if (!stage || !session) return null;
  const items = [
    { value: "home", label: tx("الرئيسية", "Home"), icon: LayoutDashboard },
    { value: "lectures", label: tx("المحاضرات", "Lectures"), icon: Video },
    { value: "exams", label: tx("الامتحانات", "Exams"), icon: ClipboardList },
    { value: "report", label: tx("تقرير الأداء", "Performance"), icon: BarChart3 },
    { value: "top", label: tx("المتصدرون", "Leaderboard"), icon: Trophy },
    { value: "me", label: tx("حسابي", "My account"), icon: CircleUserRound },
  ];
  useEffect(() => { const go = (event: Event) => setTab((event as CustomEvent<string>).detail); window.addEventListener("dashboard:navigate", go); return () => window.removeEventListener("dashboard:navigate", go); }, []);
  return (
    <DashboardShell items={items} active={tab} onChange={setTab}>
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8 pb-24">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-bold text-primary">{STAGE_LABEL[stage][lang]}</p><h1 className="mt-1 text-3xl font-black">{tx("مرحباً،", "Welcome,")} {profile?.full_name}</h1><p className="mt-1 text-muted-foreground">{tx("جاهز تكمل رحلتك في التاريخ؟", "Ready to continue your history journey?")}</p></div><div className="flex items-center gap-3 rounded-lg border bg-card px-5 py-3"><GraduationCap className="text-primary"/><div><p className="text-xs text-muted-foreground">{tx("المستوى الحالي","Current level")}</p><p className="font-bold">{tx("باحث صاعد","Rising researcher")}</p></div></div></div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsContent value="home"><StudentHome onChooseSection={setTab} /></TabsContent>
        <TabsContent value="lectures"><StudentLectures /></TabsContent>
        <TabsContent value="exams"><StudentExams /></TabsContent>
        <TabsContent value="report"><StudentAnalytics userId={session.user.id} stage={stage} /></TabsContent>
        <TabsContent value="top"><Leaderboard stage={stage} /></TabsContent>
        <TabsContent value="me"><ProfileEditor /></TabsContent>
      </Tabs>
      </div>
    </DashboardShell>
  );
}

function StudentHome({ onChooseSection }: { onChooseSection: (value: string) => void }) {
  const { tx, session } = useApp();
  const [videos, setVideos] = useState<any[]>([]);
  const [unlocks, setUnlocks] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  useEffect(() => {
    Promise.all([
      db.from("videos").select("*").order("created_at", { ascending: false }),
      db.from("video_unlocks").select("video_id"),
      db.from("attempts").select("score,total,exam_id"),
    ]).then(([v, u, a]) => {
      setVideos(v.data ?? []);
      setUnlocks((u.data ?? []).map((row: any) => row.video_id));
      setAttempts(a.data ?? []);
    });
  }, []);
  if (!session) return null;
  const accessible = videos.filter((video) => !video.is_locked || unlocks.includes(video.id));
  const recentId = typeof window === "undefined" ? null : localStorage.getItem("researcher-last-video");
  const resume = accessible.find((video) => video.id === recentId) ?? accessible[0];
  const earned = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const possible = attempts.reduce((sum, attempt) => sum + attempt.total, 0);
  const percent = possible ? Math.round((earned / possible) * 100) : 0;
  const stats = [
    { icon: Video, value: accessible.length, label: tx("محاضرة متاحة", "Available lessons") },
    { icon: CheckCircle2, value: attempts.length, label: tx("امتحان مكتمل", "Completed exams") },
    { icon: BarChart3, value: `${percent}%`, label: tx("معدل الأداء", "Performance") },
  ];
  return <div className="space-y-7">
    <section className="overflow-hidden rounded-lg border border-primary/30 bg-navy-deep shadow-gold">
      <div className="grid lg:grid-cols-[1fr_1.35fr]">
        <div className="flex flex-col justify-center p-6 text-secondary-foreground md:p-8">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Play className="h-5 w-5" /></div>
          <p className="text-sm font-bold text-primary">{tx("استكمل من حيث توقفت", "Continue where you left off")}</p>
          <h2 className="mt-2 text-2xl font-black">{resume?.title ?? tx("ابدأ أول محاضرة", "Start your first lesson")}</h2>
          <p className="mt-2 text-sm text-secondary-foreground/60">{resume?.description || tx("محاضراتك محفوظة ومنظمة داخل وحداتك الدراسية.", "Your lessons are organized inside your study units.")}</p>
           {!resume && <Button className="mt-5 w-fit" onClick={() => onChooseSection("lectures")}>{tx("اختيار محاضرة", "Choose a lesson")}</Button>}
        </div>
        <div className="min-h-64 bg-background/20 p-3">{resume ? <VideoPlayer v={resume} rememberProgress /> : <div className="grid h-full min-h-60 place-items-center text-secondary-foreground/40"><BookOpen className="h-14 w-14" /></div>}</div>
      </div>
    </section>
    <section>
      <div className="mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/><h2 className="text-xl font-black">{tx("أداؤك حتى الآن", "Your progress so far")}</h2></div>
      <div className="grid gap-4 sm:grid-cols-3">{stats.map((stat) => <Card key={stat.label} className="flex items-center gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"><stat.icon /></div><div><strong className="font-display text-2xl text-primary">{stat.value}</strong><p className="text-sm text-muted-foreground">{stat.label}</p></div></Card>)}</div>
    </section>
    <section>
      <h2 className="mb-4 text-xl font-black">{tx("ماذا تريد أن تفعل؟", "What would you like to do?")}</h2>
      <div className="grid gap-4 md:grid-cols-3">
         {[{ value: "lectures", icon: Video, title: tx("المحاضرات", "Lectures"), desc: tx("اختر الوحدة واستكمل التعلم", "Choose a unit and continue learning") }, { value: "exams", icon: ClipboardList, title: tx("الامتحانات", "Exams"), desc: tx("حل الاختبارات وراجع نتائجك", "Take exams and review results") }, { value: "report", icon: BarChart3, title: tx("تحليل الأداء", "Performance analysis"), desc: tx("راجع درجاتك ومستواك", "Review your scores and level") }].map((section) => <Button key={section.value} variant="outline" onClick={() => onChooseSection(section.value)} className="group h-auto min-h-36 items-start justify-start gap-4 whitespace-normal border-primary/25 bg-card p-5 text-start transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-gold"><div className="icon-tile"><section.icon /></div><div><h3 className="font-bold">{section.title}</h3><p className="mt-2 text-sm text-muted-foreground">{section.desc}</p></div></Button>)}</div>
    </section>
  </div>;
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
  const [watching, setWatching] = useState(false);
  const redeem = async () => {
    const { data } = await db.rpc("redeem_code", { _code: code, _video_id: v.id });
    if (data?.ok) { toast.success(tx("تم فتح الفيديو", "Unlocked")); onUnlock(); }
    else toast.error(data?.error === "used" ? tx("الكود مستخدم", "Code used") : tx("كود غير صحيح", "Invalid code"));
  };
  return (
    <article className="overflow-hidden rounded-lg border bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-gold">
      <div className="relative aspect-video bg-navy-deep">
        {unlocked && watching ? <VideoPlayer v={v} rememberProgress /> : unlocked ? <button className="absolute inset-0 grid w-full place-items-center bg-navy-deep text-secondary-foreground" onClick={() => { localStorage.setItem("researcher-last-video", v.id); setWatching(true); }}><span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-gold"><Play className="h-7 w-7" /></span><span className="absolute bottom-4 text-sm font-bold">{tx("تشغيل المحاضرة", "Play lesson")}</span></button> : <div className="absolute inset-0 grid place-items-center bg-navy-deep"><div className="text-center"><LockKeyhole className="mx-auto h-9 w-9 text-primary"/><p className="mt-3 text-sm text-secondary-foreground/70">{tx("محاضرة مقفولة","Locked lecture")}</p></div></div>}
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
