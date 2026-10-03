import { useEffect, useState } from "react";
import { BookOpenCheck, CalendarX2, ClipboardCheck, GraduationCap, Medal, PlayCircle, TrendingDown, TrendingUp } from "lucide-react";
import { Card, db } from "@/components/site/shared";
import { useApp } from "@/lib/app-context";

type Data = { absences: any[]; grades: any[]; attempts: any[]; progress: any[]; videoCount: number };

const pct = (s: number, t: number) => (t ? Math.round((100 * s) / t) : 0);

export function useStudentAnalytics(userId: string, stage?: string | null, reloadKey = 0) {
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => {
    let videosQ = db.from("videos").select("id", { count: "exact", head: true });
    if (stage) videosQ = videosQ.eq("stage", stage);
    Promise.all([
      db.from("student_absences").select("*").eq("user_id", userId).order("absence_date", { ascending: false }),
      db.from("center_grades").select("*").eq("user_id", userId).order("exam_date", { ascending: true }),
      db.from("attempts").select("score,total,submitted_at,exams(title)").eq("user_id", userId).order("submitted_at", { ascending: true }),
      db.from("lecture_progress").select("*").eq("user_id", userId),
      videosQ,
    ]).then(([a, g, at, p, v]: any[]) => setD({ absences: a.data ?? [], grades: g.data ?? [], attempts: at.data ?? [], progress: p.data ?? [], videoCount: v.count ?? 0 }));
  }, [userId, stage, reloadKey]);
  return d;
}

export function computeAnalytics(d: Data) {
  const now = new Date();
  const monthAbs = d.absences.filter((a) => { const x = new Date(a.absence_date); return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear(); }).length;
  const centerS = d.grades.reduce((s, g) => s + Number(g.score), 0), centerT = d.grades.reduce((s, g) => s + Number(g.total), 0);
  const centerPct = pct(centerS, centerT);
  const platS = d.attempts.reduce((s, a) => s + a.score, 0), platT = d.attempts.reduce((s, a) => s + a.total, 0);
  const platPct = pct(platS, platT);
  const started = d.progress.length, completed = d.progress.filter((p) => p.completed).length;
  const lecturePct = d.videoCount ? Math.min(100, Math.round((100 * completed) / d.videoCount)) : 0;
  const attendancePct = Math.max(0, 100 - monthAbs * 10);
  const parts: [number, number][] = [];
  if (d.grades.length) parts.push([centerPct, 0.4]);
  if (d.attempts.length) parts.push([platPct, 0.3]);
  if (d.videoCount) parts.push([lecturePct, 0.15]);
  parts.push([attendancePct, 0.15]);
  const w = parts.reduce((s, [, x]) => s + x, 0);
  const overall = Math.round(parts.reduce((s, [v, x]) => s + v * x, 0) / w);
  return { monthAbs, totalAbs: d.absences.length, centerPct, platPct, started, completed, lecturePct, attendancePct, overall };
}

function Ring({ value }: { value: number }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
      <circle cx="60" cy="60" r={r} className="fill-none stroke-muted" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} className="fill-none stroke-primary transition-all duration-1000" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} />
    </svg>
  );
}

function Bar({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-sm"><span className="truncate">{label}</span><span className="font-bold text-primary">{value}%{sub && <span className="ms-1 text-xs font-normal text-muted-foreground">{sub}</span>}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold-gradient transition-all duration-700" style={{ width: `${value}%` }} /></div>
    </div>
  );
}

