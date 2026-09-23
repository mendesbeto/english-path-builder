import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  Lock,
  Loader2,
  Sparkles,
  Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const levelMeta: Record<string, {
  label: string;
  short: string;
  color: string;
  bg: string;
}> = {
  A1: { label: "Iniciante", short: "Primeiros passos", color: "bg-level-a1", bg: "bg-level-a1/10" },
  A2: { label: "Básico", short: "Comunicação cotidiana", color: "bg-level-a2", bg: "bg-level-a2/10" },
  B1: { label: "Intermediário", short: "Autonomia", color: "bg-level-b1", bg: "bg-level-b1/10" },
  B2: { label: "Intermediário avançado", short: "Fluência funcional", color: "bg-level-b2", bg: "bg-level-b2/10" },
  C1: { label: "Avançado", short: "Domínio avançado", color: "bg-level-c1", bg: "bg-level-c1/10" },
  C2: { label: "Proficiência", short: "Domínio completo", color: "bg-level-c2", bg: "bg-level-c2/10" },
};

type LevelRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  order_num: number;
};

type ProgressRow = {
  lesson_id: string;
};

export default function Levels() {
  const { user, profile } = useAuth();
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      const [{ data: levelData }, { data: lessonData }, { data: progressData }] = await Promise.all([
        supabase.from("levels").select("id, code, title, description, order_num").order("order_num"),
        supabase.from("lessons").select("id, module_id"),
        user
          ? supabase.from("lesson_progress").select("lesson_id").eq("student_id", user.id).eq("completed", true)
          : Promise.resolve({ data: [] as ProgressRow[] }),
      ]);

      if (!active) return;

      setLevels((levelData ?? []) as LevelRow[]);
      setLessons(lessonData ?? []);
      setCompleted(new Set((progressData ?? []).map((row) => row.lesson_id)));
      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, [user]);

  const levelStats = useMemo(() => {
    return levels.map((level, index) => {
      const moduleIdsForLevel = new Set<string>();
      // The lesson query contains module_id, but the module-to-level relation is
      // fetched below in the same derived structure through a separate lookup.
      return {
        level,
        index,
        moduleIdsForLevel,
      };
    });
  }, [levels]);

  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    if (!levels.length) return;

    supabase
      .from("modules")
      .select("id, level_id")
      .in("level_id", levels.map((level) => level.id))
      .then(({ data }) => setModules(data ?? []));
  }, [levels]);

  const stats = useMemo(() => {
    return levelStats.map(({ level, index }) => {
      const moduleIds = new Set(
        modules.filter((module) => module.level_id === level.id).map((module) => module.id)
      );
      const levelLessons = lessons.filter((lesson) => moduleIds.has(lesson.module_id));
      const done = levelLessons.filter((lesson) => completed.has(lesson.id)).length;
      const progress = levelLessons.length ? Math.round((done / levelLessons.length) * 100) : 0;
      const currentIndex = levels.findIndex((item) => item.code === profile?.current_level);
      const isCurrent = level.code === profile?.current_level;
      const isPast = currentIndex >= 0 && index < currentIndex;
      const isFuture = currentIndex >= 0 && index > currentIndex;
      const isLocked = isFuture;

      return {
        level,
        index,
        total: levelLessons.length,
        done,
        progress,
        isCurrent,
        isPast,
        isFuture,
        isLocked,
      };
    });
  }, [levelStats, modules, lessons, completed, levels, profile?.current_level]);

  const current = stats.find((item) => item.isCurrent) ?? stats[0];
  const overallDone = stats.reduce((sum, item) => sum + item.done, 0);
  const overallTotal = stats.reduce((sum, item) => sum + item.total, 0);
  const overallProgress = overallTotal ? Math.round((overallDone / overallTotal) * 100) : 0;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Jornada CEFR
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Seu caminho de aprendizagem
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Avance pelos níveis A1 a C2, acompanhe suas aulas concluídas e continue exatamente de onde parou.
              </p>
            </div>
            {current && (
              <Link
                to={`/levels/${current.level.code.toLowerCase()}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                Continuar em {current.level.code}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </motion.header>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span className="text-sm">Nível atual</span>
            </div>
            <p className="font-display text-2xl font-bold">{profile?.current_level ?? "A1"}</p>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">Aulas concluídas</span>
            </div>
            <p className="font-display text-2xl font-bold">{overallDone}</p>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm">Progresso total</span>
            </div>
            <p className="font-display text-2xl font-bold">{overallProgress}%</p>
          </div>
        </section>

        <section className="relative">
          <div className="absolute bottom-8 left-[27px] top-8 hidden w-px bg-border md:block" />

          <div className="space-y-4">
            {stats.map((item, index) => {
              const meta = levelMeta[item.level.code] ?? levelMeta.A1;
              const accessible = !item.isLocked;

              return (
                <motion.div
                  key={item.level.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="relative md:pl-16"
                >
                  <div
                    className={cn(
                      "absolute left-4 top-7 z-10 hidden h-7 w-7 items-center justify-center rounded-full border-4 border-background md:flex",
                      item.isPast ? meta.color : item.isCurrent ? "bg-primary" : "bg-muted"
                    )}
                  >
                    {item.isPast ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                    ) : item.isCurrent ? (
                      <Circle className="h-3 w-3 fill-white text-white" />
                    ) : (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>

                  <div
                    className={cn(
                      "group overflow-hidden rounded-2xl border bg-card transition",
                      item.isCurrent && "border-primary/40 shadow-md shadow-primary/5",
                      item.isLocked && "opacity-70"
                    )}
                  >
                    <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center">
                      <div className={cn(
                        "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white shadow-sm",
                        meta.color
                      )}>
                        {item.level.code}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-xl font-bold">{item.level.title}</h2>
                          {item.isCurrent && (
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                              Em andamento
                            </span>
                          )}
                          {item.isPast && (
                            <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-success">
                              Concluído
                            </span>
                          )}
                          {item.isLocked && (
                            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                              Bloqueado
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">{meta.label}</p>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                          {item.level.description}
                        </p>

                        <div className="mt-4 max-w-xl">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {item.total ? `${item.done} de ${item.total} aulas` : "Conteúdo sendo preparado"}
                            </span>
                            <span className="font-semibold">{item.progress}%</span>
                          </div>
                          <Progress value={item.progress} className="h-2" />
                        </div>
                      </div>

                      <div className="flex shrink-0 lg:ml-auto">
                        {accessible ? (
                          <Link
                            to={`/levels/${item.level.code.toLowerCase()}`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted"
                          >
                            {item.isCurrent ? "Continuar" : "Revisar nível"}
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        ) : (
                          <div className="inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-muted-foreground">
                            <Lock className="h-4 w-4" />
                            Bloqueado
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border bg-muted/30 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Entenda o percurso</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cada nível reúne módulos e aulas. Seu progresso é atualizado quando você conclui as atividades.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              concluído
              <Lock className="ml-2 h-4 w-4" />
              próximo nível
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
