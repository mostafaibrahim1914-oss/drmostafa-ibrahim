import { useCallback, useEffect, useState } from "react";
import { BookOpenCheck, ClipboardPlus, FilePenLine, ListChecks, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, db } from "@/components/site/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STAGES, STAGE_LABEL, type Stage, uploadFile, useApp } from "@/lib/app-context";

const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3";

type ExamForm = {
  stage: Stage;
  folder_id: string;
  title: string;
  duration_minutes: string;
};

type FolderRecord = { id: string; stage: Stage; title: string };
type ExamRecord = {
  id: string;
  title: string;
  stage: Stage;
  folder_id: string | null;
  is_closed: boolean;
  duration_minutes: number | null;
};
type QuestionRecord = {
  id: string;
  prompt: string;
  question_type: string;
  points: number;
  image_url: string | null;
};

function readDuration(value: string, tx: (ar: string, en: string) => string) {
  if (!value.trim()) return null;
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) {
    toast.error(
      tx(
        "أدخل وقتاً صحيحاً من دقيقة إلى 600 دقيقة.",
        "Enter a whole-number duration from 1 to 600 minutes.",
      ),
    );
    return undefined;
  }
  return minutes;
}

export function AdminExams() {
  const { tx, lang } = useApp();
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [editing, setEditing] = useState<ExamRecord | null>(null);
  const [form, setForm] = useState<ExamForm>({
    stage: "sec1",
    folder_id: "",
    title: "",
    duration_minutes: "",
  });

  const load = useCallback(async () => {
    const [folderResult, examResult] = await Promise.all([
      db.from("folders").select("*").order("created_at"),
      db.from("exams").select("*").order("created_at", { ascending: false }),
    ]);
    setFolders(folderResult.data ?? []);
    setExams(examResult.data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (editing) return <QuestionEditor exam={editing} back={() => setEditing(null)} />;

  const createExam = async () => {
    if (!form.title.trim())
      return toast.error(tx("اكتب اسم الامتحان أولاً.", "Enter an exam title first."));
    const duration = readDuration(form.duration_minutes, tx);
    if (duration === undefined) return;
    const { data, error } = await db
      .from("exams")
      .insert({
        stage: form.stage,
        title: form.title.trim(),
        folder_id: form.folder_id || null,
        duration_minutes: duration,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setForm((current) => ({ ...current, title: "", duration_minutes: "" }));
    await load();
    setEditing(data);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit space-y-4 border-2 border-primary/35">
        <div className="flex items-center gap-3">
          <div className="icon-tile">
            <ClipboardPlus className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-primary">RESEARCHER EXAMS</p>
            <h3 className="font-black">{tx("إنشاء امتحان", "Create exam")}</h3>
          </div>
        </div>
        <select
          className={selectClass}
          value={form.stage}
          onChange={(event) =>
            setForm({ ...form, stage: event.target.value as Stage, folder_id: "" })
          }
        >
          {STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABEL[stage][lang]}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={form.folder_id}
          onChange={(event) => setForm({ ...form, folder_id: event.target.value })}
        >
          <option value="">{tx("بدون وحدة", "No unit")}</option>
          {folders
            .filter((folder) => folder.stage === form.stage)
            .map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.title}
              </option>
            ))}
        </select>
        <Input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder={tx("اسم الامتحان", "Exam name")}
        />
        <div className="space-y-1.5">
          <Label htmlFor="new-exam-duration">
            {tx("مدة الامتحان بالدقائق", "Exam duration in minutes")}
          </Label>
          <Input
            id="new-exam-duration"
            type="number"
            min="1"
            max="600"
            step="1"
            inputMode="numeric"
            value={form.duration_minutes}
            onChange={(event) => setForm({ ...form, duration_minutes: event.target.value })}
            placeholder={tx("اتركه فارغاً لبدون وقت", "Leave blank for no time limit")}
          />
        </div>
        <Button className="w-full" onClick={() => void createExam()}>
          <ClipboardPlus className="h-4 w-4" />
          {tx("إنشاء وإضافة الأسئلة", "Create and add questions")}
        </Button>
      </Card>

      <div>
        <div className="mb-4 flex items-center gap-3">
          <div className="icon-tile">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black">{tx("الامتحانات المنشورة", "Published exams")}</h2>
            <p className="text-sm text-muted-foreground">
              {exams.length} {tx("امتحان", "exams")}
            </p>
          </div>
        </div>
        <div className="grid content-start gap-4 md:grid-cols-2">
          {exams.map((exam) => (
            <Card
              key={exam.id}
              className="group border-2 border-primary/25 transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-gold"
            >
              <div className="mb-5 flex items-start gap-3">
                <div className="icon-tile">
                  <ListChecks className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-black">{exam.title}</h3>
                  <p className="mt-1 text-xs font-bold text-primary">
                    {STAGE_LABEL[exam.stage as Stage][lang]}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Timer className="h-3.5 w-3.5" />
                    {exam.duration_minutes
                      ? `${exam.duration_minutes} ${tx("دقيقة", "min")}`
                      : tx("بدون وقت محدد", "No time limit")}
                  </p>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-xs font-bold ${exam.is_closed ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"}`}
                >
                  {exam.is_closed ? tx("مغلق", "Closed") : tx("مفتوح", "Open")}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-primary/15 pt-4">
                <Button
                  className="min-w-32 flex-1"
                  variant="outline"
                  onClick={() => setEditing(exam)}
                >
                  <FilePenLine className="h-4 w-4" />
                  {tx("إدارة الأسئلة والوقت", "Questions & time")}
                </Button>
                <Button
                  variant={exam.is_closed ? "secondary" : "default"}
                  onClick={async () => {
                    const { error } = await db
                      .from("exams")
                      .update({ is_closed: !exam.is_closed })
                      .eq("id", exam.id);
                    if (error) return toast.error(error.message);
                    await load();
                  }}
                >
                  {exam.is_closed ? tx("إعادة فتح", "Reopen") : tx("غلق", "Close")}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={tx("حذف", "Delete")}
                  onClick={async () => {
                    if (!confirm(tx("حذف الامتحان؟", "Delete exam?"))) return;
                    const { error } = await db.from("attempts").delete().eq("exam_id", exam.id);
                    if (error) return toast.error(error.message);
                    const questionsResult = await db
                      .from("questions")
                      .delete()
                      .eq("exam_id", exam.id);
                    if (questionsResult.error) return toast.error(questionsResult.error.message);
                    const examResult = await db.from("exams").delete().eq("id", exam.id);
                    if (examResult.error) return toast.error(examResult.error.message);
                    await load();
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({ exam, back }: { exam: ExamRecord; back: () => void }) {
  const { tx } = useApp();
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [duration, setDuration] = useState(
    exam.duration_minutes ? String(exam.duration_minutes) : "",
  );
  const [savingDuration, setSavingDuration] = useState(false);
  const blank = {
    prompt: "",
    question_type: "multiple_choice",
    points: 1,
    options: ["", "", "", ""],
    correct_index: 0,
  };
  const [form, setForm] = useState(blank);
  const load = useCallback(async () => {
    const { data } = await db.from("questions").select("*").eq("exam_id", exam.id).order("q_order");
    setQuestions((data ?? []) as QuestionRecord[]);
  }, [exam.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveDuration = async () => {
    const durationMinutes = readDuration(duration, tx);
    if (durationMinutes === undefined) return;
    setSavingDuration(true);
    const { error } = await db
      .from("exams")
      .update({ duration_minutes: durationMinutes })
      .eq("id", exam.id);
    setSavingDuration(false);
    if (error) return toast.error(error.message);
    exam.duration_minutes = durationMinutes;
    toast.success(tx("تم حفظ مدة الامتحان.", "Exam duration saved."));
  };

  const add = async () => {
    const options = form.question_type === "essay" ? [] : form.options.filter(Boolean);
    if (!form.prompt || (form.question_type === "multiple_choice" && options.length < 2)) {
      return toast.error(tx("أكمل بيانات السؤال", "Complete question details"));
    }
    const image_url = image ? await uploadFile("media", "questions", image) : null;
    const { error } = await db.from("questions").insert({
      exam_id: exam.id,
      prompt: form.prompt,
      question_type: form.question_type,
      points: form.points,
      options,
      correct_index: form.correct_index,
      image_url,
      q_order: questions.length + 1,
    });
    if (error) return toast.error(error.message);
    setForm(blank);
    setImage(null);
    await load();
  };

  const essayCount = questions.filter((question) => question.question_type === "essay").length;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="h-fit space-y-4 border-2 border-primary/35">
        <div className="flex justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-primary">{exam.title}</p>
            <h3 className="font-black">{tx("إضافة سؤال جديد", "Add a new question")}</h3>
          </div>
          <Button variant="ghost" onClick={back}>
            {tx("رجوع", "Back")}
          </Button>
        </div>
        <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
          <Label htmlFor="edit-exam-duration">
            {tx("مدة الامتحان بالدقائق", "Exam duration in minutes")}
          </Label>
          <div className="flex gap-2">
            <Input
              id="edit-exam-duration"
              type="number"
              min="1"
              max="600"
              step="1"
              inputMode="numeric"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              placeholder={tx("فارغ = بدون وقت", "Blank = no time limit")}
            />
            <Button variant="outline" onClick={() => void saveDuration()} disabled={savingDuration}>
              {savingDuration ? tx("جارٍ الحفظ…", "Saving…") : tx("حفظ الوقت", "Save time")}
            </Button>
          </div>
        </div>
        <select
          className={selectClass}
          value={form.question_type}
          onChange={(event) => setForm({ ...form, question_type: event.target.value })}
        >
          <option value="multiple_choice">{tx("اختيار من متعدد", "Multiple choice")}</option>
          <option value="essay">{tx("سؤال مقالي", "Essay")}</option>
        </select>
        <Input
          value={form.prompt}
          onChange={(event) => setForm({ ...form, prompt: event.target.value })}
          placeholder={tx("نص السؤال", "Question text")}
        />
        <div>
          <Label>{tx("درجة هذا السؤال", "Points for this question")}</Label>
          <Input
            className="mt-1 border-primary/30"
            type="number"
            min="1"
            value={form.points}
            onChange={(event) => setForm({ ...form, points: +event.target.value })}
          />
        </div>
        <div>
          <Label>{tx("صورة اختيارية", "Optional image")}</Label>
          <Input
            className="mt-1"
            type="file"
            accept="image/*"
            onChange={(event) => setImage(event.target.files?.[0] ?? null)}
          />
        </div>
        {form.question_type === "multiple_choice" && (
          <div className="space-y-2 rounded-lg border border-primary/25 bg-background/60 p-3">
            {form.options.map((option, index) => (
              <label
                key={index}
                className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 transition ${form.correct_index === index ? "border-primary bg-primary/10" : "border-border"}`}
              >
                <input
                  type="radio"
                  checked={form.correct_index === index}
                  onChange={() => setForm({ ...form, correct_index: index })}
                />
                <Input
                  value={option}
                  onChange={(event) => {
                    const options = [...form.options];
                    options[index] = event.target.value;
                    setForm({ ...form, options });
                  }}
                  placeholder={`${tx("اختيار", "Option")} ${index + 1}`}
                />
              </label>
            ))}
          </div>
        )}
        <Button className="w-full" onClick={() => void add()}>
          {tx("إضافة السؤال", "Add question")}
        </Button>
      </Card>

      <Card className="border-2 border-primary/25">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-black">
            {tx("أسئلة الامتحان", "Exam questions")} ({questions.length})
          </h3>
          <span className="rounded-md bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
            {essayCount} {tx("مقالي", "essay")}
          </span>
        </div>
        <div className="space-y-3">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="flex items-start gap-3 rounded-lg border border-primary/30 bg-background p-4 transition hover:border-primary/60"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/15 font-bold text-primary">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-6">{question.prompt}</p>
                <p className="mt-2 text-xs font-semibold text-primary">
                  {question.question_type === "essay"
                    ? tx("سؤال مقالي", "Essay question")
                    : tx("اختيار من متعدد", "Multiple choice")}{" "}
                  · {question.points} {tx("درجة", "points")}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={tx("حذف", "Delete")}
                onClick={async () => {
                  const { error } = await db.from("questions").delete().eq("id", question.id);
                  if (error) return toast.error(error.message);
                  await load();
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
