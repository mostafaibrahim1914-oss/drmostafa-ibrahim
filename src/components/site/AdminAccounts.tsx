import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CircleDollarSign, Plus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Card, db } from "@/components/site/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STAGES, STAGE_LABEL, type Stage, useApp } from "@/lib/app-context";
import { fetchAllRows } from "@/lib/supabase-data";

type LessonPrice = { stage: Stage; price_per_lesson: number };
type PrivateGroup = { id: string; name: string };
type Attendance = {
  id: string;
  attendance_date: string;
  stage: Stage;
  attendee_count: number;
  price_per_student: number;
};
type PrivatePayment = {
  id: string;
  group_id: string | null;
  student_id: string | null;
  amount: number;
  payment_date: string;
  private_students: { group_id: string } | null;
  private_groups: { name: string } | null;
};
type IncomeSummary = { private_total: number; attendance_total: number };

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const fieldClass = "h-10 w-full rounded-md border border-input bg-background px-3";

export function AdminAccounts() {
  const { tx, lang } = useApp();
  const [prices, setPrices] = useState<Record<Stage, string>>({
    sec1: "0",
    sec2: "0",
    sec3: "0",
    prep3: "0",
  });
  const [groups, setGroups] = useState<PrivateGroup[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<PrivatePayment[]>([]);
  const [incomeSummary, setIncomeSummary] = useState<IncomeSummary>({
    private_total: 0,
    attendance_total: 0,
  });
  const [groupName, setGroupName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today);
  const [attendanceDate, setAttendanceDate] = useState(today);
  const [attendanceStage, setAttendanceStage] = useState<Stage>("sec1");
  const [attendeeCount, setAttendeeCount] = useState("");
  const [savingPrice, setSavingPrice] = useState<Stage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [priceResult, groupResult, attendanceResult, paymentResult] = await Promise.all([
      db.from("stage_lesson_prices").select("stage,price_per_lesson"),
      db.from("private_groups").select("id,name").order("created_at", { ascending: false }),
      db
        .from("attendance_sessions")
        .select("id,attendance_date,stage,attendee_count,price_per_student")
        .order("attendance_date", { ascending: false })
        .limit(30),
      db
        .from("private_payments")
        .select(
          "id,student_id,group_id,amount,payment_date,private_students(group_id),private_groups(name)",
        )
        .order("payment_date", { ascending: false })
        .limit(100),
    ]);
    const [allAttendanceResult, allPaymentResult] = await Promise.all([
      fetchAllRows<{ attendee_count: number; price_per_student: number }>((from, to) =>
        db.from("attendance_sessions").select("attendee_count,price_per_student").range(from, to),
      ),
      fetchAllRows<{ amount: number }>((from, to) =>
        db.from("private_payments").select("amount").range(from, to),
      ),
    ]);
    const firstError =
      priceResult.error ??
      groupResult.error ??
      attendanceResult.error ??
      paymentResult.error ??
      allAttendanceResult.error ??
      allPaymentResult.error;
    if (firstError) {
      toast.error(firstError.message);
      setLoading(false);
      return;
    }
    setPrices((current) => {
      const next = { ...current };
      for (const row of priceResult.data ?? []) {
        next[row.stage as Stage] = String(row.price_per_lesson);
      }
      return next;
    });
    const nextGroups = (groupResult.data ?? []) as PrivateGroup[];
    setGroups(nextGroups);
    setAttendance((attendanceResult.data ?? []) as Attendance[]);
    setPayments((paymentResult.data ?? []) as PrivatePayment[]);
    setIncomeSummary({
      attendance_total: (allAttendanceResult.data ?? []).reduce(
        (sum: number, record: { attendee_count: number; price_per_student: number }) =>
          sum + Number(record.attendee_count) * Number(record.price_per_student),
        0,
      ),
      private_total: (allPaymentResult.data ?? []).reduce(
        (sum: number, record: { amount: number }) => sum + Number(record.amount),
        0,
      ),
    });
    setSelectedGroup((current) =>
      nextGroups.some((group) => group.id === current) ? current : (nextGroups[0]?.id ?? ""),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const savePrice = async (stage: Stage) => {
    const price = Number(prices[stage]);
    if (!Number.isFinite(price) || price < 0) {
      toast.error(tx("أدخل سعرًا صحيحًا غير سالب.", "Enter a valid non-negative price."));
      return;
    }
    setSavingPrice(stage);
    const { error } = await db
      .from("stage_lesson_prices")
      .upsert({ stage, price_per_lesson: price }, { onConflict: "stage" });
    if (error) toast.error(error.message);
    else toast.success(tx("تم حفظ سعر الحصة.", "Lesson price saved."));
    setSavingPrice(null);
  };

  const addGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = groupName.trim();
    if (!name) return;
    const { data, error } = await db
      .from("private_groups")
      .insert({ name })
      .select("id,name")
      .single();
    if (error) return toast.error(error.message);
    setGroupName("");
    setSelectedGroup(data.id);
    await load();
  };

  const addPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(paymentAmount);
    if (!selectedGroup || !Number.isFinite(amount) || amount <= 0) {
      toast.error(
        tx("اختر مجموعة وأدخل مبلغًا صحيحًا.", "Select a group and enter a valid amount."),
      );
      return;
    }
    const { error } = await db
      .from("private_payments")
      .insert({ group_id: selectedGroup, amount, payment_date: paymentDate });
    if (error) return toast.error(error.message);
    setPaymentAmount("");
    await load();
    toast.success(tx("تم تسجيل المبلغ المحصّل.", "Payment recorded."));
  };

  const addAttendance = async (event: React.FormEvent) => {
    event.preventDefault();
    const count = Number(attendeeCount);
    const price = Number(prices[attendanceStage]);
    if (!Number.isInteger(count) || count < 0 || !Number.isFinite(price) || price < 0) {
      toast.error(
        tx("راجع عدد الحضور وسعر الحصة.", "Check the attendance count and lesson price."),
      );
      return;
    }
    const { error } = await db.from("attendance_sessions").insert({
      attendance_date: attendanceDate,
      stage: attendanceStage,
      attendee_count: count,
      price_per_student: price,
    });
    if (error) return toast.error(error.message);
    setAttendeeCount("");
    await load();
    toast.success(tx("تم تسجيل الحضور والدخل.", "Attendance and income recorded."));
  };

  const deleteRecord = async (table: "private_payments" | "attendance_sessions", id: string) => {
    if (!confirm(tx("هل تريد حذف هذا السجل؟", "Delete this record?"))) return;
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  };

  const attendanceIncome = (record: Attendance) =>
    Number(record.attendee_count) * Number(record.price_per_student);
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAGES.map((stage) => (
          <Card
            key={stage}
            className="border-primary/40 bg-gradient-to-br from-amber-50 via-card to-yellow-100 shadow-[0_8px_28px_-16px_hsl(var(--primary)/0.8)] dark:from-amber-950/40 dark:via-card dark:to-yellow-950/30"
          >
            <Label
              htmlFor={`lesson-price-${stage}`}
              className="font-bold text-amber-800 dark:text-amber-300"
            >
              {tx("سعر الحصة — ", "Lesson price — ")}
              {STAGE_LABEL[stage][lang]}
            </Label>
            <div className="mt-3 flex gap-2">
              <Input
                id={`lesson-price-${stage}`}
                type="number"
                min="0"
                step="0.01"
                value={prices[stage]}
                onChange={(event) => setPrices({ ...prices, [stage]: event.target.value })}
                className="border-amber-400/60 bg-background/80"
              />
              <Button disabled={savingPrice === stage} onClick={() => void savePrice(stage)}>
                {savingPrice === stage ? "…" : tx("حفظ", "Save")}
              </Button>
            </div>
          </Card>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="space-y-5 border-primary/35">
          <div className="flex items-center gap-3">
            <div className="icon-tile">
              <UsersRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black">{tx("مجموعات البرايفت", "Private groups")}</h2>
              <p className="text-sm text-muted-foreground">
                {tx(
                  "أنشئ مجموعة وسجّل المبالغ المحصّلة لها.",
                  "Create groups and record payments collected for each group.",
                )}
              </p>
            </div>
          </div>
          <form onSubmit={addGroup} className="flex gap-2">
            <Input
              placeholder={tx("اسم المجموعة", "Group name")}
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              required
            />
            <Button type="submit">
              <Plus className="me-1 h-4 w-4" />
              {tx("مجموعة", "Group")}
            </Button>
          </form>
          <div>
            <Label>{tx("المجموعة", "Group")}</Label>
            <select
              className={fieldClass}
              value={selectedGroup}
              onChange={(event) => setSelectedGroup(event.target.value)}
            >
              <option value="">{tx("اختر مجموعة", "Choose a group")}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          {selectedGroup && (
            <>
              <form onSubmit={addPayment} className="grid gap-2 sm:grid-cols-2">
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={tx("المبلغ المحصّل", "Amount collected")}
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  required
                />
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  required
                />
                <Button type="submit">{tx("تسجيل التحصيل", "Record payment")}</Button>
              </form>
            </>
          )}
          <div className="rounded-lg border border-amber-400/40 bg-amber-50/70 p-3 dark:bg-amber-950/20">
            <p className="font-bold text-amber-800 dark:text-amber-300">
              {tx("إجمالي التحصيل الخاص", "Private collections total")}
            </p>
            <p className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-300">
              {Number(incomeSummary.private_total).toLocaleString(
                lang === "ar" ? "ar-EG" : "en-EG",
              )}{" "}
              {tx("ج.م", "EGP")}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {tx("أحدث ١٠٠ عملية تحصيل", "Latest 100 payment records")}
          </p>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  {payment.private_groups?.name ??
                    groups.find((group) => group.id === payment.private_students?.group_id)?.name ??
                    "—"}
                </span>
                <span className="font-bold text-primary">
                  {Number(payment.amount).toLocaleString(lang === "ar" ? "ar-EG" : "en-EG")}{" "}
                  {tx("ج.م", "EGP")}
                </span>
                <span className="text-muted-foreground">{payment.payment_date}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void deleteRecord("private_payments", payment.id)}
                >
                  {tx("حذف", "Delete")}
                </Button>
              </div>
            ))}
            {!loading && payments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {tx("لا توجد تحصيلات خاصة مسجلة.", "No private payments recorded.")}
              </p>
            )}
          </div>
        </Card>

        <Card className="space-y-5 border-primary/35">
          <div className="flex items-center gap-3">
            <div className="icon-tile">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black">
                {tx("الحضور والدخل اليومي", "Attendance and daily income")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {tx(
                  "يُحسب دخل الحصة من عدد الحضور مضروبًا في سعر المرحلة المحفوظ وقت التسجيل.",
                  "Session income uses the attendee count multiplied by that stage's saved price.",
                )}
              </p>
            </div>
          </div>
          <form onSubmit={addAttendance} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{tx("التاريخ", "Date")}</Label>
              <Input
                type="date"
                value={attendanceDate}
                onChange={(event) => setAttendanceDate(event.target.value)}
                required
              />
            </div>
            <div>
              <Label>{tx("المرحلة", "Stage")}</Label>
              <select
                className={fieldClass}
                value={attendanceStage}
                onChange={(event) => setAttendanceStage(event.target.value as Stage)}
              >
                {STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_LABEL[stage][lang]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{tx("عدد الحضور", "Attendees")}</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={attendeeCount}
                onChange={(event) => setAttendeeCount(event.target.value)}
                required
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" type="submit">
                <CircleDollarSign className="me-2 h-4 w-4" />
                {tx("تسجيل الحضور والدخل", "Save attendance and income")}
              </Button>
            </div>
          </form>
          <div className="rounded-lg border border-amber-400/40 bg-amber-50/70 p-3 dark:bg-amber-950/20">
            <p className="font-bold text-amber-800 dark:text-amber-300">
              {tx("إجمالي دخل الحضور المسجل", "Recorded attendance income total")}
            </p>
            <p className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-300">
              {Number(incomeSummary.attendance_total).toLocaleString(
                lang === "ar" ? "ar-EG" : "en-EG",
              )}{" "}
              {tx("ج.م", "EGP")}
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-4 gap-2 bg-amber-100/70 px-3 py-2 text-xs font-bold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <span>{tx("التاريخ", "Date")}</span>
              <span>{tx("المرحلة", "Stage")}</span>
              <span className="text-center">{tx("الحضور", "Attendees")}</span>
              <span className="text-end">{tx("الدخل", "Income")}</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {attendance.map((record) => (
                <div
                  key={record.id}
                  className="grid grid-cols-4 items-center gap-2 border-t px-3 py-2 text-sm"
                >
                  <span>{record.attendance_date}</span>
                  <span>{STAGE_LABEL[record.stage][lang]}</span>
                  <span className="text-center">{record.attendee_count}</span>
                  <span className="flex items-center justify-end gap-2 font-bold text-amber-700 dark:text-amber-300">
                    {attendanceIncome(record).toLocaleString(lang === "ar" ? "ar-EG" : "en-EG")}{" "}
                    {tx("ج.م", "EGP")}
                    <button
                      type="button"
                      className="text-xs text-destructive"
                      onClick={() => void deleteRecord("attendance_sessions", record.id)}
                    >
                      {tx("حذف", "Delete")}
                    </button>
                  </span>
                </div>
              ))}
              {!loading && attendance.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">
                  {tx("لا توجد جلسات مسجلة.", "No attendance sessions recorded.")}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
