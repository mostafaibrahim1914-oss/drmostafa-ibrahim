import { useState, type ReactNode } from "react";
import { ChevronLeft, LogOut, PanelRightClose, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/site/shared";
import { Bubbles } from "@/components/site/Bubbles";
import { LOGO_URL, useApp } from "@/lib/app-context";

export type DashboardItem = { value: string; label: string; icon: LucideIcon };

export function DashboardShell({ items, active, onChange, children }: { items: DashboardItem[]; active: string; onChange: (value: string) => void; children: ReactNode }) {
  const { profile, tx, signOut } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="relative min-h-screen bg-background lg:flex lg:flex-row-reverse">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-40" aria-hidden>
        <div className="absolute -top-32 start-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 end-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <Bubbles count={14} />
      </div>
      <aside className={`sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-s border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 lg:flex ${collapsed ? "w-20" : "w-64"}`}>
        <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={LOGO_URL} alt="Researcher" className="h-11 w-11 shrink-0 rounded-xl shadow-gold" />
            {!collapsed && <div className="min-w-0"><p className="truncate font-display text-sm font-extrabold text-primary">RESEARCHER</p><p className="truncate text-xs text-sidebar-foreground/60">Mostafa Ibrahim</p></div>}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCollapsed((v) => !v)} aria-label={tx("طي القائمة", "Collapse menu")}>
            {collapsed ? <ChevronLeft /> : <PanelRightClose />}
          </Button>
        </div>
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
          {items.map((item) => (
            <Button key={item.value} variant="ghost" onClick={() => onChange(item.value)} title={item.label}
              className={`group h-12 w-full justify-start gap-3 ${active === item.value ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition ${active === item.value ? "bg-primary-foreground/15" : "bg-primary/10 text-primary group-hover:scale-110"}`}><item.icon className="h-[18px] w-[18px]" /></span>{!collapsed && <span>{item.label}</span>}
            </Button>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className={`mb-3 flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <Avatar path={profile?.avatar_url} size={40} />
            {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-bold">{profile?.full_name}</p><p className="text-xs text-sidebar-foreground/55">{tx("حساب موثّق", "Verified account")}</p></div>}
          </div>
          <Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground/60" onClick={signOut}><LogOut className="h-5 w-5" />{!collapsed && tx("تسجيل الخروج", "Sign out")}</Button>
        </div>
      </aside>
      <div className="relative z-10 min-w-0 flex-1">{children}</div>
      <div className="fixed inset-x-3 bottom-3 z-50 flex justify-around overflow-x-auto rounded-2xl border bg-card/95 p-2 shadow-xl backdrop-blur-xl lg:hidden">
        {items.map((item) => <Button key={item.value} size="icon" variant={active === item.value ? "default" : "ghost"} onClick={() => onChange(item.value)} aria-label={item.label}><item.icon /></Button>)}
      </div>
    </div>
  );
}