export function StudentAnalytics({ userId, stage, reloadKey = 0 }: { userId: string; stage?: string | null; reloadKey?: number }) {
  const { tx } = useApp();
  const d = useStudentAnalytics(userId, stage, reloadKey);
  if (!d) return <div className="p-10 text-center text-muted-foreground">…</div>;
  const m = computeAnalytics(d);
  const level = m.overall >= 85 ? tx("ممتاز", "Excellent") : m.overall >= 70 ? tx("جيد جداً", "Very good") : m.overall >= 50 ? tx("جيد", "Good") : tx("يحتاج متابعة", "Needs follow-up");
  const kpis = [
    { icon: CalendarX2, v: m.monthAbs, l: tx("غياب هذا الشهر", "Absences this month"), s: `${m.totalAbs} ${tx("إجمالي", "total")}` },
    { icon: GraduationCap, v: `${m.centerPct}%`, l: tx("متوسط درجات السنتر", "Center average"), s: `${d.grades.length} ${tx("امتحان", "exams")}` },
    { icon: ClipboardCheck, v: `${m.platPct}%`, l: tx("متوسط كويزات المنصة", "Platform quizzes"), s: `${d.attempts.length} ${tx("كويز", "quizzes")}` },
    { icon: PlayCircle, v: `${m.completed}/${d.videoCount}`, l: tx("محاضرات مكتملة", "Lectures completed"), s: `${m.started} ${tx("بدأها", "started")}` },
  ];
  const strengths: string[] = [], improve: string[] = [];
  (m.monthAbs === 0 ? strengths : m.monthAbs >= 3 ? improve : strengths).push(m.monthAbs === 0 ? tx("التزام كامل بالحضور هذا الشهر.", "Perfect attendance this month.") : m.monthAbs >= 3 ? tx(`عدد الغيابات مرتفع (${m.monthAbs}) هذا الشهر.`, `High absences (${m.monthAbs}) this month.`) : tx("الحضور جيد مع غياب محدود.", "Good attendance with few absences."));
  if (d.grades.length) (m.centerPct >= 70 ? strengths : improve).push(m.centerPct >= 70 ? tx(`مستوى قوي في امتحانات السنتر (${m.centerPct}%).`, `Strong center exam level (${m.centerPct}%).`) : tx(`درجات السنتر تحتاج تحسين (${m.centerPct}%).`, `Center grades need improvement (${m.centerPct}%).`));
  if (d.attempts.length) (m.platPct >= 70 ? strengths : improve).push(m.platPct >= 70 ? tx(`أداء ممتاز في كويزات المنصة (${m.platPct}%).`, `Great platform quiz results (${m.platPct}%).`) : tx(`راجع الدروس قبل حل كويزات المنصة (${m.platPct}%).`, `Review lessons before platform quizzes (${m.platPct}%).`));
  else improve.push(tx("لم يحل أي كويز على المنصة بعد.", "No platform quizzes taken yet."));
  if (d.videoCount) (m.lecturePct >= 60 ? strengths : improve).push(m.lecturePct >= 60 ? tx(`متابعة منتظمة للمحاضرات (${m.lecturePct}%).`, `Regular lecture follow-up (${m.lecturePct}%).`) : tx(`أكمل المحاضرات المتبقية (${m.completed} من ${d.videoCount}).`, `Finish remaining lectures (${m.completed} of ${d.videoCount}).`));
  const trend = d.grades.length >= 2 ? pct(Number(d.grades.at(-1).score), Number(d.grades.at(-1).total)) - pct(Number(d.grades.at(-2).score), Number(d.grades.at(-2).total)) : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col items-center justify-center text-center">
          <div className="relative"><Ring value={m.overall} /><div className="absolute inset-0 grid place-items-center"><div><p className="font-display text-4xl font-black text-primary">{m.overall}%</p><p className="text-xs text-muted-foreground">{tx("التقييم العام", "Overall")}</p></div></div></div>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-1.5 font-bold text-primary"><Medal className="h-4 w-4" />{level}</p>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          {kpis.map((k) => (
            <Card key={k.l} className="group flex items-center gap-4">
              <div className="icon-tile"><k.icon className="h-6 w-6" /></div>
              <div><p className="font-display text-2xl font-black">{k.v}</p><p className="text-sm">{k.l}</p><p className="text-xs text-muted-foreground">{k.s}</p></div>
            </Card>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <h3 className="flex items-center gap-2 font-bold"><BookOpenCheck className="h-5 w-5 text-primary" />{tx("مؤشرات الأداء", "Performance indicators")}</h3>
          <Bar label={tx("درجات السنتر", "Center grades")} value={m.centerPct} />
          <Bar label={tx("كويزات المنصة", "Platform quizzes")} value={m.platPct} />
          <Bar label={tx("إكمال المحاضرات", "Lecture completion")} value={m.lecturePct} />
          <Bar label={tx("الالتزام بالحضور", "Attendance")} value={m.attendancePct} />
        </Card>
        <Card>
          <h3 className="mb-3 flex items-center gap-2 font-bold"><GraduationCap className="h-5 w-5 text-primary" />{tx("درجات السنتر بالترتيب", "Center grades in order")}
            {trend !== null && <span className={`ms-auto inline-flex items-center gap-1 text-xs ${trend >= 0 ? "text-primary" : "text-destructive"}`}>{trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}{trend > 0 ? "+" : ""}{trend}%</span>}</h3>
          {d.grades.length === 0 && <p className="text-sm text-muted-foreground">{tx("لا توجد درجات مسجلة بعد", "No grades yet")}</p>}
          <div className="max-h-72 space-y-3 overflow-y-auto pe-1">
            {d.grades.map((g) => <Bar key={g.id} label={`${g.exam_title} · ${new Date(g.exam_date).toLocaleDateString()}`} value={pct(Number(g.score), Number(g.total))} sub={`${g.score}/${g.total}`} />)}
          </div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 flex items-center gap-2 font-bold"><ClipboardCheck className="h-5 w-5 text-primary" />{tx("كويزات المنصة", "Platform quizzes")}</h3>
          {d.attempts.length === 0 && <p className="text-sm text-muted-foreground">{tx("لا توجد محاولات", "No attempts")}</p>}
          <div className="max-h-64 space-y-3 overflow-y-auto pe-1">{d.attempts.map((a, i) => <Bar key={i} label={a.exams?.title ?? "—"} value={pct(a.score, a.total)} sub={`${a.score}/${a.total}`} />)}</div>
        </Card>
        <Card>
          <h3 className="mb-3 flex items-center gap-2 font-bold"><CalendarX2 className="h-5 w-5 text-primary" />{tx("سجل الغياب", "Absence log")}</h3>
          {d.absences.length === 0 && <p className="text-sm text-muted-foreground">{tx("لا يوجد غياب", "No absences")}</p>}
          <div className="max-h-64 overflow-y-auto">{d.absences.map((a) => <div key={a.id} className="flex justify-between border-b border-border/40 py-2 text-sm"><span>{new Date(a.absence_date).toLocaleDateString()}</span><span className="text-muted-foreground">{a.reason || "—"}</span></div>)}</div>
        </Card>
      </div>
      <Card className="border-primary/30">
        <h3 className="mb-3 font-bold">{tx("التحليل المكتوب", "Written analysis")}</h3>
        <p className="mb-4 text-sm leading-7 text-muted-foreground">{tx(`التقييم العام للطالب ${m.overall}% بمستوى "${level}". يعتمد التقييم على درجات السنتر (40%)، كويزات المنصة (30%)، إكمال المحاضرات (15%)، والالتزام بالحضور (15%).`, `Overall score is ${m.overall}% ("${level}"), weighted from center grades (40%), platform quizzes (30%), lecture completion (15%) and attendance (15%).`)}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-primary/10 p-4"><p className="mb-2 flex items-center gap-2 font-bold text-primary"><TrendingUp className="h-4 w-4" />{tx("نقاط القوة", "Strengths")}</p><ul className="list-disc space-y-1 ps-5 text-sm">{strengths.length ? strengths.map((s) => <li key={s}>{s}</li>) : <li>—</li>}</ul></div>
          <div className="rounded-lg bg-destructive/10 p-4"><p className="mb-2 flex items-center gap-2 font-bold text-destructive"><TrendingDown className="h-4 w-4" />{tx("يحتاج تحسين", "Needs improvement")}</p><ul className="list-disc space-y-1 ps-5 text-sm">{improve.length ? improve.map((s) => <li key={s}>{s}</li>) : <li>{tx("لا شيء — استمر!", "Nothing — keep going!")}</li>}</ul></div>
        </div>
      </Card>
    </div>
  );
}
