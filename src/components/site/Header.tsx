import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, Languages, LogOut, Moon, Sun, LayoutDashboard } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { LOGO_URL, type Stage, useApp } from "@/lib/app-context";

type Notif = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read_by: unknown;
  link_data?: { type?: string; attempt_id?: string; stage?: Stage } | null;
};

function NotificationsBell() {
  const { session, tx, isAdmin } = useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const uid = session?.user.id ?? "";

  const load = useCallback(async () => {
    let query = supabase
      .from("notifications")
      .select("id,title,body,created_at,read_by,link_data")
      .order("created_at", { ascending: false })
      .limit(100);
    if (isAdmin) query = query.eq("audience", "admin");
    const { data, error } = await query;
    if (
      error &&
      (error.code === "42703" || error.code === "PGRST204" || error.message.includes("link_data"))
    ) {
      let legacyQuery = supabase
        .from("notifications")
        .select("id,title,body,created_at,read_by")
        .order("created_at", { ascending: false })
        .limit(100);
      if (isAdmin) legacyQuery = legacyQuery.eq("audience", "admin");
      const legacy = await legacyQuery;
      setItems((legacy.data as Notif[]) ?? []);
      return;
    }
    setItems((data as Notif[]) ?? []);
  }, [isAdmin]);
  useEffect(() => {
    if (!uid) return;
    void load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [uid, load]);

  const isNew = (n: Notif) => !(Array.isArray(n.read_by) && n.read_by.includes(uid));
  const unread = items.filter(isNew).length;
  const [onlyNew, setOnlyNew] = useState(true);
  const shown = onlyNew ? items.filter(isNew) : items;
  const markAll = async () => {
    const snapshot = items;
    setItems((current) =>
      current.map((item) => ({
        ...item,
        read_by: Array.from(new Set([...(Array.isArray(item.read_by) ? item.read_by : []), uid])),
      })),
    );
    const { error } = await supabase.rpc("mark_notifications_read");
    if (error) {
      setItems(snapshot);
      return;
    }
    setOnlyNew(true);
    await load();
  };
  const markOne = async (notification: Notif) => {
    setItems((current) =>
      current.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              read_by: Array.from(
                new Set([...(Array.isArray(item.read_by) ? item.read_by : []), uid]),
              ),
            }
          : item,
      ),
    );
    const { error } = await supabase.rpc("mark_notification_read", {
      _notification_id: notification.id,
    });
    if (error) {
      await supabase.rpc("mark_notifications_read");
      await load();
    }
  };
  const openNotification = async (notification: Notif) => {
    const text = `${notification.title} ${notification.body}`;
    const target = notification.link_data;
    if (isAdmin && target?.type === "essay_submission" && target.attempt_id) {
      const detail = { attemptId: target.attempt_id, stage: target.stage };
      if (window.location.pathname !== "/admin") {
        sessionStorage.setItem("researcher-grading-target", JSON.stringify(detail));
        await navigate({ to: "/admin" });
      } else {
        window.dispatchEvent(new CustomEvent("dashboard:grade-attempt", { detail }));
      }
    } else {
      const section = /امتحان|كويز|تصحيح/.test(text)
        ? "exams"
        : /محاضرة|فيديو|كود/.test(text)
          ? "lectures"
          : /طالب|تسجيل|حساب/.test(text)
            ? isAdmin
              ? "students"
              : "me"
            : "home";
      window.dispatchEvent(new CustomEvent("dashboard:navigate", { detail: section }));
    }
    if (isNew(notification)) await markOne(notification);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={tx("الإشعارات", "Notifications")}
        >
          <Bell
            className={`h-5 w-5 ${unread ? "animate-[icon-float_1.8s_ease-in-out_infinite]" : ""}`}
          />
          {unread > 0 && (
            <span className="absolute -top-0.5 -end-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <span className="font-bold">{tx("الإشعارات", "Notifications")}</span>
          <Button
            size="sm"
            variant="ghost"
            disabled={!unread}
            onClick={markAll}
            className="h-8 gap-1 text-primary"
          >
            <CheckCheck className="h-4 w-4" />
            {tx("تمت القراءة", "Mark all read")}
          </Button>
        </div>
        <div className="flex gap-1 border-b p-2">
          <Button
            size="sm"
            variant={onlyNew ? "default" : "ghost"}
            className="h-7 flex-1"
            onClick={() => setOnlyNew(true)}
          >
            {tx("الجديد", "New")} ({unread})
          </Button>
          <Button
            size="sm"
            variant={!onlyNew ? "default" : "ghost"}
            className="h-7 flex-1"
            onClick={() => setOnlyNew(false)}
          >
            {tx("الكل", "All")}
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto overscroll-contain">
          {shown.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {onlyNew
                ? tx("لا توجد إشعارات جديدة", "No new notifications")
                : tx("لا توجد إشعارات", "No notifications")}
            </p>
          )}
          {shown.map((n) => (
            <button
              type="button"
              onClick={() => openNotification(n)}
              key={n.id}
              className={`block w-full border-b px-4 py-3 text-start text-sm transition hover:bg-primary/10 ${isNew(n) ? "border-s-2 border-s-primary bg-primary/5" : "opacity-70"}`}
            >
              <div className="font-semibold">{n.title}</div>
              {n.body && <div className="text-muted-foreground">{n.body}</div>}
              <div className="mt-1 text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Header() {
  const { tx, lang, setLang, dark, toggleDark, session, isAdmin, signOut } = useApp();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={LOGO_URL} alt="Researcher" className="h-11 w-11 rounded-full shadow-gold" />
          <div className="leading-tight">
            <div className="font-display text-base font-bold tracking-wide text-gold-gradient">
              Researcher
            </div>
            <div className="text-xs text-muted-foreground">
              {tx("مصطفى إبراهيم", "Mostafa Ibrahim")}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
            <Languages className="h-4 w-4" />
            <span className="hidden sm:inline">{lang === "ar" ? "English" : "العربية"}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="theme">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          {session ? (
            <>
              <NotificationsBell />
              <Button size="sm" onClick={() => navigate({ to: isAdmin ? "/admin" : "/student" })}>
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">{tx("لوحتي", "Dashboard")}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={tx("خروج", "Sign out")}
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/", replace: true });
                }}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth" search={{ mode: "login" }}>
                  {tx("دخول", "Sign in")}
                </Link>
              </Button>
              <Button size="sm" asChild className="bg-gold-gradient shadow-gold">
                <Link to="/auth" search={{ mode: "signup" }}>
                  {tx("إنشاء حساب", "Sign up")}
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
