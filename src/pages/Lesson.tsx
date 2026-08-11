import { useEffect, useMemo, useState } from "react";
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
  Loader2, FileText, Play, Headphones, Mic, PenLine, HelpCircle, Award,
  CheckCircle2, ChevronLeft, ChevronRight, XCircle, Clock,
} from "lucide-react";

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
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return null;
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
  const [progress, setProgress] = useState<any>(null);
  const [writing, setWriting] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setSubmitted(false);
      setAnswers({});
      if (!lessonId) return;
      const { data: l } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
      setLesson(l);
      if (l) {
        const [{ data: m }, { data: ex }, { data: sib }] = await Promise.all([
          supabase.from("modules").select("*").eq("id", l.module_id).maybeSingle(),
          supabase.from("exercises").select("*").eq("lesson_id", l.id).order("order_num"),
          supabase.from("lessons").select("id,title,type,order_num").eq("module_id", l.module_id).order("order_num"),
        ]);
        setModule(m); setExercises(ex ?? []); setSiblings(sib ?? []);
        if (m) {
          const { data: lv } = await supabase.from("levels").select("*").eq("id", m.level_id).maybeSingle();
          setLevel(lv);
        }
        if (user) {
          const { data: pr } = await supabase.from("lesson_progress")
            .select("*").eq("student_id", user.id).eq("lesson_id", l.id).maybeSingle();
          setProgress(pr);
        }
      }
      setLoading(false);
      window.scrollTo({ top: 0 });
    })();
  }, [lessonId, user]);

  const idx = siblings.findIndex(s => s.id === lessonId);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const result = useMemo(() => {
    if (!exercises.length) return null;
    const correct = exercises.filter(e => answers[e.id] === e.correct_answer);
    const points = correct.reduce((s, e) => s + (e.points ?? 0), 0);
    const maxPoints = exercises.reduce((s, e) => s + (e.points ?? 0), 0);
    return { correct: correct.length, total: exercises.length, points, maxPoints };
  }, [exercises, answers]);

  const saveProgress = async (score: number) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("lesson_progress").upsert({
      student_id: user.id, lesson_id: lessonId!, completed: true,
      score, completed_at: new Date().toISOString(),
    }, { onConflict: "student_id,lesson_id" });
    setSaving(false);
    if (error) return toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    setProgress({ completed: true, score });
    toast({ title: "Progresso salvo!", description: score ? `Pontuação: ${score}` : undefined });
  };

  const submitQuiz = async () => {
    setSubmitted(true);
    if (result) await saveProgress(result.points);
  };

  if (loading) return <AppLayout><div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div></AppLayout>;
  if (!lesson) return <AppLayout><div className="p-8">Aula não encontrada.</div></AppLayout>;

  const Icon = typeIcons[lesson.type] ?? FileText;
  const embed = lesson.media_url ? toEmbed(lesson.media_url) : null;
  const isQuiz = exercises.length > 0;

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap">
          <Link to="/levels" className="hover:text-foreground">Níveis</Link>
          {level && <><span>/</span><Link to={`/levels/${level.code.toLowerCase()}`} className="hover:text-foreground">{level.code}</Link></>}
          {module && <><span>/</span><span className="truncate max-w-[180px]">{module.title}</span></>}
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-display font-bold leading-tight">{lesson.title}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="px-2 py-0.5 rounded-full bg-muted">{typeLabels[lesson.type] ?? lesson.type}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{lesson.duration_minutes} min</span>
                {progress?.completed && <span className="flex items-center gap-1 text-success"><CheckCircle2 className="w-4 h-4" />Concluída</span>}
              </div>
            </div>
          </div>
          {siblings.length > 1 && (
            <div className="mt-4">
              <Progress value={((idx + 1) / siblings.length) * 100} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">Aula {idx + 1} de {siblings.length} neste módulo</p>
            </div>
          )}
        </motion.div>

        {lesson.description && <p className="text-muted-foreground mb-6">{lesson.description}</p>}

        {/* Mídia */}
        {lesson.media_url && (
          <div className="mb-6">
            {lesson.type === "audio" ? (
              <audio controls src={lesson.media_url} className="w-full" />
            ) : embed ? (
              <div className="aspect-video rounded-2xl overflow-hidden border border-border">
                <iframe src={embed} title={lesson.title} className="w-full h-full" allowFullScreen />
              </div>
            ) : (
              <video controls src={lesson.media_url} className="w-full rounded-2xl border border-border" />
            )}
          </div>
        )}

        {/* Conteúdo */}
        {lesson.content && (
          <div className="p-6 rounded-2xl bg-card border border-border mb-6">
            <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{lesson.content}</p>
          </div>
        )}

        {/* Pronúncia */}
        {lesson.type === "speaking" && (
          <div className="p-6 rounded-2xl bg-card border border-border mb-6">
            <h3 className="font-display font-bold mb-3">Grave sua pronúncia</h3>
            <PronunciationRecorder lessonId={lesson.id} />
          </div>
        )}

        {/* Escrita */}
        {lesson.type === "writing" && (
          <div className="p-6 rounded-2xl bg-card border border-border mb-6">
            <h3 className="font-display font-bold mb-3">Sua resposta</h3>
            <Textarea rows={8} value={writing} onChange={e => setWriting(e.target.value)} placeholder="Escreva aqui em inglês..." />
            <p className="text-xs text-muted-foreground mt-2">{writing.trim().split(/\s+/).filter(Boolean).length} palavras</p>
          </div>
        )}

        {/* Exercícios */}
        {isQuiz && (
          <div className="space-y-4 mb-6">
            <h3 className="text-xl font-display font-bold">Exercícios</h3>
            {exercises.map((ex, i) => {
              const opts: string[] = Array.isArray(ex.options) ? ex.options as string[] : [];
              const chosen = answers[ex.id];
              return (
                <div key={ex.id} className="p-5 rounded-2xl bg-card border border-border">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="font-medium">{i + 1}. {ex.question}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{ex.points} pts</span>
                  </div>
                  {opts.length ? (
                    <div className="grid gap-2">
                      {opts.map(opt => {
                        const isChosen = chosen === opt;
                        const isCorrect = ex.correct_answer === opt;
                        let cls = "border-border hover:border-primary/60";
                        if (submitted && isCorrect) cls = "border-success bg-success/10";
                        else if (submitted && isChosen) cls = "border-destructive bg-destructive/10";
                        else if (isChosen) cls = "border-primary bg-primary/10";
                        return (
                          <button
                            key={opt}
                            disabled={submitted}
                            onClick={() => setAnswers({ ...answers, [ex.id]: opt })}
                            className={`text-left px-4 py-3 rounded-xl border-2 transition-colors ${cls}`}
                          >
                            <span className="flex items-center justify-between gap-2">
                              {opt}
                              {submitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
                              {submitted && isChosen && !isCorrect && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div>
                      <Textarea
                        value={chosen ?? ""}
                        disabled={submitted}
                        onChange={e => setAnswers({ ...answers, [ex.id]: e.target.value })}
                        placeholder="Digite sua resposta"
                      />
                      {submitted && (
                        <p className="text-sm mt-2">
                          Resposta correta: <span className="font-semibold">{ex.correct_answer}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {!submitted ? (
              <Button
                className="w-full"
                disabled={Object.keys(answers).length < exercises.length || saving}
                onClick={submitQuiz}
              >
                Enviar respostas
              </Button>
            ) : (
              result && (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-2xl border-2 border-primary bg-primary/5 text-center">
                  <p className="text-3xl font-display font-bold text-primary">{result.correct}/{result.total}</p>
                  <p className="text-muted-foreground">acertos · {result.points} de {result.maxPoints} pontos</p>
                  <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setAnswers({}); }}>
                    Refazer
                  </Button>
                </motion.div>
              )
            )}
          </div>
        )}

        {/* Concluir */}
        {!isQuiz && (
          <Button className="w-full mb-6" disabled={saving} onClick={() => saveProgress(progress?.score ?? 0)}>
            {progress?.completed ? "Marcar novamente como concluída" : "Marcar como concluída"}
          </Button>
        )}

        {/* Navegação */}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button variant="ghost" disabled={!prev} onClick={() => prev && navigate(`/lesson/${prev.id}`)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
          <Button variant="ghost" disabled={!next} onClick={() => next && navigate(`/lesson/${next.id}`)}>
            Próxima <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
