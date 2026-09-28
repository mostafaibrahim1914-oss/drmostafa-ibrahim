import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم | Researcher" },
      { name: "description", content: "Researcher dashboard" },
      { property: "og:title", content: "Dashboard | Researcher" },
      { property: "og:description", content: "Researcher dashboard" },
    ],
  }),
  component: Page,
});

function Page() {
  const { tx } = useApp();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-black">{tx("اللوحة قيد الإنشاء", "Dashboard coming soon")}</h1>
        <p className="mt-3 text-muted-foreground">{tx("سيتم استكمال هذه الصفحة قريباً.", "This page will be completed soon.")}</p>
        <Link to="/" className="mt-6 inline-block text-primary underline">{tx("الرئيسية", "Home")}</Link>
      </div>
    </div>
  );
}
