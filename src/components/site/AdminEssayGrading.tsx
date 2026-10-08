import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCheck, ClipboardCheck, Clock3, FileSearch, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, db, QImage } from "@/components/site/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STAGES, STAGE_LABEL, type Stage, useApp } from "@/lib/app-context";

type FocusAttempt = { attemptId: string; stage?: Stage };
type StudentProfile = {
  id: string;
  full_name: string;
  stage: Stage | null;
  avatar_url: string | null;
};
type EssayQuestion = {
  id: string;
  prompt: string;
  image_url: string | null;
  question_type: string;
  points: number;
  q_order: number;
};
type SubmissionAttempt = {
  id: string;
  exam_id: string;
  user_id: string;
  score: number;
  total: number;
  answers: Record<string, unknown>;
  objective_score: number;
  essay_score: number;
  essay_scores: Record<string, number>;
  grading_status: "pending" | "graded";
  submitted_at: string;
  exams: { title: string; stage: Stage } | null;
};

export function AdminEssayGrading({
  focusAttempt,
  onFocusHandled,
}: {
  focusAttempt: FocusAttempt | null;
  onFocusHandled: () => void;
}) {
  const { tx, lang } = useApp();
  const [stage, setStage] = useState<Stage>(focusAttempt?.stage ?? "sec1");
  const [attempts, setAttempts] = useState<SubmissionAttempt[]>([]);
  const [students, setStudents] = useState<Record<string, StudentProfile>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<EssayQuestion[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (focusAttempt?.stage) setStage(focusAttempt.stage);
  }, [focusAttempt?.stage]);

  const loadAttempts = useCallback(async () => {
    setLoading(true);
    setSelectedId(null);
    setQuestions([]);
    const { data: profiles, error: profileError } = await db
      .from("profiles")
      .select("id,full_name,stage,avatar_url")
      .eq("stage", stage)
      .eq("status", "approved")
      .order("full_name");

    if (profileError) {
      toast.error(profileError.message);
      setAttempts([]);
      setStudents({});
      setLoading(false);
      return;
    }

    const profileRows = (profiles ?? []) as StudentProfile[];
    setStudents(Object.fromEntries(profileRows.map((profile) => [profile.id, profile])));
    const userIds = profileRows.map((profile) => profile.id);
    if (!userIds.length) {
      setAttempts([]);
      setLoading(false);
      return;
    }

    const { data: exams, error: examError } = await db
      .from("exams")
      .select("id")
      .eq("stage", stage);
    if (examError) {
      toast.error(examError.message);
      setAttempts([]);
      setLoading(false);
      return;
    }

    const examIds = (exams ?? []).map((exam: { id: string }) => exam.id);
    if (!examIds.length) {
      setAttempts([]);
      setLoading(false);
      return;
    }

    const { data, error } = await db
      .from("attempts")
      .select(
        "id,exam_id,user_id,score,total,answers,objective_score,essay_score,essay_scores,grading_status,submitted_at,exams(title,stage)",
      )
      .in("user_id", userIds)
      .in("exam_id", examIds)
      .order("submitted_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setAttempts([]);
    } else {
      setAttempts((data ?? []) as SubmissionAttempt[]);
    }
    setLoading(false);
  }, [stage]);

  useEffect(() => {
    void loadAttempts();
  }, [loadAttempts]);

  useEffect(() => {
    if (!focusAttempt?.attemptId) return;
    if (focusAttempt.stage && focusAttempt.stage !== stage) {
      setStage(focusAttempt.stage);
      return;
    }
    void loadAttempts();
  }, [focusAttempt?.attemptId, focusAttempt?.stage, stage, loadAttempts]);

  const visibleAttempts = useMemo(() => {
    const sorted = [...attempts].sort((a, b) => {
      if (a.grading_status !== b.grading_status) return a.grading_status === "pending" ? -1 : 1;
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    });
    return showAll ? sorted : sorted.filter((attempt) => attempt.grading_status === "pending");
  }, [attempts, showAll]);

  const selected = attempts.find((attempt) => attempt.id === selectedId);
  useEffect(() => {
    if (!selected) {
      setQuestions([]);
      setScores({});
      return;
    }
    let cancelled = false;
    Promise.all([
      db
        .from("questions")
        .select("id,prompt,image_url,question_type,points,q_order")
        .eq("exam_id", selected.exam_id)
        .order("q_order"),
      db.from("attempts").select("essay_scores").eq("id", selected.id).maybeSingle(),
    ]).then(([questionResult, attemptResult]) => {
      if (cancelled) return;
      if (questionResult.error) {
        toast.error(questionResult.error.message);
        return;
      }
      const essayQuestions = ((questionResult.data ?? []) as EssayQuestion[]).filter(
        (question) => question.question_type === "essay",
      );
      const saved = (attemptResult.data?.essay_scores ?? {}) as Record<string, number>;
      setQuestions(essayQuestions);
      setScores(
        Object.fromEntries(
          essayQuestions
            .filter((question) => saved[question.id] !== undefined)
            .map((question) => [question.id, String(saved[question.id])]),
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    if (!focusAttempt || loading) return;
    const target = attempts.find((attempt) => attempt.id === focusAttempt.attemptId);
    if (target) {
      setSelectedId(target.id);
      setShowAll(true);
      onFocusHandled();
    }
  }, [focusAttempt, loading, attempts, onFocusHandled]);

  const saveGrades = async () => {
    if (!selected || !questions.length) return;
    const essayScores: Record<string, number> = {};
    for (const question of questions) {
      const value = scores[question.id];
      if (value === undefined || value.trim() === "") continue;
      const mark = Number(value);
      if (!Number.isInteger(mark) || mark < 0 || mark > question.points) {
        return toast.error(
          tx(
            "يجب أن تكون الدرجة رقماً صحيحاً بين صفر ودرجة السؤال.",
            "Each mark must be a whole number from zero to the question's maximum.",
          ),
        );
      }
      essayScores[question.id] = mark;
    }
    if (!Object.keys(essayScores).length)
      return toast.error(
        tx("أدخل درجة سؤال مقالي واحد على الأقل.", "Enter a mark for at least one essay question."),
      );

    setSaving(true);
    const { data, error } = await db.rpc("grade_attempt_essays", {
      _attempt_id: selected.id,
      _essay_scores: essayScores,
    });
    setSaving(false);
    if (error || !data?.ok) {
      toast.error(error?.message ?? tx("تعذر حفظ الدرجات.", "Could not save the marks."));
      return;
    }
    toast.success(
      data.grading_status === "graded"
        ? tx(
            "اكتمل التصحيح وأُرسلت الدرجة النهائية للطالب.",
            "Grading complete; the final score was sent to the student.",
          )
        : tx(
            "تم حفظ الدرجات، وما زالت هناك أسئلة مقالية تحتاج إلى تصحيح.",
            "Marks saved; some essay questions still need grading.",
          ),
    );
    await loadAttempts();
  };

  const pendingCount = attempts.filter((attempt) => attempt.grading_status === "pending").length;

  return (
    <div className="space-y-5">
      <Card className="border-primary/30">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <ClipboardCheck className="h-5 w-5" />
              <span className="text-xs font-bold">RESEARCHER EXAM GRADING</span>
            </div>
            <h2 className="mt-1 text-xl font-black">{tx("تصحيح الامتحانات", "Exam grading")}</h2>
          </div>
          <Button variant="outline" onClick={() => void loadAttempts()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {tx("تحديث", "Refresh")}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={stage === item ? "default" : "outline"}
              onClick={() => {
                setStage(item);
                setSelectedId(null);
              }}
            >
              {STAGE_LABEL[item][lang]}
            </Button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={!showAll ? "default" : "ghost"}
              onClick={() => setShowAll(false)}
            >
              {tx("بانتظار التصحيح", "Needs grading")} ({pendingCount})
            </Button>
            <Button
              size="sm"
              variant={showAll ? "default" : "ghost"}
              onClick={() => setShowAll(true)}
            >
              {tx("كل التسليمات", "All submissions")}
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            {tx("التسليمات", "Submissions")}: {attempts.length}
          </span>
        </div>
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.5fr)]">
        <Card className="space-y-3">
          <h3 className="font-bold">{tx("الطلاب الذين سلّموا", "Student submissions")}</h3>
          {loading && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {tx("جارٍ تحميل التسليمات…", "Loading submissions…")}
            </p>
          )}
          {!loading && visibleAttempts.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {showAll
                ? tx(
                    "لا توجد امتحانات مسلّمة لهذه المرحلة بعد.",
                    "No submissions for this stage yet.",
                  )
                : tx(
                    "لا توجد أسئلة مقالية معلّقة لهذه المرحلة.",
                    "No essay answers are awaiting grading in this stage.",
                  )}
            </p>
          )}
          {visibleAttempts.map((attempt) => {
            const student = students[attempt.user_id];
            return (
              <button
                type="button"
                key={attempt.id}
                onClick={() => setSelectedId(attempt.id)}
                className={`w-full rounded-lg border p-3 text-start transition hover:border-primary/70 hover:bg-primary/5 ${selectedId === attempt.id ? "border-primary bg-primary/10 shadow-gold" : "border-border/70"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {student?.full_name ?? tx("طالب", "Student")}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {attempt.exams?.title ?? tx("امتحان", "Exam")}
                    </p>
                  </div>
                  {attempt.grading_status === "pending" ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-xs font-bold text-primary">
                      <Clock3 className="h-3.5 w-3.5" />
                      {tx("معلّق", "Pending")}
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-600">
                      <CheckCheck className="h-3.5 w-3.5" />
                      {tx("مكتمل", "Complete")}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {new Date(attempt.submitted_at).toLocaleString(
                      lang === "ar" ? "ar-EG" : "en-US",
                    )}
                  </span>
                  <span className="font-bold text-foreground">
                    {attempt.score}/{attempt.total}
                  </span>
                </div>
              </button>
            );
          })}
        </Card>

        <Card className="min-h-64">
          {!selected && (
            <div className="grid min-h-52 place-items-center text-center text-muted-foreground">
              <div>
                <FileSearch className="mx-auto mb-3 h-9 w-9 text-primary/70" />
                <p>
                  {tx(
                    "اختر طالباً من القائمة لعرض إجاباته.",
                    "Choose a student to review their answers.",
                  )}
                </p>
              </div>
            </div>
          )}
          {selected && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-primary">
                    {students[selected.user_id]?.full_name}
                  </p>
                  <h3 className="mt-1 text-lg font-black">{selected.exams?.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tx("الدرجة الحالية", "Current score")}: {selected.score}/{selected.total}
                  </p>
                </div>
                {selected.grading_status === "graded" && (
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-600">
                    {tx("اكتمل التصحيح", "Grading complete")}
                  </span>
                )}
              </div>
              {!questions.length && (
                <p className="text-sm text-muted-foreground">
                  {tx("لا توجد أسئلة مقالية في هذا الامتحان.", "This exam has no essay questions.")}
                </p>
              )}
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="space-y-3 rounded-lg border border-primary/20 bg-background/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-bold">
                      {index + 1}. {question.prompt}
                    </h4>
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                      {tx("الدرجة الكاملة", "Maximum")}: {question.points}
                    </span>
                  </div>
                  <QImage path={question.image_url} />
                  <div>
                    <p className="mb-1 text-xs font-bold text-muted-foreground">
                      {tx("إجابة الطالب", "Student answer")}
                    </p>
                    <div className="min-h-20 whitespace-pre-wrap rounded-md border bg-card p-3 text-sm leading-7">
                      {String(selected.answers?.[question.id] ?? "").trim() ||
                        tx("لم يكتب الطالب إجابة.", "The student left this answer blank.")}
                    </div>
                  </div>
                  <div className="flex max-w-xs items-center gap-3">
                    <label
                      htmlFor={`essay-score-${question.id}`}
                      className="shrink-0 text-sm font-semibold"
                    >
                      {tx("درجة الطالب", "Mark")}
                    </label>
                    <Input
                      id={`essay-score-${question.id}`}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max={question.points}
                      step="1"
                      value={scores[question.id] ?? ""}
                      onChange={(event) =>
                        setScores((current) => ({ ...current, [question.id]: event.target.value }))
                      }
                      placeholder={`0 – ${question.points}`}
                    />
                    <span className="shrink-0 text-sm text-muted-foreground">
                      / {question.points}
                    </span>
                  </div>
                </div>
              ))}
              {!!questions.length && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
                  <p className="max-w-lg text-xs text-muted-foreground">
                    {tx(
                      "يمكنك حفظ التصحيح على مراحل؛ تُرسل النتيجة للطالب عند اكتمال تصحيح كل الأسئلة المقالية.",
                      "You can save marks in stages. The student is notified when every essay question has been graded.",
                    )}
                  </p>
                  <Button onClick={() => void saveGrades()} disabled={saving}>
                    {saving ? tx("جارٍ الحفظ…", "Saving…") : tx("حفظ التصحيح", "Save grading")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
