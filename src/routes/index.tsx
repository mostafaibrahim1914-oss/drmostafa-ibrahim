import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, BookOpen, ClipboardCheck, LineChart, MessageCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bubbles } from "@/components/site/Bubbles";
import { Header } from "@/components/site/Header";
import { LOGO_URL, STAGES, STAGE_LABEL, useApp } from "@/lib/app-context";
import hero from "@/assets/hero-egypt.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Researcher | منصة مصطفى إبراهيم التعليمية" },
      { name: "description", content: "منصة تعليمية في التاريخ والمصريات لطلاب الإعدادي والثانوي: فيديوهات، امتحانات تفاعلية، تقارير وترتيب الأوائل." },
      { property: "og:title", content: "Researcher | Mostafa Ibrahim" },
      { property: "og:description", content: "History & Egyptology learning platform with videos, interactive exams and progress reports." },
    ],
  }),
  component: Index,
});

function Index() {
  const { tx, lang, session, isAdmin } = useApp();
  const features = [
    { icon: Video, t: tx("فيديوهات منظمة", "Organized videos"), d: tx("شرح كامل مقسم لوحدات لكل مرحلة", "Full lessons organized into units per stage") },
    { icon: ClipboardCheck, t: tx("امتحانات تفاعلية", "Interactive exams"), d: tx("تصحيح فوري ومراجعة الأخطاء بعد غلق الامتحان", "Instant grading and mistake review after closing") },
    { icon: LineChart, t: tx("متابعة التقدم", "Progress tracking"), d: tx("تقرير أداء مفصل لكل طالب", "Detailed performance report for every student") },
    { icon: Award, t: tx("لوحة الأوائل", "Leaderboard"), d: tx("تنافس مع زملائك على المراكز الأولى", "Compete for the top spots in your stage") },
    { icon: MessageCircle, t: tx("متابعة مستمرة", "Always supported"), d: tx("إشعارات بكل جديد من فيديوهات وامتحانات", "Notifications for every new video and exam") },
    { icon: BookOpen, t: tx("4 مراحل دراسية", "4 grade levels"), d: tx("الثالث الإعدادي والمرحلة الثانوية كاملة", "3rd Prep and all Secondary grades") },
  ];
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="relative isolate overflow-hidden">
        <img src={hero} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-deep/85 via-navy-deep/75 to-background" />
        <Bubbles />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 md:grid-cols-[1.3fr_1fr] md:py-28">
          <div className="animate-fade-up text-secondary-foreground">
            <span className="inline-block rounded-full border border-primary/50 bg-primary/10 px-4 py-1 text-sm text-gold-soft">
              {tx("ماجستير — محاضر في المصريات والشرق الأدنى القديم", "MA — Lecturer in Egyptology & Ancient Near East")}
            </span>
            <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl" style={{ color: "var(--secondary-foreground)" }}>
              {tx("اكتشف التاريخ", "Discover history")}{" "}
              <span className="text-gold-gradient">{tx("مع الباحث", "with the Researcher")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg opacity-85">
              {tx(
                "منصة Researcher للأستاذ مصطفى إبراهيم — شرح ممتع، امتحانات إلكترونية، ومتابعة دقيقة لمستواك حتى التفوق.",
                "Researcher by Mostafa Ibrahim — engaging lessons, online exams and close follow-up until you excel.",
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {session ? (
                <Button size="lg" asChild className="bg-gold-gradient shadow-gold">
                  <Link to={isAdmin ? "/admin" : "/student"}>{tx("ادخل لوحتك", "Open dashboard")}</Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" asChild className="bg-gold-gradient shadow-gold">
                    <Link to="/auth" search={{ mode: "signup" }}>{tx("ابدأ الآن مجاناً", "Start now")}</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="border-primary/60 bg-transparent text-gold-soft hover:bg-primary/10">
                    <Link to="/auth" search={{ mode: "login" }}>{tx("تسجيل الدخول", "Sign in")}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="relative mx-auto hidden aspect-square w-80 md:block">
            <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-dashed border-primary/40" />
            <div className="absolute inset-6 rounded-full bg-primary/10 blur-2xl" />
            <img src={LOGO_URL} alt="Researcher logo" className="absolute inset-8 rounded-full shadow-gold" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-3xl font-black">{tx("ليه Researcher؟", "Why Researcher?")}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div key={i} className="animate-fade-up rounded-2xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-gold" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gold-gradient text-primary-foreground">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{f.t}</h3>
              <p className="mt-1 text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-card/50">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:grid-cols-4">
          {STAGES.map((s) => (
            <div key={s} className="rounded-xl border bg-background p-5 text-center">
              <div className="font-display text-2xl text-gold-gradient">𓂀</div>
              <div className="mt-2 font-bold">{STAGE_LABEL[s][lang]}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Researcher — {tx("مصطفى إبراهيم", "Mostafa Ibrahim")}
      </footer>
    </div>
  );
}
