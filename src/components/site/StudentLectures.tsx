import { useEffect, useState } from "react";
import { BookOpen, LockKeyhole, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Bubbles } from "@/components/site/Bubbles";
import { db, VideoPlayer } from "@/components/site/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp, useSignedUrl } from "@/lib/app-context";

function LectureCard({ video, unlocked, refresh }: { video: any; unlocked: boolean; refresh: () => void }) {
  const { tx } = useApp();
  const cover = useSignedUrl("media", video.cover_image_url);
  const [code, setCode] = useState("");
  const [watching, setWatching] = useState(false);
  const redeem = async () => {
    const { data } = await db.rpc("redeem_code", { _code: code, _video_id: video.id });
    if (data?.ok) { toast.success(tx("تم فتح المحاضرة", "Lecture unlocked")); refresh(); }
    else toast.error(data?.error === "used" ? tx("الكود مستخدم لطالب آخر", "Code already used") : tx("الكود غير صحيح", "Invalid code"));
  };
  return <article className="group overflow-hidden rounded-lg border border-primary/30 bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-gold">
    <div className="relative aspect-video overflow-hidden bg-navy-deep">
      {watching && unlocked ? <VideoPlayer v={video} rememberProgress /> : <>
        {cover ? <img src={cover} alt={video.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-primary/30"><BookOpen className="h-16 w-16" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-transparent to-transparent" />
        <span className="absolute start-3 top-3 rounded-md border border-primary/50 bg-navy-deep/90 px-3 py-1 text-xs font-black text-primary shadow-gold">{video.is_locked ? `${video.price} ${tx("جنيه", "EGP")}` : tx("مجاني", "FREE")}</span>
        {unlocked ? <Button size="icon" className="absolute start-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-gold rtl:translate-x-1/2" aria-label={tx("تشغيل", "Play")} onClick={() => { localStorage.setItem("researcher-last-video", video.id); setWatching(true); }}><Play className="h-6 w-6 fill-current" /></Button> : <div className="absolute inset-0 grid place-items-center"><div className="rounded-full border border-primary/50 bg-navy-deep/85 p-4 text-primary"><LockKeyhole className="h-7 w-7" /></div></div>}
      </>}
    </div>
    <div className="p-4"><div className="mb-2 flex items-start justify-between gap-3"><h3 className="font-bold">{video.title}</h3><Sparkles className="h-4 w-4 shrink-0 animate-[icon-float_3s_ease-in-out_infinite] text-primary" /></div>
      {video.description && <p className="line-clamp-2 text-sm text-muted-foreground">{video.description}</p>}
      {!unlocked && <div className="mt-4 flex gap-2 border-t border-primary/20 pt-4"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={tx("كود المحاضرة", "Lecture code")} className="font-mono" /><Button onClick={redeem}>{tx("فتح", "Unlock")}</Button></div>}
    </div>
  </article>;
}

export function StudentLectures() {
  const { tx } = useApp();
  const [folders, setFolders] = useState<any[]>([]), [videos, setVideos] = useState<any[]>([]), [unlocks, setUnlocks] = useState<string[]>([]);
  const load = async () => { const [f, v, u] = await Promise.all([db.from("folders").select("*").order("created_at"), db.from("videos").select("*").order("created_at"), db.from("video_unlocks").select("video_id")]); setFolders(f.data ?? []); setVideos(v.data ?? []); setUnlocks((u.data ?? []).map((x: any) => x.video_id)); };
  useEffect(() => { load(); }, []);
  const groups = [...folders, { id: null, title: tx("محاضرات عامة", "General lectures") }];
  return <div className="space-y-8">{groups.map((folder) => { const list = videos.filter((v) => v.folder_id === folder.id); if (!list.length) return null; return <section key={folder.id ?? "general"} className="relative overflow-hidden rounded-lg border border-primary/20 bg-card/40 p-4 md:p-6"><Bubbles count={4} /><div className="relative z-10"><div className="mb-5 flex items-center gap-3"><div className="icon-tile"><BookOpen className="h-5 w-5" /></div><div><h2 className="text-xl font-black text-primary">{folder.title}</h2><p className="text-xs text-muted-foreground">{list.length} {tx("محاضرة مرتبة داخل الوحدة", "organized lectures")}</p></div></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{list.map((v) => <LectureCard key={v.id} video={v} unlocked={!v.is_locked || unlocks.includes(v.id)} refresh={load} />)}</div></div></section>; })}</div>;
}