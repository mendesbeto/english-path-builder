import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import PronunciationRecorder from "@/components/PronunciationRecorder";
import {
  ArrowLeft, ArrowRight, Award, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, FileText, Headphones, HelpCircle, Loader2, Mic, PenLine, Play,
  Sparkles, Target, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, any> = {
  text: FileText, video: Play, audio: Headphones, quiz: HelpCircle,
  speaking: Mic, writing: PenLine, assessment: Award,
};

const typeLabels: Record<string, string> = {
  text: "Leitura", video: "Vídeo", audio: "Áudio", quiz: "Quiz",
  speaking: "Pronúncia", writing: "Escrita", assessment: "Avaliação",
};

function toEmbed(url: string) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return yt ? `https://www.youtube.com/embed/${yt[1]}` : null;
}

export default function Lesson() {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<any>(null);
  const [module, setModule] = useState<any>(null);
  const [level, setLevel] = useState<any>(null);
  const [siblings, setSiblings] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [writing, setWriting] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setSubmitted(false);
      setQuizResult(null);
      setAnswers({});
      setWriting("");
      if (!lessonId) return;

      const { data: l } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
      if (!active) return;
      setLesson(l);

      if (l) {
        const [{ data: m }, { data: ex }, { data: sib }] = await Promise.all([
          supabase.from("modules").select("*").eq("id", l.module_id).maybeSingle(),
          supabase.from("exercises").select("id,lesson_id,question,options,points,order_num").eq("lesson_id", l.id).order("order_num"),
          supabase.from("lessons").select("id,title,type,order_num").eq("module_id", l.module_id).order("order_num"),
        ]);

        setModule(m);
        setExercises(ex ?? []);
        setSiblings(sib ?? []);

        if (m) {
          const { data: lv } = await supabase.from("levels").select("*").eq("id", m.level_id).maybeSingle();
          if (active) setLevel(lv);
        }

        if (user) {
          const { data: pr } = await supabase
            .from("lesson_progress")
            .select("*")
            .eq("student_id", user.id)
            .eq("lesson_id", l.id)
            .maybeSingle();
          if (active) setProgress(pr);
        }
      }

      if (active) {
        setLoading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    load();
    return () => { active = false; };
  }, [lessonId, user]);

  const idx = siblings.findIndex((s) => s.id === lessonId);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const saveProgress = async (answersToSubmit: Record<string, string> = {}) => {
    if (!user || !lessonId) return false;
    setSaving(true);

    const { data, error } = await supabase.rpc("submit_lesson_attempt", {
      p_lesson_id: lessonId,
      p_answers: answersToSubmit,
    });

    setSaving(false);

    if (error) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
      return false;
    }

    if (data) {
      setQuizResult(data);
      setProgress((current: any) => ({
        ...(current ?? {}),
        completed: true,
        score: data.score ?? 0,
        completed_at: new Date().toISOString(),
      }));
    }

    toast({
      title: "Aula concluída!",
      description: data?.score ? `Pontuação registrada: ${data.score}` : "Seu progresso foi atualizado.",
    });
    return true;
  };

  const submitQuiz = async () => {
    const saved = await saveProgress(answers);
    if (saved) setSubmitted(true);
  };


  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!lesson) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <Target className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold">Aula não encontrada</h1>
          <Link to="/levels" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" /> Voltar aos níveis
          </Link>
        </div>
      </AppLayout>
    );
  }

  const Icon = typeIcons[lesson.type] ?? FileText;
  const embed = lesson.media_url ? toEmbed(lesson.media_url) : null;
  const isQuiz = exercises.length > 0;
  const lessonPosition = siblings.length ? ((idx + 1) / siblings.length) * 100 : 0;

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to={level ? `/levels/${level.code.toLowerCase()}` : "/levels"}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao percurso
          </Link>
          {progress?.completed && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-bold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Concluída
            </span>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          <main>
            <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                {level && <span>{level.code}</span>}
                {module && <><span>/</span><span>{module.title}</span></>}
                <span>/</span>
                <span className="text-foreground">{typeLabels[lesson.type] ?? lesson.type}</span>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">
                      {typeLabels[lesson.type] ?? lesson.type}
                    </span>
                    {lesson.duration_minutes && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {lesson.duration_minutes} min
                      </span>
                    )}
                  </div>
                  <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{lesson.title}</h1>
                  {lesson.description && (
                    <p className="mt-2 max-w-3xl leading-6 text-muted-foreground">{lesson.description}</p>
                  )}
                </div>
              </div>

              {siblings.length > 1 && (
                <div className="mt-6 rounded-2xl border bg-card p-4">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold">Progresso do módulo</span>
                    <span className="text-muted-foreground">Aula {idx + 1} de {siblings.length}</span>
                  </div>
                  <Progress value={lessonPosition} className="h-2" />
                </div>
              )}
            </motion.header>

            <div className="mt-7 space-y-6">
              {lesson.media_url && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-2xl border bg-card"
                >
                  {lesson.type === "audio" ? (
                    <div className="p-6">
                      <audio controls src={lesson.media_url} className="w-full" />
                    </div>
                  ) : embed ? (
                    <div className="aspect-video">
                      <iframe
                        src={embed}
                        title={lesson.title}
                        className="h-full w-full"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <video controls src={lesson.media_url} className="w-full" />
                  )}
                </motion.section>
              )}

              {lesson.content && (
                <section className="rounded-2xl border bg-card p-6 sm:p-8">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="font-display font-bold">Conteúdo da aula</h2>
                      <p className="text-xs text-muted-foreground">Leia com atenção antes de avançar.</p>
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">{lesson.content}</div>
                </section>
              )}

              {lesson.type === "speaking" && (
                <section className="rounded-2xl border bg-card p-6 sm:p-8">
                  <div className="mb-5">
                    <h2 className="font-display text-xl font-bold">Pratique sua pronúncia</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Grave sua resposta e pratique quantas vezes precisar.</p>
                  </div>
                  <PronunciationRecorder lessonId={lesson.id} />
                </section>
              )}

              {lesson.type === "writing" && (
                <section className="rounded-2xl border bg-card p-6 sm:p-8">
                  <div className="mb-5">
                    <h2 className="font-display text-xl font-bold">Produção escrita</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Escreva em inglês e revise antes de concluir.</p>
                  </div>
                  <Textarea
                    rows={10}
                    value={writing}
                    onChange={(e) => setWriting(e.target.value)}
                    placeholder="Escreva sua resposta em inglês..."
                    className="resize-y"
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    {writing.trim().split(/\s+/).filter(Boolean).length} palavras
                  </div>
                </section>
              )}

              {isQuiz && (
                <section>
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h2 className="font-display text-xl font-bold">Exercícios</h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Responda todas as questões para registrar a conclusão.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {exercises.map((ex, i) => {
                      const opts: string[] = Array.isArray(ex.options) ? ex.options as string[] : [];
                      const chosen = answers[ex.id];

                      return (
                        <div key={ex.id} className="rounded-2xl border bg-card p-5 sm:p-6">
                          <div className="mb-4 flex items-start justify-between gap-4">
                            <p className="font-semibold leading-6">{i + 1}. {ex.question}</p>
                            <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[11px] font-bold">
                              {ex.points} pts
                            </span>
                          </div>

                          {opts.length ? (
                            <div className="grid gap-2">
                              {opts.map((opt) => {
                                const isChosen = chosen === opt;
                                const isCorrect = submitted && quizResult?.results?.[ex.id] && answers[ex.id] === opt;
                                const state = submitted
                                  ? isCorrect
                                    ? "border-success bg-success/10"
                                    : isChosen
                                      ? "border-destructive bg-destructive/10"
                                      : "border-border"
                                  : isChosen
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/50";

                                return (
                                  <button
                                    key={opt}
                                    disabled={submitted}
                                    onClick={() => setAnswers((current) => ({ ...current, [ex.id]: opt }))}
                                    className={cn("rounded-xl border-2 px-4 py-3 text-left transition", state)}
                                  >
                                    <span className="flex items-center justify-between gap-3">
                                      {opt}
                                      {submitted && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
                                      {submitted && isChosen && !isCorrect && <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <Textarea
                              value={chosen ?? ""}
                              disabled={submitted}
                              onChange={(e) => setAnswers((current) => ({ ...current, [ex.id]: e.target.value }))}
                              placeholder="Digite sua resposta"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!submitted ? (
                    <Button
                      className="mt-5 w-full"
                      disabled={Object.keys(answers).length < exercises.length || saving}
                      onClick={submitQuiz}
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Enviar respostas
                    </Button>
                  ) : (
                    quizResult && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-5 rounded-2xl border bg-primary/5 p-6 text-center"
                      >
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Award className="h-7 w-7" />
                        </div>
                        <p className="mt-3 font-display text-3xl font-bold text-primary">{quizResult.correct}/{quizResult.total}</p>
                        <p className="text-sm text-muted-foreground">{quizResult.score} de {quizResult.max_points} pontos</p>
                        <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setQuizResult(null); setAnswers({}); }}>
                          Refazer exercício
                        </Button>
                      </motion.div>
                    )
                  )}
                </section>
              )}

              {!isQuiz && !progress?.completed && (
                <section className="rounded-2xl bg-primary p-6 text-primary-foreground sm:p-7">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-primary-foreground/70">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wide">Pronto para concluir?</span>
                      </div>
                      <h2 className="mt-1 font-display text-xl font-bold">Finalize esta aula</h2>
                      <p className="mt-1 text-sm text-primary-foreground/75">Registre seu progresso e avance para a próxima atividade.</p>
                    </div>
                    <Button
                      variant="secondary"
                      disabled={saving}
                      onClick={() => saveProgress()}
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Marcar como concluída
                    </Button>
                  </div>
                </section>
              )}

              {progress?.completed && (
                <div className="rounded-2xl border border-success/30 bg-success/5 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                    <div>
                      <h3 className="font-display font-bold">Aula concluída</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Seu progresso foi registrado. Continue para a próxima aula quando estiver pronto.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3 border-t pt-5">
              <Button variant="ghost" disabled={!prev} onClick={() => prev && navigate(`/lesson/${prev.id}`)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
              <Button variant="outline" disabled={!next} onClick={() => next && navigate(`/lesson/${next.id}`)}>
                Próxima
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </main>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border bg-card p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold">Nesta aula</h3>
                  <p className="text-xs text-muted-foreground">Seu progresso</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-semibold">{typeLabels[lesson.type] ?? lesson.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Duração</span>
                  <span className="font-semibold">{lesson.duration_minutes ?? "—"} min</span>
                </div>
                {isQuiz && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Exercícios</span>
                    <span className="font-semibold">{exercises.length}</span>
                  </div>
                )}
                {progress?.completed && (
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-bold text-success">Concluída</span>
                  </div>
                )}
              </div>
            </div>

            {next && (
              <div className="rounded-2xl bg-muted/50 p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Próxima aula</p>
                <h3 className="mt-1 font-display font-bold">{next.title}</h3>
                <button
                  onClick={() => navigate(`/lesson/${next.id}`)}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary"
                >
                  Continuar <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
