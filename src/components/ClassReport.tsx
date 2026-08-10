import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award, CheckCircle2, Flame, Loader2, Star, TrendingUp, Trophy } from "lucide-react";
import { Badge } from "@/components/Badge";

type ClassInfo = { id: string; name: string; level_code: string | null };

type LessonRow = { id: string; title: string; module_id: string; type: string };
type ProgressRow = { lesson_id: string; completed: boolean; score: number | null; completed_at: string | null };

export default function ClassReport({ classes, studentId }: { classes: ClassInfo[]; studentId: string }) {
  const [lessonsByLevel, setLessonsByLevel] = useState<Record<string, LessonRow[]>>({});
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: levels }, { data: modules }, { data: lessons }, { data: prog }] = await Promise.all([
        supabase.from("levels").select("id, code"),
        supabase.from("modules").select("id, level_id"),
        supabase.from("lessons").select("id, title, module_id, type"),
        supabase
          .from("lesson_progress")
          .select("lesson_id, completed, score, completed_at")
          .eq("student_id", studentId),
      ]);

      const levelById = new Map((levels ?? []).map((l: any) => [l.id, l.code as string]));
      const levelByModule = new Map((modules ?? []).map((m: any) => [m.id, levelById.get(m.level_id) as string]));
      const grouped: Record<string, LessonRow[]> = {};
      for (const l of (lessons ?? []) as LessonRow[]) {
        const code = levelByModule.get(l.module_id);
        if (!code) continue;
        (grouped[code] ??= []).push(l);
      }
      setLessonsByLevel(grouped);
      setProgress((prog ?? []) as ProgressRow[]);
      setLoading(false);
    };
    load();
  }, [studentId]);

  const progressByLesson = useMemo(() => {
    const m = new Map<string, ProgressRow>();
    for (const p of progress) m.set(p.lesson_id, p);
    return m;
  }, [progress]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (classes.length === 0) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold">Relatório de desempenho por turma</h2>
        <p className="text-sm text-muted-foreground">
          Acertos, evolução e conquistas em cada turma em que você está matriculado.
        </p>
      </div>

      {classes.map((c) => {
        const lessons = c.level_code ? lessonsByLevel[c.level_code] ?? [] : [];
        const rows = lessons.map((l) => ({ lesson: l, prog: progressByLesson.get(l.id) }));
        const done = rows.filter((r) => r.prog?.completed).length;
        const total = lessons.length;
        const percent = total ? Math.round((done / total) * 100) : 0;
        const scored = rows.filter((r) => r.prog?.completed && r.prog?.score != null);
        const avg = scored.length
          ? Math.round(scored.reduce((s, r) => s + (r.prog!.score ?? 0), 0) / scored.length)
          : 0;
        const best = scored.reduce((s, r) => Math.max(s, r.prog!.score ?? 0), 0);
        const totalPoints = scored.reduce((s, r) => s + (r.prog!.score ?? 0), 0);
        const lastActivity = rows
          .map((r) => r.prog?.completed_at)
          .filter(Boolean)
          .sort()
          .pop();
        const recent = rows
          .filter((r) => r.prog?.completed_at)
          .sort((a, b) => (a.prog!.completed_at! < b.prog!.completed_at! ? 1 : -1))
          .slice(0, 5);

        return (
          <div key={c.id} className="rounded-2xl border border-border p-6 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-display font-bold text-lg">{c.name}</h3>
                <p className="text-xs text-muted-foreground">Nível {c.level_code ?? "—"}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Última atividade:{" "}
                {lastActivity ? new Date(lastActivity).toLocaleDateString("pt-BR") : "sem registros"}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Metric icon={CheckCircle2} label="Aulas concluídas" value={`${done}/${total}`} />
              <Metric icon={TrendingUp} label="Evolução" value={`${percent}%`} />
              <Metric icon={Star} label="Média de acertos" value={`${avg} pts`} />
              <Metric icon={Trophy} label="Pontos na turma" value={String(totalPoints)} />
            </div>

            <div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Conquistas</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Badge
                  icon={<Flame className="h-6 w-6" />}
                  title="Primeiros passos"
                  description="Concluiu a 1ª aula"
                  isEarned={done >= 1}
                />
                <Badge
                  icon={<TrendingUp className="h-6 w-6" />}
                  title="Meio caminho"
                  description="50% do conteúdo"
                  isEarned={percent >= 50}
                />
                <Badge
                  icon={<Star className="h-6 w-6" />}
                  title="Boa pontuação"
                  description="Melhor nota ≥ 80"
                  isEarned={best >= 80}
                />
                <Badge
                  icon={<Award className="h-6 w-6" />}
                  title="Nível concluído"
                  description="100% das aulas"
                  isEarned={total > 0 && percent === 100}
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Atividades recentes</h4>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Você ainda não concluiu aulas nesta turma.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {recent.map((r) => (
                    <div key={r.lesson.id} className="flex items-center justify-between py-2 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{r.lesson.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{r.lesson.type}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{r.prog?.score ?? 0} pts</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.prog!.completed_at!).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <Icon className="h-4 w-4 text-primary mb-1" />
      <p className="text-lg font-display font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
