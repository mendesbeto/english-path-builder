import { Bell, ChevronRight } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { SidebarTrigger } from "@/components/ui/sidebar";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/levels": "Níveis",
  "/my-classes": "Minhas turmas",
  "/teacher": "Painel do professor",
  "/teacher/lessons": "Aulas & conteúdo",
  "/teacher/classes": "Turmas",
  "/admin": "Painel administrativo",
  "/admin/users": "Utilizadores",
  "/admin/levels": "Níveis & módulos",
};

function getTitle(pathname: string) {
  const exact = routeLabels[pathname];
  if (exact) return exact;
  if (pathname.startsWith("/lesson/")) return "Aula";
  if (pathname.startsWith("/levels/")) return "Percurso de aprendizagem";
  return "Inglês Hope";
}

export default function Topbar() {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const title = getTitle(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border/70 bg-background/90 px-3 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="h-9 w-9" aria-label="Abrir menu" />
        <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
          <span>Inglês Hope</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-semibold text-foreground">{title}</span>
        </div>
        <h1 className="truncate font-display text-base font-bold sm:hidden">{title}</h1>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-secondary" />
        </Button>
        <div className="ml-1 hidden items-center gap-2 border-l border-border pl-3 md:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {(profile?.full_name?.trim()?.[0] ?? "U").toUpperCase()}
          </div>
          <span className="max-w-36 truncate text-sm font-semibold">{profile?.full_name ?? "Utilizador"}</span>
        </div>
      </div>
    </header>
  );
}
