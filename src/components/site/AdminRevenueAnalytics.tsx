import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, RefreshCw, UsersRound } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Card, db } from "@/components/site/shared";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { useApp } from "@/lib/app-context";

const MONTHLY_FEE_EGP = 50;
const REPORT_MONTHS = 12;

type StudentBillingStatus = {
  id: string;
  created_at: string;
  status: string;
};

type MonthlyEstimate = {
  key: string;
  label: string;
  studentCount: number;
  estimatedIncome: number;
};

function formatEGP(amount: number, lang: "ar" | "en") {
  const formattedAmount = new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-EG").format(amount);
  return lang === "ar" ? `${formattedAmount} ج.م` : `${formattedAmount} EGP`;
}

export function AdminRevenueAnalytics() {
  const { tx, lang } = useApp();
  const [students, setStudents] = useState<StudentBillingStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [profilesResult, rolesResult] = await Promise.all([
      db.from("profiles").select("id,created_at,status").order("created_at"),
      db.from("user_roles").select("user_id").eq("role", "admin"),
    ]);

    if (profilesResult.error || rolesResult.error) {
      setStudents(null);
      setError(profilesResult.error?.message ?? rolesResult.error?.message ?? "Unable to load student data.");
      setLoading(false);
      return;
    }

    const adminIds = new Set((rolesResult.data ?? []).map((role: { user_id: string }) => role.user_id));
    setStudents(
      (profilesResult.data ?? []).filter(
        (student: StudentBillingStatus) => !adminIds.has(student.id),
      ),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const report = useMemo(() => {
    if (!students) return null;

    const now = new Date();
    const nowMs = now.getTime();
    const approvedStudents = students.filter((student) => student.status === "approved");
    const months: MonthlyEstimate[] = Array.from({ length: REPORT_MONTHS }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - (REPORT_MONTHS - 1 - index), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
      const cutoff = monthEnd.getTime() > nowMs ? nowMs : monthEnd.getTime();
      const studentCount = approvedStudents.filter((student) => {
        const createdAt = Date.parse(student.created_at);
        return Number.isFinite(createdAt) && createdAt <= cutoff;
      }).length;

      return {
        key: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
        label: month.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-EG", {
          month: "short",
          year: "2-digit",
        }),
        studentCount,
        estimatedIncome: studentCount * MONTHLY_FEE_EGP,
      };
    });

    return { months, activeStudents: months.at(-1)?.studentCount ?? 0 };
  }, [students, lang]);

  const chartConfig: ChartConfig = {
    estimatedIncome: {
      label: tx("الدخل التقديري", "Estimated income"),
      color: "hsl(var(--primary))",
    },
  };

  return (
    <Card className="mb-5 space-y-5 border-primary/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Coins className="h-5 w-5 text-primary" />
            {tx("تحليل الدخل الشهري", "Monthly income analysis")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tx(
              "تقدير على أساس ٥٠ ج.م شهرياً لكل طالب معتمد. تُستبعد الحسابات المعلّقة والموقوفة.",
              "Estimated at EGP 50 per approved student each month. Pending and blocked accounts are excluded.",
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          aria-label={tx("تحديث الإحصائية", "Refresh statistics")}
        >
          <RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {tx("تحديث", "Refresh")}
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive">{tx("تعذر تحميل بيانات الطلاب", "Could not load student data")}: {error}</p>
          <Button className="mt-3" variant="outline" size="sm" onClick={() => void load()}>
            {tx("إعادة المحاولة", "Try again")}
          </Button>
        </div>
      ) : loading || !report ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {tx("جارٍ تحميل الإحصائيات…", "Loading statistics…")}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border bg-background/60 p-4">
              <div className="icon-tile"><UsersRound className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{tx("الطلاب النشطون الآن", "Active students now")}</p>
                <p className="text-2xl font-black">{report.activeStudents}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-background/60 p-4">
              <div className="icon-tile"><Coins className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{tx("الدخل الشهري التقديري الآن", "Estimated monthly income now")}</p>
                <p className="text-2xl font-black text-primary">
                  {formatEGP(report.activeStudents * MONTHLY_FEE_EGP, lang)}
                </p>
              </div>
            </div>
          </div>

          <ChartContainer config={chartConfig} className="h-64 w-full aspect-auto">
            <BarChart data={report.months} accessibilityLayer>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={58}
                tickFormatter={(value: number) => new Intl.NumberFormat(
                  lang === "ar" ? "ar-EG" : "en-EG",
                  { notation: "compact", maximumFractionDigits: 1 },
                ).format(value)}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const month = payload[0]?.payload as MonthlyEstimate;
                  return (
                    <div className="rounded-lg border bg-background p-3 text-sm shadow-lg">
                      <p className="mb-2 font-bold">{month.label}</p>
                      <p>{tx("عدد الطلاب النشطين", "Active students")}: <strong>{month.studentCount}</strong></p>
                      <p>{tx("الدخل التقديري", "Estimated income")}: <strong>{formatEGP(month.estimatedIncome, lang)}</strong></p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="estimatedIncome"
                fill="var(--color-estimatedIncome)"
                radius={[5, 5, 0, 0]}
                maxBarSize={42}
              />
            </BarChart>
          </ChartContainer>

          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-3 gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-bold text-muted-foreground sm:px-4">
              <span>{tx("الشهر", "Month")}</span>
              <span className="text-center">{tx("الطلاب النشطون", "Active students")}</span>
              <span className="text-end">{tx("الدخل التقديري", "Estimated income")}</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {[...report.months].reverse().map((month) => (
                <div key={month.key} className="grid grid-cols-3 gap-2 border-b px-3 py-2 text-sm last:border-0 sm:px-4">
                  <span>{month.label}</span>
                  <span className="text-center">{month.studentCount}</span>
                  <span className="text-end font-semibold">{formatEGP(month.estimatedIncome, lang)}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            {tx(
              "تقدير آخر ١٢ شهراً حسب تاريخ إنشاء الحساب وحالته الحالية؛ لا يمثل سجل المدفوعات الفعلي أو تاريخ الموافقة.",
              "Estimate for the last 12 months, based on account creation dates and current status; it is not a record of actual payments or approval dates.",
            )}
          </p>
        </>
      )}
    </Card>
  );
}
