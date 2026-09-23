import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Headphones,
  HelpCircle,
  Loader2,
  Mic,
  PenLine,
  Play,
  Sparkles,
  Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, any> = {
  text: FileText,
  video: Play,
  audio: Headphones,
  quiz: HelpCircle,
  speaking: Mic,
  writing: PenLine,
  assessment: Award,
};

const typeLabels: Record<string, string> = {
  text: "Leitura",
  video: "Vídeo",
  audio: "Áudio",
  quiz: "Quiz",
  speaking: "Pronúncia",
  writing: "Escrita",
  assessment: "Avaliação",
};

const levelColors: Record<string, string> = {
  A1: "bg-level-a1",
  A2: "bg-level-a2",
  B1: "bg-level-b1",
  B2: "bg-level-b2",
  C1: "bg-level-c1",
  C2: "bg-level-c2",
};

export default function LevelDetail() {
  const { levelId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [level, setLevel] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!levelId) return;

      setLoading(true);
      const { data: lv } = await supabase
        .from("levels")
        .select("*")
        .eq("code", levelId.toUpperCase() as any)
        .maybeSingle();

      if (!active) return;
      setLevel(lv);

      if (!lv) {
        setLoading(false);
        return;
      }

      const { data: mods } = await supabase
        .from("modules")
        .select("*")
        .eq("level_id", lv.id)
        .order("order_num");

      const moduleRows = mods ?? [];
      const moduleIds = moduleRows.map((module) => module.id);

      const [{ data: less }, { data: prog }] = await Promise.all([
        moduleIds.length
          ? supabase.from("lessons").select("*").in("module_id", moduleIds).order("order_num")
          : Promise.resolve({ data: [] }),
        user
          ? supabase
              .from("lesson_progress")
              .select("lesson_id")
              .eq("student_id", user.id)
              .eq("completed", true)
          : Promise.resolve({ data: [] }),
      ]);

      if (!active) return;

      const lessonRows = less ?? [];
      setModules(moduleRows);
      setLessons(lessonRows);
      setCompleted(new Set((prog ?? []).map((row) => row.lesson_id)));

      if (moduleRows.length) {
        const firstIncomplete = moduleRows.find((module) =>
          lessonRows.some(
            (lesson) => lesson.module_id === module.id && !new Set((prog ?? []).map((row) => row.lesson_id)).has(lesson.id)
          )
        );
        setOpenModules(new Set([firstIncomplete?.id ?? moduleRows[0].id]));
      }

      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [levelId, user]);

  const modulesWithStats = useMemo(
    () =>
      modules.map((module) => {
        const moduleLessons = lessons.filter((lesson) => lesson.module_id === module.id);
        const done = moduleLessons.filter((lesson) => completed.has(lesson.id)).length;
        return {
          module,
          lessons: moduleLessons,
          done,
          progress: moduleLessons.length ? Math.round((done / moduleLessons.length) * 100) : 0,
          complete: moduleLessons.length > 0 && done === moduleLessons.length,
        };
      }),
    [modules, lessons, completed]
  );

  const totalDone = lessons.filter((lesson) => completed.has(lesson.id)).length;
  const overall = lessons.length ? Math.round((totalDone / lessons.length) * 100) : 0;
  const nextLesson = lessons.find((lesson) => !completed.has(lesson.id));

  const toggleModule = (id: string) => {
    setOpenModules((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!level) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <Target className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold">Nível não encontrado</h1>
          <Link to="/levels" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" /> Voltar aos níveis
          </Link>
        </div>
      </AppLayout>
    );
  }

  const color = levelColors[level.code] ?? "bg-primary";

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          to="/levels"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Todos os níveis
        </Link>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border bg-card"
        >
          <div className={cn("absolute inset-x-0 top-0 h-1.5", color)} />
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
              <div className={cn("flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-lg", color)}>
                {level.code}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Jornada CEFR
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {modules.length} {modules.length === 1 ? "módulo" : "módulos"}
                  </span>
                </div>
                <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{level.title}</h1>
                <p className="mt-2 max-w-3xl leading-6 text-muted-foreground">{level.description}</p>
              </div>

              {nextLesson && (
                <button
                  onClick={() => navigate(`/lesson/${nextLesson.id}`)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
                >
                  Continuar aula
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mt-8 grid gap-5 border-t pt-6 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">
                    Seu progresso · {totalDone} de {lessons.length} aulas
                  </span>
                  <span className="font-bold">{overall}%</span>
                </div>
                <Progress value={overall} className="h-2.5" />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {modulesWithStats.filter((item) => item.complete).length} módulos concluídos
              </div>
            </div>
          </div>
        </motion.section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <main>
            <div className="mb-4">
              <h2 className="font-display text-2xl font-bold">Seu percurso</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete os módulos na ordem recomendada para construir sua evolução.
              </p>
            </div>

            {modules.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
                <BookOpen className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                <h3 className="font-display text-lg font-bold">Conteúdo sendo preparado</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ainda não existem módulos cadastrados para este nível.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {modulesWithStats.map((item, index) => {
                  const isOpen = openModules.has(item.module.id);

                  return (
                    <motion.section
                      key={item.module.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "overflow-hidden rounded-2xl border bg-card transition-shadow",
                        item.progress > 0 && "shadow-sm"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleModule(item.module.id)}
                        className="w-full p-5 text-left transition hover:bg-muted/30 sm:p-6"
                        aria-expanded={isOpen}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                            item.complete ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
                          )}>
                            {item.complete ? <CheckCircle2 className="h-5 w-5" /> : String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Módulo {index + 1}
                              </span>
                              {item.complete && (
                                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                                  Concluído
                                </span>
                              )}
                            </div>
                            <h3 className="mt-1 font-display text-lg font-bold">{item.module.title}</h3>
                            {item.module.description && (
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.module.description}</p>
                            )}

                            <div className="mt-4 flex max-w-xl items-center gap-3">
                              <Progress value={item.progress} className="h-1.5 flex-1" />
                              <span className="w-10 text-right text-xs font-bold">{item.progress}%</span>
                            </div>
                          </div>

                          <ChevronDown
                            className={cn(
                              "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                              isOpen && "rotate-180"
                            )}
                          />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t bg-muted/10">
                          {item.lessons.length === 0 ? (
                            <p className="p-5 text-sm italic text-muted-foreground">Nenhuma aula neste módulo.</p>
                          ) : (
                            <div className="divide-y">
                              {item.lessons.map((lesson, lessonIndex) => {
                                const Icon = typeIcons[lesson.type] ?? FileText;
                                const isDone = completed.has(lesson.id);
                                const isNext = !isDone && lesson.id === nextLesson?.id;

                                return (
                                  <button
                                    key={lesson.id}
                                    type="button"
                                    onClick={() => navigate(`/lesson/${lesson.id}`)}
                                    className={cn(
                                      "group flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-background sm:px-6",
                                      isNext && "bg-primary/[0.04]"
                                    )}
                                  >
                                    <div className={cn(
                                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                      isDone ? "bg-success/10 text-success" : isNext ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                    )}>
                                      {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4.5 w-4.5" />}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                          Aula {lessonIndex + 1}
                                        </span>
                                        {isNext && (
                                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                                            Próxima
                                          </span>
                                        )}
                                      </div>
                                      <h4 className="truncate font-semibold">{lesson.title}</h4>
                                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{typeLabels[lesson.type] ?? lesson.type}</span>
                                        {lesson.duration_minutes && (
                                          <>
                                            <span>·</span>
                                            <span className="inline-flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              {lesson.duration_minutes} min
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.section>
                  );
                })}
              </div>
            )}
          </main>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border bg-card p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold">Resumo do nível</h3>
                  <p className="text-xs text-muted-foreground">Seu progresso atual</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Módulos</span>
                  <span className="font-semibold">{modules.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Aulas</span>
                  <span className="font-semibold">{lessons.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Concluídas</span>
                  <span className="font-semibold text-success">{totalDone}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="font-medium">Progresso</span>
                  <span className="font-bold">{overall}%</span>
                </div>
              </div>
            </div>

            {nextLesson && (
              <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <ArrowRight className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/70">Próximo passo</p>
                <h3 className="mt-1 font-display font-bold">{nextLesson.title}</h3>
                <button
                  onClick={() => navigate(`/lesson/${nextLesson.id}`)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-xs font-bold text-foreground transition hover:opacity-90"
                >
                  Começar aula
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
