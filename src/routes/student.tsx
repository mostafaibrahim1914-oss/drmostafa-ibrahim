import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
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
      <Header />
      <Guard><Student /></Guard>
    </div>
  ),
});

function Student() {
  const { tx, profile, lang, session } = useApp();
  const stage = profile!.stage!;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-black">{tx("أهلاً", "Welcome")} {profile?.full_name}</h1>
      <p className="mb-6 text-muted-foreground">{stage && STAGE_LABEL[stage][lang]}</p>
      <Tabs defaultValue="content">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="content">{tx("المحتوى", "Content")}</TabsTrigger>
          <TabsTrigger value="report">{tx("تقريري", "My report")}</TabsTrigger>
          <TabsTrigger value="top">{tx("الأوائل", "Leaderboard")}</TabsTrigger>
          <TabsTrigger value="me">{tx("حسابي", "Account")}</TabsTrigger>
        </TabsList>
        <TabsContent value="content"><Content /></TabsContent>
        <TabsContent value="report"><Card><AttemptsReport userId={session!.user.id} /></Card></TabsContent>
        <TabsContent value="top">{stage && <Leaderboard stage={stage} />}</TabsContent>
        <TabsContent value="me"><ProfileEditor /></TabsContent>
      </Tabs>
    </div>
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
          <Card key={f.id ?? "g"}>
            <h2 className="mb-4 text-xl font-bold text-primary">📁 {f.title}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {vs.map((v) => <VideoCard key={v.id} v={v} unlocked={!v.is_locked || unlocks.includes(v.id)} onUnlock={load} />)}
            </div>
            {es.map((e) => {
              const a = attempts.find((x) => x.exam_id === e.id);
              return (
                <div key={e.id} className="mt-3 flex items-center justify-between rounded-xl bg-muted/50 p-3">
                  <span className="font-semibold">📝 {e.title}</span>
                  <div className="flex items-center gap-2">
                    {a && <span className="font-bold">{a.score}/{a.total}</span>}
                    {(!a || e.is_closed) && (
                      <Button size="sm" onClick={() => setOpen(e)}>{a ? tx("مراجعة", "Review") : tx("ابدأ", "Start")}</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
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
    <div className="rounded-xl border border-border/60 p-3">
      <div className="mb-2 font-semibold">🎬 {v.title}</div>
      {v.description && <p className="mb-2 text-sm text-muted-foreground">{v.description}</p>}
      {unlocked ? <VideoPlayer v={v} /> : (
        <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-center">
          <p>🔒 {tx("سعر الحصة", "Price")}: <b className="text-primary">{v.price} {tx("جنيه", "EGP")}</b></p>
          <div className="flex gap-2"><Input placeholder={tx("أدخل الكود", "Enter code")} value={code} onChange={(e) => setCode(e.target.value)} /><Button onClick={redeem}>{tx("فتح", "Unlock")}</Button></div>
        </div>
      )}
    </div>
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
