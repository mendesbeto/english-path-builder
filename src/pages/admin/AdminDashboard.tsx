import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, BookOpen, GraduationCap, LayoutDashboard, ShieldCheck, Users, UserCheck, Clock3, Sparkles } from "lucide-react";

type Stats = {
  users: number; teachers: number; students: number; admins: number;
  pending: number; levels: number; modules: number; lessons: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ count: users, error: usersError }, { data: roles, error: rolesError }, { data: profs, error: profsError },
        { count: levels, error: levelsError }, { count: modules, error: modulesError }, { count: lessons, error: lessonsError }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("role"),
        supabase.from("profiles").select("id, is_approved"),
        supabase.from("levels").select("id", { count: "exact", head: true }),
        supabase.from("modules").select("id", { count: "exact", head: true }),
        supabase.from("lessons").select("id", { count: "exact", head: true }),
      ]);
      const firstError = usersError || rolesError || profsError || levelsError || modulesError || lessonsError;
      if (firstError) {
        if (active) setError(firstError.message);
        return;
      }
      const roleCounts = (roles ?? []).reduce((acc, row) => {
        acc[row.role as keyof typeof acc] = (acc[row.role as keyof typeof acc] ?? 0) + 1;
        return acc;
      }, { admin: 0, teacher: 0, student: 0 } as Record<"admin" | "teacher" | "student", number>);
      if (active) setStats({
        users: users ?? 0, teachers: roleCounts.teacher, students: roleCounts.student, admins: roleCounts.admin,
        pending: (profs ?? []).filter(p => !p.is_approved).length,
        levels: levels ?? 0, modules: modules ?? 0, lessons: lessons ?? 0,
      });
    })();
    return () => { active = false; };
  }, []);

  const cards = useMemo(() => stats ? [
    { label: "Usuários", value: stats.users, icon: Users, tone: "text-primary" },
    { label: "Alunos", value: stats.students, icon: GraduationCap, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Professores", value: stats.teachers, icon: UserCheck, tone: "text-sky-600 dark:text-sky-400" },
    { label: "Administradores", value: stats.admins, icon: ShieldCheck, tone: "text-violet-600 dark:text-violet-400" },
  ] : [], [stats]);

  if (error) {
    return <AppLayout><div className="mx-auto max-w-7xl p-4 sm:p-6"><Card><CardContent className="p-6"><p className="font-medium">Não foi possível carregar o painel.</p><p className="mt-1 text-sm text-muted-foreground">{error}</p></CardContent></Card></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-sky-700 p-6 text-primary-foreground shadow-lg sm:p-8">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="mb-3 border-white/20 bg-white/10 text-white hover:bg-white/10"><LayoutDashboard className="mr-1.5 h-3.5 w-3.5" /> Administração</Badge>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Visão geral da plataforma</h1>
              <p className="mt-2 max-w-2xl text-sm text-primary-foreground/80 sm:text-base">Acompanhe utilizadores, conteúdos e a estrutura pedagógica do Inglês Hope.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary"><Link to="/admin/users"><Users className="mr-2 h-4 w-4" /> Usuários</Link></Button>
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Link to="/admin/levels"><BookOpen className="mr-2 h-4 w-4" /> Conteúdo</Link></Button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(c => (
            <Card key={c.label} className="rounded-2xl shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-2xl bg-muted p-3"><c.icon className={`h-5 w-5 ${c.tone}`} /></div>
                <div><p className="text-sm text-muted-foreground">{c.label}</p>{stats ? <p className="text-2xl font-bold">{c.value}</p> : <Skeleton className="mt-1 h-8 w-14" />}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle>Estrutura de aprendizagem</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {[
                ["Níveis", stats?.levels, BookOpen], ["Módulos", stats?.modules, LayoutDashboard], ["Aulas", stats?.lessons, Sparkles],
              ].map(([label, value, Icon]) => (
                <div key={String(label)} className="rounded-2xl bg-muted/50 p-4">
                  <Icon className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold">{value ?? "—"}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20">
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-amber-600" /> Aprovações</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.pending ?? "—"}</p>
              <p className="mt-1 text-sm text-muted-foreground">utilizadores aguardando aprovação.</p>
              <Button asChild variant="outline" className="mt-4 w-full"><Link to="/admin/users">Revisar usuários <ArrowRight className="ml-auto h-4 w-4" /></Link></Button>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Ações rápidas</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Link to="/admin/users" className="group rounded-2xl border p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><div className="flex-1"><p className="font-semibold">Gerir usuários</p><p className="text-sm text-muted-foreground">Papéis, aprovação e estado das contas.</p></div><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
            </Link>
            <Link to="/admin/levels" className="group rounded-2xl border p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3"><BookOpen className="h-5 w-5 text-primary" /><div className="flex-1"><p className="font-semibold">Gerir níveis e módulos</p><p className="text-sm text-muted-foreground">Organize o percurso CEFR e os conteúdos.</p></div><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
