import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Languages, LogOut, Moon, Sun, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { LOGO_URL, useApp } from "@/lib/app-context";

type Notif = { id: string; title: string; body: string; created_at: string; read_by: unknown };

function NotificationsBell() {
  const { session, tx } = useApp();
  const [items, setItems] = useState<Notif[]>([]);
  const uid = session?.user.id ?? "";

  const load = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id,title,body,created_at,read_by")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as Notif[]) ?? []);
  };
  useEffect(() => {
    if (!uid) return;
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [uid]);

  const unread = items.filter((n) => !(Array.isArray(n.read_by) && n.read_by.includes(uid))).length;

  return (
    <Popover
      onOpenChange={async (o) => {
        if (!o && unread) {
          await supabase.rpc("mark_notifications_read");
          load();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={tx("الإشعارات", "Notifications")}>
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -end-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 font-bold">{tx("الإشعارات", "Notifications")}</div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">{tx("لا توجد إشعارات", "No notifications")}</p>
          )}
          {items.map((n) => {
            const isNew = !(Array.isArray(n.read_by) && n.read_by.includes(uid));
            return (
              <div key={n.id} className={`border-b px-4 py-3 text-sm ${isNew ? "bg-accent/50" : ""}`}>
                <div className="font-semibold">{n.title}</div>
                {n.body && <div className="text-muted-foreground">{n.body}</div>}
                <div className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            );
          })}
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
            <div className="font-display text-base font-bold tracking-wide text-gold-gradient">Researcher</div>
            <div className="text-xs text-muted-foreground">{tx("مصطفى إبراهيم", "Mostafa Ibrahim")}</div>
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
                <Link to="/auth" search={{ mode: "login" }}>{tx("دخول", "Sign in")}</Link>
              </Button>
              <Button size="sm" asChild className="bg-gold-gradient shadow-gold">
                <Link to="/auth" search={{ mode: "signup" }}>{tx("إنشاء حساب", "Sign up")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
