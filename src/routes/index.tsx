import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, ChartNoAxesCombined, CheckCircle2, ClipboardCheck, LockKeyhole, MessageCircle, PlayCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bubbles } from "@/components/site/Bubbles";
import { Header } from "@/components/site/Header";
import { LOGO_URL, STAGES, STAGE_LABEL, useApp } from "@/lib/app-context";
import hero from "@/assets/hero-egypt.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Researcher | منصة مصطفى إبراهيم التعليمية" },
    { name: "description", content: "منصة تعليمية في التاريخ والمصريات لطلاب الإعدادي والثانوي: فيديوهات، امتحانات تفاعلية، تقارير وترتيب الأوائل." },
    { property: "og:title", content: "Researcher | Mostafa Ibrahim" },
    { property: "og:description", content: "History & Egyptology learning platform with videos, interactive exams and progress reports." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Index,
});

function Index() {
  const { tx, lang, session, isAdmin } = useApp();
  const features = [
    { icon: Video, t: tx("فيديوهات منظمة", "Organized videos"), d: tx("شرح كامل مقسم لوحدات لكل مرحلة", "Full lessons organized into units") },
    { icon: ClipboardCheck, t: tx("امتحانات تفاعلية", "Interactive exams"), d: tx("تصحيح فوري ومراجعة دقيقة", "Instant grading and review") },
    { icon: ChartNoAxesCombined, t: tx("متابعة التقدم", "Progress tracking"), d: tx("تقرير أداء واضح لكل طالب", "Clear reports for every student") },
    { icon: MessageCircle, t: tx("متابعة مستمرة", "Always supported"), d: tx("إشعارات بكل جديد", "Updates for new content") },
  ];
  return <div className="min-h-screen bg-background">
    <Header />
    <section className="relative isolate min-h-[650px] overflow-hidden border-b">
      <img src={hero} alt="آثار مصرية" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-l from-navy-deep via-navy-deep/85 to-navy-deep/55" />
      <Bubbles count={12} />
      <div className="mx-auto grid min-h-[650px] max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.15fr_.85fr]">
        <div className="animate-fade-up text-secondary-foreground">
          <div className="mb-7 flex items-center gap-4"><img src={LOGO_URL} alt="Researcher" className="h-20 w-20 rounded-lg shadow-gold"/><div><p className="font-display text-xl font-extrabold text-primary md:text-2xl">Researcher / Mostafa Ibrahim</p><p className="text-sm text-secondary-foreground/65">Egyptology & Ancient Near East</p></div></div>
          <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm text-gold-soft">{tx("منصة تعليمية احترافية متخصصة في التاريخ", "A professional history learning platform")}</span>
          <h1 className="mt-6 max-w-3xl text-5xl font-black leading-tight md:text-7xl">{tx("رحلتك لفهم التاريخ", "Your journey through history")}<br/><span className="text-gold-gradient">{tx("تبدأ من هنا", "starts here")}</span></h1>
          <p className="mt-5 max-w-2xl text-lg text-secondary-foreground/75">{tx("تعلم التاريخ بطريقة شيقة وسهلة مع أفضل المحتويات والاختبارات التفاعلية ومتابعة دقيقة لتقدمك.", "Learn history through focused lessons, interactive exams and precise progress tracking.")}</p>
          <div className="mt-8 flex flex-wrap gap-3">{session ? <Button size="lg" asChild><Link to={isAdmin ? "/admin" : "/student"}>{tx("افتح لوحتك", "Open dashboard")}</Link></Button> : <><Button size="lg" asChild><Link to="/auth" search={{mode:"signup"}}>{tx("إنشاء حساب جديد", "Create account")}<ArrowLeft/></Link></Button><Button size="lg" variant="outline" asChild className="border-primary/50 bg-navy-deep/40 text-secondary-foreground"><Link to="/auth" search={{mode:"login"}}>{tx("تسجيل الدخول", "Sign in")}</Link></Button></>}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">{features.map((f)=><div key={f.t} className="rounded-lg border border-primary/20 bg-navy-deep/75 p-5 text-secondary-foreground backdrop-blur-md transition hover:-translate-y-1 hover:border-primary/60"><div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-primary text-primary-foreground"><f.icon className="h-5 w-5"/></div><h3 className="font-bold">{f.t}</h3><p className="mt-1 text-sm text-secondary-foreground/60">{f.d}</p></div>)}</div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-16">
      <div className="grid gap-4 md:grid-cols-3">{[{n:"4",l:tx("مراحل دراسية","Study stages"),i:BookOpen},{n:"24/7",l:tx("وصول للمحاضرات","Lecture access"),i:PlayCircle},{n:"100%",l:tx("متابعة دقيقة","Clear tracking"),i:ChartNoAxesCombined}].map((s)=><div key={s.n} className="flex items-center gap-5 rounded-lg border bg-card p-6"><div className="grid h-14 w-14 place-items-center rounded-lg bg-primary/15 text-primary"><s.i/></div><div><strong className="font-display text-3xl text-primary">{s.n}</strong><p className="text-sm text-muted-foreground">{s.l}</p></div></div>)}</div>
      <div className="mt-16"><p className="text-sm font-bold text-primary">RESEARCHER ACADEMY</p><h2 className="mt-2 text-3xl font-black">{tx("كل ما تحتاجه للتفوق", "Everything you need to excel")}</h2></div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{i:Video,t:tx("مكتبة فيديو منظمة","Organized video library")},{i:LockKeyhole,t:tx("محتوى آمن بالأكواد","Secure coded content")},{i:ClipboardCheck,t:tx("امتحانات فورية","Instant exams")},{i:CheckCircle2,t:tx("مراجعة بعد الإغلاق","Review after closing")}].map((x)=><div key={x.t} className="rounded-lg border bg-card p-6"><x.i className="h-7 w-7 text-primary"/><h3 className="mt-5 font-bold">{x.t}</h3></div>)}</div>
    </section>
    <section className="border-y bg-card/50"><div className="mx-auto grid max-w-7xl gap-4 px-5 py-12 sm:grid-cols-4">{STAGES.map((s)=><div key={s} className="rounded-lg border bg-background p-5 text-center transition hover:border-primary/60"><div className="font-display text-2xl text-primary">𓂀</div><div className="mt-2 font-bold">{STAGE_LABEL[s][lang]}</div></div>)}</div></section>
    <section className="mx-auto max-w-7xl px-5 py-16"><div className="flex flex-col items-center justify-between gap-6 rounded-lg border border-primary/30 bg-navy-deep p-8 text-secondary-foreground md:flex-row"><div><h2 className="text-2xl font-black">{tx("جاهز تبدأ رحلتك؟","Ready to start your journey?")}</h2><p className="mt-2 text-secondary-foreground/60">{tx("أنشئ حسابك وانتظر التفعيل من المدرس.","Create your account and wait for approval.")}</p></div><Button size="lg" asChild><Link to="/auth" search={{mode:"signup"}}>{tx("إنشاء حساب جديد","Create account")}<ArrowLeft/></Link></Button></div></section>
    <footer className="border-t py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} Researcher — {tx("مصطفى إبراهيم", "Mostafa Ibrahim")}</footer>
  </div>;
}