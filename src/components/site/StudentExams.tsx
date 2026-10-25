import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FilePenLine,
  Hourglass,
  Sparkles,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { Bubbles } from "@/components/site/Bubbles";
import { Card, db, QImage } from "@/components/site/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LOGO_URL, type Stage, useApp } from "@/lib/app-context";

type FolderRecord = { id: string; title: string };
type ExamRecord = {
  id: string;
  title: string;
  stage: Stage;
  folder_id: string | null;
  is_closed: boolean;
  duration_minutes: number | null;
  is_published: boolean;
  sort_order: number;
};
type AttemptRecord = {
  exam_id: string;
  score: number;
  total: number;
  grading_status: string;
};
type QuestionRecord = {
  id: string;
  prompt: string;
  image_url: string | null;
  question_type: string;
  points: number;
  options: string[];
  correct_index: number;
};

function ExamSession({
  exam,
  attempt,
  back,
}: {
  exam: ExamRecord;
  attempt: AttemptRecord | undefined;
  back: () => void;
}) {
  const { tx, session } = useApp();
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [saved, setSaved] = useState<Record<string, number | string>>({});
  const [answersLoaded, setAnswersLoaded] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);
  const answersRef = useRef(answers);
  const submitRef = useRef<(automatic?: boolean) => void>(() => {});
  const autoSubmitAttemptedRef = useRef(false);
  const submissionInProgressRef = useRef(false);
  const review = Boolean(attempt && exam.is_closed);
  const durationMinutes = Number(exam.duration_minutes) > 0 ? Number(exam.duration_minutes) : null;
  const timerKey = `researcher-exam-start-${session?.user.id ?? "student"}-${exam.id}`;
  const answersKey = `${timerKey}-answers`;

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (attempt) {
      setAnswersLoaded(true);
      return;
    }
    try {
      const stored = localStorage.getItem(answersKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const restored = parsed as Record<string, number | string>;
          answersRef.current = restored;
          setAnswers(restored);
        }
      }
    } catch {
      toast.error(
        tx(
          "تعذر استرجاع الإجابات المحفوظة على هذا الجهاز.",
          "Could not restore saved answers on this device.",
        ),
      );
    }
    setAnswersLoaded(true);
  }, [answersKey, attempt, tx]);

  useEffect(() => {
    if (!answersLoaded || attempt) return;
    try {
      if (Object.keys(answers).length) {
        localStorage.setItem(answersKey, JSON.stringify(answers));
      } else {
        localStorage.removeItem(answersKey);
      }
    } catch {
      toast.error(
        tx("تعذر حفظ إجاباتك على هذا الجهاز.", "Could not save your answers on this device."),
      );
    }
  }, [answers, answersKey, answersLoaded, attempt, tx]);

  useEffect(() => {
    let cancelled = false;
    const loadQuestions = async () => {
      const { data, error } = await db.rpc(review ? "get_exam_review" : "get_exam_questions", {
        _exam_id: exam.id,
      });
      if (cancelled) return;
      if (error) toast.error(error.message);
      setQuestions((data ?? []) as QuestionRecord[]);
    };
    const loadAnswers = async () => {
      const { data, error } = await db
        .from("attempts")
        .select("answers")
        .eq("exam_id", exam.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) toast.error(error.message);
      setSaved((data?.answers ?? {}) as Record<string, number | string>);
    };
    void loadQuestions();
    if (attempt) void loadAnswers();
    return () => {
      cancelled = true;
    };
  }, [attempt, exam.id, review]);

  const submit = useCallback(
    async (automatic = false) => {
      if (submissionInProgressRef.current || review) return;
      submissionInProgressRef.current = true;
      setSubmitting(true);
      setExpired((wasExpired) => wasExpired || automatic);
      try {
        const { data, error } = await db.rpc("submit_attempt", {
          _exam_id: exam.id,
          _answers: answersRef.current,
        });
        if (error || !data?.ok) {
          toast.error(error?.message ?? tx("تعذر تسليم الامتحان.", "Could not submit the exam."));
          return;
        }
        try {
          localStorage.removeItem(timerKey);
          localStorage.removeItem(answersKey);
        } catch {
          // The attempt is already saved; browser storage cannot undo it.
        }
        toast.success(
          automatic
            ? tx(
                "انتهى الوقت وتم تسليم إجاباتك تلقائياً.",
                "Time is up. Your answers were submitted.",
              )
            : data.grading_status === "pending"
              ? tx(
                  "تم التسليم — السؤال المقالي بانتظار التصحيح",
                  "Submitted — essay awaits grading",
                )
              : `${tx("درجتك", "Score")}: ${data.score}/${data.total}`,
        );
        back();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : tx("تعذر تسليم الامتحان.", "Could not submit the exam."),
        );
      } finally {
        submissionInProgressRef.current = false;
        setSubmitting(false);
      }
    },
    [answersKey, back, exam.id, review, timerKey, tx],
  );

  useEffect(() => {
    submitRef.current = (automatic = false) => {
      void submit(automatic);
    };
  }, [submit]);

  useEffect(() => {
    if (!durationMinutes || attempt || review || !session?.user.id) {
      setRemainingSeconds(null);
      return;
    }
    let startedAt = 0;
    try {
      startedAt = Number(localStorage.getItem(timerKey));
      if (!Number.isFinite(startedAt) || startedAt <= 0) {
        startedAt = Date.now();
        localStorage.setItem(timerKey, String(startedAt));
      }
    } catch {
      startedAt = Date.now();
    }

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((startedAt + durationMinutes * 60_000 - Date.now()) / 1000),
      );
      setRemainingSeconds(remaining);
      if (remaining === 0 && !autoSubmitAttemptedRef.current) {
        autoSubmitAttemptedRef.current = true;
        setExpired(true);
        submitRef.current(true);
      }
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [attempt, durationMinutes, exam.id, review, session?.user.id, timerKey]);

  const complete =
    questions.length > 0 &&
    questions.every(
      (question) =>
        answers[question.id] !== undefined && String(answers[question.id]).trim() !== "",
    );
  const formatTime = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="relative mx-auto max-w-4xl space-y-5">
      <Bubbles count={5} />
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/35 bg-card px-4 py-4 shadow-gold sm:px-6">
        <div className="flex items-center gap-3">
          <img
            src={LOGO_URL}
            alt="Researcher"
            className="h-12 w-12 rounded-full border border-primary/35 shadow-gold"
          />
          <div>
            <p className="text-sm font-black text-primary">Researcher / Mostafa Ibrahim</p>
            <h2 className="mt-1 text-lg font-bold">{exam.title}</h2>
          </div>
        </div>
        {remainingSeconds !== null && !review && (
          <div
            role="timer"
            aria-live="off"
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-xl font-black tabular-nums ${
              remainingSeconds <= 60
                ? "animate-pulse border-destructive/50 bg-destructive/10 text-destructive"
                : "border-primary/35 bg-primary/10 text-primary"
            }`}
          >
            <Timer className="h-5 w-5" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>
        )}
        <Button variant="ghost" onClick={back} disabled={submitting}>
          <ArrowRight className="h-4 w-4" />
          {tx("رجوع", "Back")}
        </Button>
      </header>

      {expired && (
        <p
          role="status"
          className="relative z-10 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm font-semibold text-primary"
        >
          {submitting
            ? tx("انتهى الوقت، جارٍ تسليم الإجابات…", "Time is up. Submitting your answers…")
            : tx(
                "انتهى الوقت. تعذّر التسليم تلقائياً؛ اضغط إعادة المحاولة.",
                "Time is up. Automatic submission failed; retry below.",
              )}
        </p>
      )}

      <div className="relative z-10 space-y-5">
        {questions.map((question, index) => (
          <section
            key={question.id}
            className="rounded-2xl border-2 border-primary/50 bg-card/95 p-5 shadow-[0_8px_32px_-18px_var(--primary)] transition hover:border-primary/75 sm:p-7"
          >
            <div className="mb-5 flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 font-display font-black text-primary">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-bold leading-8 sm:text-lg">
                  {question.prompt}
                </p>
                <span className="mt-1 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                  {question.points} {tx("درجة", "points")}
                </span>
              </div>
              <img
                src={LOGO_URL}
                alt=""
                aria-hidden="true"
                className="h-9 w-9 shrink-0 rounded-full opacity-90 shadow-gold motion-safe:animate-[icon-float_3.6s_ease-in-out_infinite]"
              />
            </div>
            <QImage path={question.image_url} />
            {question.question_type === "essay" ? (
              <Textarea
                disabled={review || Boolean(attempt) || expired || submitting}
                value={String(
                  (review || attempt ? saved[question.id] : answers[question.id]) ?? "",
                )}
                onChange={(event) =>
                  setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                }
                placeholder={tx("اكتب إجابتك المقالية بالتفصيل…", "Write your essay answer…")}
                className="mt-4 min-h-36 border-2 border-primary/30 bg-muted/50 focus-visible:border-primary"
              />
            ) : (
              <div className="mt-5 grid gap-3">
                {(question.options as string[]).map((option, optionIndex) => {
                  const selected = Number((review ? saved : answers)[question.id]) === optionIndex;
                  const isCorrect = review && optionIndex === question.correct_index;
                  return (
                    <Button
                      key={optionIndex}
                      type="button"
                      variant="outline"
                      disabled={review || Boolean(attempt) || expired || submitting}
                      aria-pressed={selected}
                      onClick={() =>
                        setAnswers((current) => ({ ...current, [question.id]: optionIndex }))
                      }
                      className={`group h-auto min-h-14 justify-start whitespace-normal rounded-xl border-2 px-4 py-3 text-start font-medium transition duration-200 motion-safe:active:scale-[0.99] ${
                        selected
                          ? "scale-[1.01] border-primary bg-primary text-primary-foreground shadow-gold"
                          : isCorrect
                            ? "border-emerald-500 bg-emerald-500/10 text-foreground"
                            : "border-primary/15 bg-muted/55 hover:border-primary/45 hover:bg-primary/10"
                      }`}
                    >
                      <span
                        className={`me-3 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition ${
                          selected
                            ? "rotate-[360deg] border-primary-foreground/60 bg-primary-foreground/15"
                            : "border-primary/35 text-primary group-hover:scale-110"
                        }`}
                      >
                        {selected ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          String.fromCharCode(65 + optionIndex)
                        )}
                      </span>
                      <span className="flex-1">{option}</span>
                      {isCorrect && (
                        <CheckCircle2 className="ms-auto h-5 w-5 shrink-0 text-emerald-600" />
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        {attempt?.grading_status === "pending" && (
          <p className="flex items-center gap-2 rounded-lg bg-primary/10 p-4 text-sm text-primary">
            <Hourglass className="h-5 w-5" />
            {tx(
              "إجابتك المقالية تحت المراجعة، وستظهر الدرجة النهائية بعد التصحيح.",
              "Your essay is being reviewed; the final grade will appear after grading.",
            )}
          </p>
        )}
        {!attempt && (
          <Button
            size="lg"
            disabled={submitting || (!expired && !complete)}
            onClick={() => {
              autoSubmitAttemptedRef.current = false;
              void submit(expired);
            }}
            className="ms-auto min-w-44 shadow-gold"
          >
            <CheckCircle2 className="h-5 w-5" />
            {submitting
              ? tx("جارٍ التسليم…", "Submitting…")
              : expired
                ? tx("إعادة محاولة التسليم", "Retry submission")
                : tx("تسليم الامتحان", "Submit exam")}
          </Button>
        )}
      </div>

      {durationMinutes && !review && (
        <p className="relative z-10 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Clock3 className="h-4 w-4" />
          {tx(
            `مدة الامتحان ${durationMinutes} دقيقة، وسيتم تسليمه تلقائياً عند انتهاء الوقت.`,
            `This exam lasts ${durationMinutes} minutes and will be submitted automatically when time is up.`,
          )}
        </p>
      )}
    </div>
  );
}

export function StudentExams() {
  const { tx } = useApp();
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [open, setOpen] = useState<ExamRecord | null>(null);

  const load = useCallback(async () => {
    const [folderResult, examResult, attemptResult] = await Promise.all([
      db.from("folders").select("*").order("created_at"),
      db.from("exams").select("*").eq("is_published", true).order("sort_order").order("created_at"),
      db.from("attempts").select("exam_id,score,total,grading_status"),
    ]);
    setFolders(folderResult.data ?? []);
    setExams(examResult.data ?? []);
    setAttempts(attemptResult.data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (open) {
    return (
      <ExamSession
        exam={open}
        attempt={attempts.find((item) => item.exam_id === open.id)}
        back={() => {
          setOpen(null);
          void load();
        }}
      />
    );
  }

  const groups = [...folders, { id: null, title: tx("اختبارات عامة", "General exams") }];
  return (
    <div className="space-y-8">
      {groups.map((folder) => {
        const list = exams.filter((exam) => exam.folder_id === folder.id);
        if (!list.length) return null;
        return (
          <section key={folder.id ?? "general"}>
            <div className="mb-4 flex items-center gap-3">
              <div className="icon-tile">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-black text-primary">{folder.title}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.map((exam) => {
                const studentAttempt = attempts.find((item) => item.exam_id === exam.id);
                return (
                  <Card
                    key={exam.id}
                    className="group relative overflow-hidden border-primary/30 transition hover:-translate-y-1 hover:border-primary/70 hover:shadow-gold"
                  >
                    <div className="absolute end-4 top-4 text-primary/20 transition group-hover:rotate-6 group-hover:text-primary/40">
                      <FilePenLine className="h-16 w-16" />
                    </div>
                    <Sparkles className="mb-5 h-5 w-5 animate-[icon-float_3s_ease-in-out_infinite] text-primary" />
                    <h3 className="relative text-lg font-black">{exam.title}</h3>
                    {exam.duration_minutes && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Timer className="h-3.5 w-3.5" />
                        {exam.duration_minutes} {tx("دقيقة", "min")}
                      </p>
                    )}
                    <p className="relative mt-2 text-sm text-muted-foreground">
                      {studentAttempt
                        ? studentAttempt.grading_status === "pending"
                          ? tx("بانتظار التصحيح المقالي", "Awaiting essay grading")
                          : `${tx("النتيجة", "Score")}: ${studentAttempt.score}/${studentAttempt.total}`
                        : tx("جاهز للبدء", "Ready to begin")}
                    </p>
                    <Button
                      className="relative mt-5 w-full"
                      variant={studentAttempt ? "outline" : "default"}
                      disabled={Boolean(studentAttempt && !exam.is_closed)}
                      onClick={() => setOpen(exam)}
                    >
                      {studentAttempt
                        ? exam.is_closed
                          ? tx("مراجعة الإجابات", "Review answers")
                          : tx("تم التسليم", "Submitted")
                        : tx("ابدأ الامتحان", "Start exam")}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
