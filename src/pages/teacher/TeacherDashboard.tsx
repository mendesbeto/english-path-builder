import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Plus, Users, Target, TrendingUp, Award, Search } from "lucide-react";

type StudentRow = {
  id: string;
  name: string;
  level: string;
  points: number;
  streak: number;
  completed: number;
  avgScore: number;
  lastActivity: string | null;
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const levelClass: Record<string, string> = {
  A1: "bg-level-a1/15 text-level-a1 border-level-a1/30",
  A2: "bg-level-a2/15 text-level-a2 border-level-a2/30",
  B1: "bg-level-b1/15 text-level-b1 border-level-b1/30",
  B2: "bg-level-b2/15 text-level-b2 border-level-b2/30",
  C1: "bg-level-c1/15 text-level-c1 border-level-c1/30",
  C2: "bg-level-c2/15 text-level-c2 border-level-c2/30",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function TeacherDashboard() {
  const { user, profile } = useAuth();
  const [myLessons, setMyLessons] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ count: mine }, { count: all }, { data: roles }, { data: profiles }, { data: progress }] =
        await Promise.all([
          supabase.from("lessons").select("*", { count: "exact", head: true }).eq("created_by", user.id),
          supabase.from("lessons").select("*", { count: "exact", head: true }),
          supabase.from("user_roles").select("user_id, role").eq("role", "student"),
          supabase.from("profiles").select("id, full_name, current_level, points, streak_days"),
          supabase.from("lesson_progress").select("student_id, completed, score, completed_at"),
        ]);

      setMyLessons(mine ?? 0);
      setTotalLessons(all ?? 0);

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
          return {
            id: p.id,
            name: p.full_name ?? "Sem nome",
            level: p.current_level ?? "A1",
            points: p.points ?? 0,
            streak: p.streak_days ?? 0,
            completed: items.length,
            avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
            lastActivity: last ?? null,
          };
        })
        .sort((a, b) => b.completed - a.completed);

      setStudents(rows);
      setLoading(false);
    })();
  }, [user]);

  const summary = useMemo(() => {
    const totalCompleted = students.reduce((a, s) => a + s.completed, 0);
    const withScore = students.filter((s) => s.completed > 0);
    const avg = withScore.length
      ? Math.round(withScore.reduce((a, s) => a + s.avgScore, 0) / withScore.length)
      : 0;
    const active = students.filter(
      (s) => s.lastActivity && Date.now() - new Date(s.lastActivity).getTime() < 7 * 864e5
    ).length;
    return { totalCompleted, avg, active };
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (levelFilter !== "all" && s.level !== levelFilter) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all") {
        const active = !!s.lastActivity && Date.now() - new Date(s.lastActivity).getTime() < 7 * 864e5;
        if (statusFilter === "active" && !active) return false;
        if (statusFilter === "inactive" && active) return false;
      }
      return true;
    });
  }, [students, search, levelFilter, statusFilter]);

  const byLevel = useMemo(
    () =>
      LEVELS.map((code) => ({
        code,
        count: students.filter((s) => s.level === code).length,
      })),
    [students]
  );
  const maxByLevel = Math.max(1, ...byLevel.map((b) => b.count));

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <h1 className="text-3xl font-display font-bold mb-2">Painel do Professor</h1>
        {profile && !profile.is_approved && (
          <div className="p-4 mb-6 rounded-xl bg-secondary/10 border border-secondary/30 text-sm">
            Sua conta ainda não foi aprovada pelo administrador. Você pode navegar, mas suas ações podem ser bloqueadas.
          </div>
        )}
        <p className="text-muted-foreground mb-8">Bem-vindo, {profile?.full_name}.</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="p-4 rounded-xl bg-card border">
            <Users className="w-6 h-6 text-secondary mb-2" />
            <div className="text-2xl font-display font-bold">{students.length}</div>
            <div className="text-sm text-muted-foreground">Alunos acompanhados</div>
          </div>
          <div className="p-4 rounded-xl bg-card border">
            <TrendingUp className="w-6 h-6 text-primary mb-2" />
            <div className="text-2xl font-display font-bold">{summary.active}</div>
            <div className="text-sm text-muted-foreground">Ativos nos últimos 7 dias</div>
          </div>
          <div className="p-4 rounded-xl bg-card border">
            <Target className="w-6 h-6 text-accent mb-2" />
            <div className="text-2xl font-display font-bold">{summary.totalCompleted}</div>
            <div className="text-sm text-muted-foreground">Aulas concluídas (turma)</div>
          </div>
          <div className="p-4 rounded-xl bg-card border">
            <Award className="w-6 h-6 text-secondary mb-2" />
            <div className="text-2xl font-display font-bold">{summary.avg}%</div>
            <div className="text-sm text-muted-foreground">Média de desempenho</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <div className="p-5 rounded-xl bg-card border lg:col-span-1">
            <h2 className="font-display font-semibold mb-4">Alunos por nível</h2>
            <div className="space-y-3">
              {byLevel.map((b) => (
                <div key={b.code} className="flex items-center gap-3">
                  <span className={`w-9 text-xs font-semibold text-center rounded-md border py-1 ${levelClass[b.code]}`}>
                    {b.code}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(b.count / maxByLevel) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-6 text-right">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-card border lg:col-span-2">
            <h2 className="font-display font-semibold mb-4">Conteúdo</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <BookOpen className="w-5 h-5 text-primary mb-2" />
                <div className="text-2xl font-display font-bold">{myLessons}</div>
                <div className="text-sm text-muted-foreground">Aulas criadas por mim</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <BookOpen className="w-5 h-5 text-accent mb-2" />
                <div className="text-2xl font-display font-bold">{totalLessons}</div>
                <div className="text-sm text-muted-foreground">Aulas na plataforma</div>
              </div>
            </div>
            <Link
              to="/teacher/lessons"
              className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
            >
              <Plus className="w-4 h-4" /> Gerenciar aulas
            </Link>
          </div>
        </div>

        <div className="rounded-xl bg-card border overflow-hidden">
          <div className="p-5 border-b space-y-4">
            <div>
              <h2 className="font-display font-semibold">Progresso detalhado dos alunos</h2>
              <p className="text-sm text-muted-foreground">Desempenho individual e última atividade registrada.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar aluno pelo nome..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-background border text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Todos os níveis</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    Nível {l}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                className="px-3 py-2 rounded-lg bg-background border text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Qualquer atividade</option>
                <option value="active">Ativos na semana</option>
                <option value="inactive">Inativos na semana</option>
              </select>
              {(search || levelFilter !== "all" || statusFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setLevelFilter("all");
                    setStatusFilter("all");
                  }}
                  className="px-3 py-2 rounded-lg border text-sm text-muted-foreground hover:bg-muted"
                >
                  Limpar
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {filtered.length} de {students.length} alunos
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Aluno</th>
                  <th className="text-left font-medium px-5 py-3">Nível</th>
                  <th className="text-left font-medium px-5 py-3">Aulas concluídas</th>
                  <th className="text-left font-medium px-5 py-3">Média</th>
                  <th className="text-left font-medium px-5 py-3">Pontos</th>
                  <th className="text-left font-medium px-5 py-3">Sequência</th>
                  <th className="text-left font-medium px-5 py-3">Última atividade</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-5 py-6 text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                )}
                {!loading && students.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-6 text-muted-foreground">
                      Nenhum aluno cadastrado ainda.
                    </td>
                  </tr>
                )}
                {students.map((s) => {
                  const pct = totalLessons ? Math.min(100, Math.round((s.completed / totalLessons) * 100)) : 0;
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="px-5 py-3 font-medium">{s.name}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold rounded-md border px-2 py-1 ${levelClass[s.level]}`}>
                          {s.level}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-muted-foreground">{s.completed}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">{s.completed ? `${s.avgScore}%` : "—"}</td>
                      <td className="px-5 py-3">{s.points}</td>
                      <td className="px-5 py-3">{s.streak} dias</td>
                      <td className="px-5 py-3 text-muted-foreground">{fmtDate(s.lastActivity)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
