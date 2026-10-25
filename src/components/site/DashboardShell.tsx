import { useState, type ReactNode } from "react";
import { ChevronLeft, LogOut, PanelRightClose, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/site/shared";
import { Bubbles } from "@/components/site/Bubbles";
import { LOGO_URL, useApp } from "@/lib/app-context";

export type DashboardItem = { value: string; label: string; icon: LucideIcon };

export function DashboardShell({
  items,
  active,
  onChange,
  children,
}: {
  items: DashboardItem[];
  active: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const { profile, tx, signOut } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="relative min-h-screen bg-background lg:flex lg:flex-row-reverse">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-40" aria-hidden>
        <div className="absolute -top-32 start-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 end-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <Bubbles count={14} />
      </div>
      <aside
        className={`sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-s border-sidebar-border bg-sidebar/95 text-sidebar-foreground shadow-xl backdrop-blur-xl transition-[width] duration-300 lg:flex ${collapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex h-20 items-center justify-between border-b border-sidebar-border/80 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={LOGO_URL}
              alt="Researcher"
              className="h-11 w-11 shrink-0 rounded-2xl border border-primary/25 shadow-gold"
            />
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-extrabold tracking-wide text-primary">
                  RESEARCHER
                </p>
                <p className="truncate text-xs text-sidebar-foreground/60">Mostafa Ibrahim</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={tx("طي القائمة", "Collapse menu")}
          >
            {collapsed ? <ChevronLeft /> : <PanelRightClose />}
          </Button>
        </div>
        <nav
          aria-label={tx("التنقل الرئيسي", "Main navigation")}
          className="flex-1 space-y-1.5 overflow-y-auto p-3"
        >
          {items.map((item) => {
            const isActive = active === item.value;
            return (
              <Button
                key={item.value}
                variant="ghost"
                onClick={() => onChange(item.value)}
                title={item.label}
                aria-current={isActive ? "page" : undefined}
                className={`group relative h-12 w-full justify-start gap-3 overflow-hidden rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-l from-primary to-amber-400 text-primary-foreground shadow-[0_8px_20px_-12px_hsl(var(--primary))] hover:from-primary hover:to-amber-400"
                    : "text-sidebar-foreground/70 hover:translate-x-[-2px] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                {isActive && (
                  <span className="absolute inset-y-2 start-0 w-1 rounded-e-full bg-primary-foreground/80" />
                )}
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition-all duration-200 ${
                    isActive
                      ? "border-primary-foreground/20 bg-primary-foreground/15"
                      : "border-primary/10 bg-primary/[0.08] text-primary group-hover:scale-105 group-hover:border-primary/25 group-hover:bg-primary/15"
                  }`}
                >
                  <item.icon className="h-[19px] w-[19px]" strokeWidth={1.8} />
                </span>
                {!collapsed && <span className="truncate text-sm font-semibold">{item.label}</span>}
              </Button>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border/80 p-3">
          <div className={`mb-3 flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <Avatar path={profile?.avatar_url} size={40} />
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{profile?.full_name}</p>
                <p className="text-xs text-sidebar-foreground/55">
                  {tx("حساب موثّق", "Verified account")}
                </p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            className={`w-full gap-3 rounded-xl text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive ${collapsed ? "justify-center px-0" : "justify-start"}`}
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" strokeWidth={1.8} />
            {!collapsed && tx("تسجيل الخروج", "Sign out")}
          </Button>
        </div>
      </aside>
      <div className="relative z-10 min-w-0 flex-1">{children}</div>
      <nav
        aria-label={tx("التنقل الرئيسي", "Main navigation")}
        className="fixed inset-x-3 bottom-3 z-50 flex max-w-[calc(100vw-1.5rem)] gap-1 overflow-x-auto rounded-2xl border border-primary/15 bg-card/90 p-2 shadow-[0_12px_40px_-16px_hsl(var(--foreground)/0.35)] backdrop-blur-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden"
      >
        {items.map((item) => {
          const isActive = active === item.value;
          return (
            <Button
              key={item.value}
              variant="ghost"
              onClick={() => onChange(item.value)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`h-[3.75rem] min-w-[4rem] flex-none flex-col gap-1 rounded-xl px-2 py-1.5 ${
                isActive
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span
                className={`grid h-7 w-8 place-items-center rounded-lg transition-colors ${
                  isActive
                    ? "bg-gradient-to-br from-primary to-amber-400 text-primary-foreground shadow-sm"
                    : ""
                }`}
              >
                <item.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <span className="max-w-[4.5rem] truncate text-[10px] font-semibold leading-none">
                {item.label}
              </span>
            </Button>
          );
        })}
      </nav>
    </div>
  );
}
