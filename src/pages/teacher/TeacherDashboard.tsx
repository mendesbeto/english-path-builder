import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Award,
  BarChart3,
  BookOpen,
  ChevronRight,
  CircleCheck,
  Clock3,
  Plus,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

type StudentRow = {
  id: string;
  name: string;
  level: string;
  points: number;
  streak: number;
  completed: number;
  avgScore: number;
  lastActivity: string | null;
  classIds: string[];
  classNames: string[];
};

type ClassRow = { id: string; name: string };
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const levelClass: Record<string, string> = {
  A1: "bg-level-a1/10 text-level-a1 border-level-a1/20",
  A2: "bg-level-a2/10 text-level-a2 border-level-a2/20",
  B1: "bg-level-b1/10 text-level-b1 border-level-b1/20",
  B2: "bg-level-b2/10 text-level-b2 border-level-b2/20",
  C1: "bg-level-c1/10 text-level-c1 border-level-c1/20",
  C2: "bg-level-c2/10 text-level-c2 border-level-c2/20",
};

function fmtDate(value: string | null) {
  if (!value) return "Sem atividade";
  return new Date(value).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });
}

export default function TeacherDashboard() {
  const { user, profile } = useAuth();
  const [myLessons, setMyLessons] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      const [
        { count: mine },
        { count: all },
        { data: roles },
        { data: profiles },
        { data: progress },
        { data: classRows },
        { data: enrollments },
      ] = await Promise.all([
        supabase.from("lessons").select("*", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("lessons").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("user_id, role").eq("role", "student"),
        supabase.from("profiles").select("id, full_name, current_level, points, streak_days"),
        supabase.from("lesson_progress").select("student_id, completed, score, completed_at"),
        supabase.from("classes").select("id, name").order("name"),
        supabase.from("class_students").select("class_id, student_id"),
      ]);

      if (cancelled) return;

      setMyLessons(mine ?? 0);
      setTotalLessons(all ?? 0);
      setClasses(classRows ?? []);

      const classNameById = new Map((classRows ?? []).map((c) => [c.id, c.name]));
      const studentIds = new Set((roles ?? []).map((r) => r.user_id));

      const rows: StudentRow[] = (profiles ?? [])
        .filter((p) => studentIds.has(p.id))
        .map((p) => {
          const items = (progress ?? []).filter((x) => x.student_id === p.id && x.completed);
          const scores = items.map((i) => i.score ?? 0);
          const last = items
            .map((i) => i.completed_at)
            .filter(Boolean)
            .sort()
            .pop() as string | undefined;
          const classIds = (enrollments ?? [])
            .filter((e) => e.student_id === p.id)
            .map((e) => e.class_id);

          return {
            id: p.id,
            name: p.full_name ?? "Sem nome",
            level: p.current_level ?? "A1",
            points: p.points ?? 0,
            streak: p.streak_days ?? 0,
            completed: items.length,
            avgScore: scores.length
              ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
              : 0,
            lastActivity: last ?? null,
            classIds,
            classNames: classIds.map((id) => classNameById.get(id) ?? "—"),
          };
        })
        .sort((a, b) => b.completed - a.completed);

      setStudents(rows);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const summary = useMemo(() => {
    const completed = students.reduce((sum, student) => sum + student.completed, 0);
    const scored = students.filter((student) => student.completed > 0);
    const average = scored.length
      ? Math.round(scored.reduce((sum, student) => sum + student.avgScore, 0) / scored.length)
      : 0;
    const active = students.filter(
      (student) =>
        student.lastActivity &&
        Date.now() - new Date(student.lastActivity).getTime() < 7 * 864e5,
    ).length;

    return { completed, average, active };
  }, [students]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      if (levelFilter !== "all" && student.level !== levelFilter) return false;
      if (classFilter === "none" && student.classIds.length > 0) return false;
      if (
        classFilter !== "all" &&
        classFilter !== "none" &&
        !student.classIds.includes(classFilter)
      ) return false;
      if (query && !student.name.toLowerCase().includes(query)) return false;

      if (statusFilter !== "all") {
        const active =
          !!student.lastActivity &&
          Date.now() - new Date(student.lastActivity).getTime() < 7 * 864e5;
        if (statusFilter === "active" && !active) return false;
        if (statusFilter === "inactive" && active) return false;
      }

      return true;
    });
  }, [students, search, levelFilter, classFilter, statusFilter]);

  const byLevel = useMemo(
    () =>
      LEVELS.map((code) => ({
        code,
        count: students.filter((student) => student.level === code).length,
      })),
    [students],
  );

  const maxByLevel = Math.max(1, ...byLevel.map((item) => item.count));
  const hasFilters =
    search || levelFilter !== "all" || classFilter !== "all" || statusFilter !== "all";

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
        <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Área do professor
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Olá, {profile?.full_name?.split(" ")[0] ?? "Professor"}.
              </h1>
              <p className="mt-2 text-muted-foreground">
                Acompanhe a evolução dos alunos e mantenha o conteúdo da plataforma em movimento.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/teacher/classes">
                  <Users className="mr-2 h-4 w-4" />
                  Turmas
                </Link>
              </Button>
              <Button asChild>
                <Link to="/teacher/lessons">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova aula
                </Link>
              </Button>
            </div>
          </div>

          {!profile?.is_approved && (
            <div className="relative mt-6 rounded-2xl border border-secondary/25 bg-secondary/10 p-4 text-sm">
              <p className="font-semibold">Conta aguardando aprovação</p>
              <p className="mt-1 text-muted-foreground">
                Você pode navegar pelo painel, mas algumas ações de professor podem permanecer bloqueadas até a aprovação do administrador.
              </p>
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Alunos acompanhados", value: students.length, icon: Users, tone: "text-primary" },
            { label: "Ativos nesta semana", value: summary.active, icon: TrendingUp, tone: "text-accent" },
            { label: "Aulas concluídas", value: summary.completed, icon: CircleCheck, tone: "text-primary" },
            { label: "Média de desempenho", value: `${summary.average}%`, icon: Award, tone: "text-secondary" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-muted ${item.tone}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold tracking-tight">{item.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold">Alunos por nível</h2>
                <p className="text-xs text-muted-foreground">Distribuição atual</p>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="space-y-4">
              {byLevel.map((item) => (
                <div key={item.code} className="flex items-center gap-3">
                  <span className={`w-9 rounded-md border py-1 text-center text-xs font-bold ${levelClass[item.code]}`}>
                    {item.code}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(item.count / maxByLevel) * 100}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-sm font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold">Conteúdo</h2>
                <p className="text-xs text-muted-foreground">Visão rápida da biblioteca</p>
              </div>
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs font-medium text-muted-foreground">Minhas aulas</p>
                <p className="mt-1 text-3xl font-bold">{myLessons}</p>
                <p className="mt-1 text-xs text-muted-foreground">Criadas por você</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs font-medium text-muted-foreground">Biblioteca total</p>
                <p className="mt-1 text-3xl font-bold">{totalLessons}</p>
                <p className="mt-1 text-xs text-muted-foreground">Aulas disponíveis na plataforma</p>
              </div>
            </div>

            <Button asChild className="mt-4">
              <Link to="/teacher/lessons">
                Gerenciar conteúdo
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">Acompanhamento dos alunos</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Consulte progresso, desempenho e última atividade.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {filtered.length} de {students.length} alunos
              </span>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative lg:col-span-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar aluno..."
                  className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="all">Todos os níveis</option>
                {LEVELS.map((level) => <option key={level} value={level}>Nível {level}</option>)}
              </select>
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="all">Todas as turmas</option>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                <option value="none">Sem turma</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")} className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="all">Qualquer atividade</option>
                <option value="active">Ativos na semana</option>
                <option value="inactive">Inativos na semana</option>
              </select>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setLevelFilter("all");
                  setClassFilter("all");
                  setStatusFilter("all");
                }}
                className="mt-3 text-xs font-medium text-primary hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Aluno</th>
                  <th className="px-5 py-3 font-medium">Nível</th>
                  <th className="px-5 py-3 font-medium">Turma</th>
                  <th className="px-5 py-3 font-medium">Conclusões</th>
                  <th className="px-5 py-3 font-medium">Média</th>
                  <th className="px-5 py-3 font-medium">Pontos</th>
                  <th className="px-5 py-3 font-medium">Streak</th>
                  <th className="px-5 py-3 font-medium">Atividade</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">Carregando alunos...</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center">
                      <Clock3 className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                      <p className="text-sm font-medium">{students.length ? "Nenhum resultado" : "Nenhum aluno cadastrado"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {students.length ? "Experimente remover ou alterar os filtros." : "Os alunos aparecerão aqui quando estiverem cadastrados."}
                      </p>
                    </td>
                  </tr>
                )}
                {!loading && filtered.map((student) => {
                  const percentage = totalLessons
                    ? Math.min(100, Math.round((student.completed / totalLessons) * 100))
                    : 0;
                  return (
                    <tr key={student.id} className="border-t transition-colors hover:bg-muted/30">
                      <td className="px-5 py-4">
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.points} pontos</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-md border px-2 py-1 text-xs font-bold ${levelClass[student.level] ?? "bg-muted"}`}>
                          {student.level}
                        </span>
                      </td>
                      <td className="max-w-[180px] px-5 py-4 text-muted-foreground">
                        <span className="line-clamp-2">{student.classNames.length ? student.classNames.join(", ") : "Sem turma"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-accent" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="text-xs font-medium">{student.completed}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium">{student.completed ? `${student.avgScore}%` : "—"}</td>
                      <td className="px-5 py-4">{student.points}</td>
                      <td className="px-5 py-4">{student.streak}d</td>
                      <td className="px-5 py-4 text-muted-foreground">{fmtDate(student.lastActivity)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex items-center justify-center gap-2 pb-4 text-xs text-muted-foreground">
          <Target className="h-3.5 w-3.5" />
          Acompanhar com dados claros ajuda a orientar o próximo passo de cada aluno.
        </div>
      </div>
    </AppLayout>
  );
}
