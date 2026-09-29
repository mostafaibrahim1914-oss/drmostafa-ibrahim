import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { AttemptsReport, Avatar, Card, db, Guard, Leaderboard, ProfileEditor } from "@/components/site/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminDeleteUser, adminSetPassword } from "@/lib/admin.functions";
import { STAGE_LABEL, STAGES, type Stage, uploadFile, useApp } from "@/lib/app-context";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم | Researcher" },
      { name: "description", content: "لوحة تحكم الأدمن لإدارة الطلاب والمحتوى على منصة Researcher." },
      { property: "og:title", content: "Admin Dashboard | Researcher" },
      { property: "og:description", content: "Manage students, videos, exams and codes." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <Guard admin><Admin /></Guard>
    </div>
  ),
});

const sel = "h-10 w-full rounded-md border border-input bg-background px-3";

function StageSelect({ v, set }: { v: Stage; set: (s: Stage) => void }) {
  const { lang } = useApp();
  return <select className={sel} value={v} onChange={(e) => set(e.target.value as Stage)}>{STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s][lang]}</option>)}</select>;
}

function Admin() {
  const { tx } = useApp();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-black text-gold-gradient">{tx("لوحة التحكم", "Dashboard")}</h1>
      <Tabs defaultValue="home">
        <TabsList className="mb-4 flex h-auto flex-wrap">
          {[["home", "الرئيسية", "Home"], ["students", "الطلاب", "Students"], ["content", "الفولدرات والفيديوهات", "Folders & videos"], ["codes", "الأكواد", "Codes"], ["exams", "الامتحانات", "Exams"], ["me", "حسابي", "Account"]].map(([k, a, e]) => (
            <TabsTrigger key={k} value={k}>{tx(a, e)}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="home"><div className="grid gap-4 md:grid-cols-2">{STAGES.map((s) => <Leaderboard key={s} stage={s} top={3} />)}</div></TabsContent>
        <TabsContent value="students"><Students /></TabsContent>
        <TabsContent value="content"><ContentAdmin /></TabsContent>
        <TabsContent value="codes"><Codes /></TabsContent>
        <TabsContent value="exams"><Exams /></TabsContent>
        <TabsContent value="me"><ProfileEditor /></TabsContent>
      </Tabs>
    </div>
  );
}

function Students() {
  const { tx, lang } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [tab, setTab] = useState<string>("pending");
  const [view, setView] = useState<any>(null);
  const setPw = useServerFn(adminSetPassword);
  const del = useServerFn(adminDeleteUser);
  const load = async () => {
    const [{ data: p }, { data: r }] = await Promise.all([db.from("profiles").select("*").order("created_at", { ascending: false }), db.from("user_roles").select("user_id").eq("role", "admin")]);
    const admins = new Set((r ?? []).map((x: any) => x.user_id));
    setRows((p ?? []).filter((x: any) => !admins.has(x.id)));
  };
  useEffect(() => { load(); }, []);
  const status = async (id: string, s: string) => { await db.from("profiles").update({ status: s }).eq("id", id); load(); };
  const list = rows.filter((r) => tab === "all" || (tab === "pending" ? r.status === "pending" : r.stage === tab));
  return (
    <Card>
      <div className="mb-4 flex flex-wrap gap-2">
        {[["pending", tx("المعلقين", "Pending") + ` (${rows.filter((r) => r.status === "pending").length})`], ["all", tx("الكل", "All")], ...STAGES.map((s) => [s, STAGE_LABEL[s][lang]])].map(([k, l]) => (
          <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} onClick={() => setTab(k)}>{l}</Button>
        ))}
      </div>
      {list.length === 0 && <p className="text-muted-foreground">{tx("لا يوجد طلاب", "No students")}</p>}
      {list.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center gap-3 border-b border-border/40 py-3">
          <Avatar path={s.avatar_url} size={40} />
          <div className="min-w-40 flex-1"><div className="font-semibold">{s.full_name}</div><div className="text-xs text-muted-foreground">{s.whatsapp} · {s.stage && STAGE_LABEL[s.stage as Stage][lang]} · {s.status}</div></div>
          <Button size="sm" variant="outline" onClick={() => setView(s)}>{tx("عرض", "View")}</Button>
          {s.status !== "approved" ? <Button size="sm" onClick={() => status(s.id, "approved")}>{tx("تفعيل", "Approve")}</Button>
            : <Button size="sm" variant="secondary" onClick={() => status(s.id, "blocked")}>{tx("إيقاف", "Block")}</Button>}
          <Button size="sm" variant="outline" onClick={async () => {
            const p = prompt(tx("كلمة المرور الجديدة", "New password"));
            if (!p) return;
            try { await setPw({ data: { userId: s.id, password: p } }); toast.success("✓"); } catch (e: any) { toast.error(e.message); }
          }}>{tx("كلمة المرور", "Password")}</Button>
          <Button size="sm" variant="destructive" onClick={async () => {
            if (!confirm(tx("طرد الطالب نهائياً؟", "Remove student?"))) return;
            try { await del({ data: { userId: s.id } }); load(); } catch (e: any) { toast.error(e.message); }
          }}>{tx("طرد", "Remove")}</Button>
        </div>
      ))}
      <Dialog open={!!view} onOpenChange={() => setView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{view?.full_name}</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-1 text-sm">
              <Avatar path={view.avatar_url} size={64} />
              <p>{tx("واتساب", "WhatsApp")}: {view.whatsapp}</p><p>{tx("ولي الأمر", "Parent")}: {view.parent_phone}</p>
              <p>{tx("العنوان", "Address")}: {view.address}</p><p>{tx("تاريخ التسجيل", "Joined")}: {new Date(view.created_at).toLocaleDateString()}</p>
              <div className="mt-3 border-t pt-3"><AttemptsReport userId={view.id} /></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function useFolders() {
  const [folders, setFolders] = useState<any[]>([]);
  const load = () => db.from("folders").select("*").order("created_at").then(({ data }: any) => setFolders(data ?? []));
  useEffect(() => { load(); }, []);
  return { folders, load };
}

function FolderSelect({ folders, stage, v, set }: any) {
  const { tx } = useApp();
  return <select className={sel} value={v} onChange={(e) => set(e.target.value)}><option value="">{tx("بدون فولدر", "No folder")}</option>{folders.filter((f: any) => f.stage === stage).map((f: any) => <option key={f.id} value={f.id}>{f.title}</option>)}</select>;
}

function ContentAdmin() {
  const { tx, lang } = useApp();
  const { folders, load } = useFolders();
  const [videos, setVideos] = useState<any[]>([]);
  const [fs, setFs] = useState<Stage>("sec1"); const [ft, setFt] = useState("");
  const blank = { stage: "sec1" as Stage, folder_id: "", title: "", description: "", source: "youtube", url: "", is_locked: false, price: 0 };
  const [v, setV] = useState(blank); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false);
  const loadV = () => db.from("videos").select("*").order("created_at", { ascending: false }).then(({ data }: any) => setVideos(data ?? []));
  useEffect(() => { loadV(); }, []);
  const addFolder = async () => { if (!ft) return; await db.from("folders").insert({ title: ft, stage: fs }); setFt(""); load(); };
  const addVideo = async () => {
    if (!v.title) return toast.error(tx("اكتب العنوان", "Title required"));
    setBusy(true);
    try {
      let url = v.url;
      if (v.source === "upload") { if (!file) throw new Error(tx("اختر ملف", "Choose a file")); url = await uploadFile("videos", v.stage, file); }
      const { error } = await db.from("videos").insert({ ...v, url, folder_id: v.folder_id || null });
      if (error) throw error;
      toast.success("✓"); setV(blank); setFile(null); loadV();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h3 className="mb-3 font-bold">{tx("الفولدرات (الوحدات)", "Folders (units)")}</h3>
        <div className="mb-3 flex gap-2"><StageSelect v={fs} set={setFs} /><Input placeholder={tx("اسم الوحدة", "Unit name")} value={ft} onChange={(e) => setFt(e.target.value)} /><Button onClick={addFolder}>+</Button></div>
        {folders.map((f) => (
          <div key={f.id} className="flex justify-between border-b border-border/40 py-2 text-sm"><span>📁 {f.title} — {STAGE_LABEL[f.stage as Stage][lang]}</span>
            <button className="text-destructive" onClick={async () => { await db.from("folders").delete().eq("id", f.id); load(); }}>✕</button></div>
        ))}
      </Card>
      <Card className="space-y-2">
        <h3 className="font-bold">{tx("إضافة فيديو", "Add video")}</h3>
        <StageSelect v={v.stage} set={(s) => setV({ ...v, stage: s, folder_id: "" })} />
        <FolderSelect folders={folders} stage={v.stage} v={v.folder_id} set={(x: string) => setV({ ...v, folder_id: x })} />
        <Input placeholder={tx("العنوان", "Title")} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        <Input placeholder={tx("الوصف", "Description")} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        <select className={sel} value={v.source} onChange={(e) => setV({ ...v, source: e.target.value })}>
          <option value="youtube">YouTube</option><option value="external">{tx("رابط خارجي", "External link")}</option><option value="upload">{tx("رفع مباشر", "Upload")}</option>
        </select>
        {v.source === "upload" ? <Input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          : <Input placeholder="https://..." value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} />}
        <label className="flex items-center gap-2"><input type="checkbox" checked={v.is_locked} onChange={(e) => setV({ ...v, is_locked: e.target.checked })} />{tx("مقفول بكود", "Locked by code")}</label>
        {v.is_locked && <><Label>{tx("سعر الحصة", "Price")}</Label><Input type="number" value={v.price} onChange={(e) => setV({ ...v, price: +e.target.value })} /></>}
        <Button disabled={busy} onClick={addVideo}>{busy ? "…" : tx("إضافة", "Add")}</Button>
      </Card>
      <Card className="lg:col-span-2">
        <h3 className="mb-3 font-bold">{tx("الفيديوهات", "Videos")}</h3>
        {videos.map((x) => (
          <div key={x.id} className="flex justify-between border-b border-border/40 py-2 text-sm">
            <span>🎬 {x.title} — {STAGE_LABEL[x.stage as Stage][lang]} {x.is_locked ? `🔒 ${x.price}` : ""}</span>
            <button className="text-destructive" onClick={async () => { if (confirm("?")) { await db.from("videos").delete().eq("id", x.id); loadV(); } }}>✕</button>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Codes() {
  const { tx } = useApp();
  const [videos, setVideos] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [vid, setVid] = useState(""); const [n, setN] = useState(10);
  const load = () => db.from("access_codes").select("*, videos(title), profiles:used_by(full_name)").order("created_at", { ascending: false }).then(({ data, error }: any) => {
    if (error) db.from("access_codes").select("*, videos(title)").order("created_at", { ascending: false }).then(({ data }: any) => setCodes(data ?? []));
    else setCodes(data ?? []);
  });
  useEffect(() => { db.from("videos").select("id,title,price").eq("is_locked", true).then(({ data }: any) => setVideos(data ?? [])); load(); }, []);
  const gen = async () => {
    const v = videos.find((x) => x.id === vid); if (!v) return;
    const rows = Array.from({ length: n }, () => ({ video_id: vid, price: v.price, code: Math.random().toString(36).slice(2, 10).toUpperCase() }));
    const { error } = await db.from("access_codes").insert(rows);
    error ? toast.error(error.message) : load();
  };
  return (
    <Card>
      <div className="mb-4 flex flex-wrap gap-2">
        <select className={sel + " max-w-xs"} value={vid} onChange={(e) => setVid(e.target.value)}><option value="">{tx("اختر فيديو مقفول", "Choose locked video")}</option>{videos.map((v) => <option key={v.id} value={v.id}>{v.title} ({v.price})</option>)}</select>
        <Input type="number" className="w-24" value={n} onChange={(e) => setN(+e.target.value)} />
        <Button onClick={gen}>{tx("إصدار أكواد", "Generate")}</Button>
      </div>
      <div className="grid gap-1 text-sm">
        {codes.map((c) => (
          <div key={c.id} className="flex justify-between border-b border-border/40 py-1.5">
            <span className="font-mono font-bold">{c.code}</span><span>{c.videos?.title}</span><span>{c.price}</span>
            <span className={c.used_by ? "text-destructive" : "text-green-500"}>{c.used_by ? (c.profiles?.full_name ?? tx("مستخدم", "Used")) : tx("متاح", "Available")}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Exams() {
  const { tx, lang } = useApp();
  const { folders } = useFolders();
  const [exams, setExams] = useState<any[]>([]);
  const [e, setE] = useState({ stage: "sec1" as Stage, folder_id: "", title: "" });
  const [edit, setEdit] = useState<any>(null);
  const load = () => db.from("exams").select("*").order("created_at", { ascending: false }).then(({ data }: any) => setExams(data ?? []));
  useEffect(() => { load(); }, []);
  if (edit) return <Questions exam={edit} back={() => setEdit(null)} />;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="space-y-2">
        <h3 className="font-bold">{tx("امتحان جديد", "New exam")}</h3>
        <StageSelect v={e.stage} set={(s) => setE({ ...e, stage: s, folder_id: "" })} />
        <FolderSelect folders={folders} stage={e.stage} v={e.folder_id} set={(x: string) => setE({ ...e, folder_id: x })} />
        <Input placeholder={tx("العنوان", "Title")} value={e.title} onChange={(x) => setE({ ...e, title: x.target.value })} />
        <Button onClick={async () => { if (!e.title) return; await db.from("exams").insert({ ...e, folder_id: e.folder_id || null }); setE({ ...e, title: "" }); load(); }}>{tx("إنشاء", "Create")}</Button>
      </Card>
      <Card className="lg:col-span-2">
        {exams.map((x) => (
          <div key={x.id} className="flex flex-wrap items-center gap-2 border-b border-border/40 py-2">
            <span className="flex-1">📝 {x.title} — {STAGE_LABEL[x.stage as Stage][lang]}</span>
            <Button size="sm" variant="outline" onClick={() => setEdit(x)}>{tx("الأسئلة", "Questions")}</Button>
            <Button size="sm" variant={x.is_closed ? "secondary" : "default"} onClick={async () => { await db.from("exams").update({ is_closed: !x.is_closed }).eq("id", x.id); load(); }}>
              {x.is_closed ? tx("مغلق — فتح", "Closed — reopen") : tx("غلق وإظهار الإجابات", "Close & reveal")}
            </Button>
            <button className="text-destructive" onClick={async () => { if (confirm("?")) { await db.from("attempts").delete().eq("exam_id", x.id); await db.from("questions").delete().eq("exam_id", x.id); await db.from("exams").delete().eq("id", x.id); load(); } }}>✕</button>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Questions({ exam, back }: { exam: any; back: () => void }) {
  const { tx } = useApp();
  const [qs, setQs] = useState<any[]>([]);
  const [q, setQ] = useState({ prompt: "", options: ["", "", "", ""], correct_index: 0 });
  const [img, setImg] = useState<File | null>(null);
  const load = () => db.from("questions").select("*").eq("exam_id", exam.id).order("q_order").then(({ data }: any) => setQs(data ?? []));
  useEffect(() => { load(); }, []);
  const add = async () => {
    const options = q.options.filter(Boolean);
    if (options.length < 2) return toast.error(tx("اختياران على الأقل", "At least 2 options"));
    const image_url = img ? await uploadFile("media", "questions", img) : null;
    await db.from("questions").insert({ exam_id: exam.id, prompt: q.prompt, options, correct_index: q.correct_index, image_url, q_order: qs.length + 1 });
    setQ({ prompt: "", options: ["", "", "", ""], correct_index: 0 }); setImg(null); load();
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-2">
        <div className="flex justify-between"><h3 className="font-bold">{exam.title}</h3><Button variant="ghost" onClick={back}>{tx("رجوع", "Back")}</Button></div>
        <Input placeholder={tx("نص السؤال", "Question text")} value={q.prompt} onChange={(e) => setQ({ ...q, prompt: e.target.value })} />
        <Label>{tx("صورة (اختياري)", "Image (optional)")}</Label><Input type="file" accept="image/*" onChange={(e) => setImg(e.target.files?.[0] ?? null)} />
        {q.options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" checked={q.correct_index === i} onChange={() => setQ({ ...q, correct_index: i })} />
            <Input placeholder={`${tx("اختيار", "Option")} ${i + 1}`} value={o} onChange={(e) => { const op = [...q.options]; op[i] = e.target.value; setQ({ ...q, options: op }); }} />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">{tx("حدد الإجابة الصحيحة بالدائرة", "Mark the correct answer")}</p>
        <Button onClick={add}>{tx("إضافة سؤال", "Add question")}</Button>
      </Card>
      <Card>
        {qs.map((x, i) => (
          <div key={x.id} className="border-b border-border/40 py-2 text-sm">
            <div className="flex justify-between"><b>{i + 1}. {x.prompt} {x.image_url && "🖼️"}</b><button className="text-destructive" onClick={async () => { await db.from("questions").delete().eq("id", x.id); load(); }}>✕</button></div>
            {(x.options as string[]).map((o, j) => <div key={j} className={j === x.correct_index ? "font-bold text-green-500" : ""}>• {o}</div>)}
          </div>
        ))}
      </Card>
    </div>
  );
}
