import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Play, Headphones, Mic, PenLine, HelpCircle, Award,
  CheckCircle2, XCircle, Clock,
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
  return yt ? `https://www.youtube.com/embed/${yt[1]}` : null;
}

export type PreviewLesson = {
  title: string;
  description?: string | null;
  type: string;
  content?: string | null;
  media_url?: string | null;
  duration_minutes?: number | null;
};

export type PreviewExercise = {
  id?: string;
  question: string;
  options: any;
  correct_answer: string;
  points?: number | null;
};

/**
 * Renderiza a aula exatamente como o aluno vê (mídia, texto, quiz/listening,
 * escrita e pronúncia). Nenhum progresso é salvo — é apenas visualização.
 */
export default function StudentLessonPreview({
  lesson,
  exercises = [],
}: {
  lesson: PreviewLesson;
  exercises?: PreviewExercise[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [writing, setWriting] = useState("");

  const items = useMemo(
    () => exercises.map((e, i) => ({ ...e, key: e.id ?? `ex-${i}` })),
    [exercises],
  );

  const result = useMemo(() => {
    if (!items.length) return null;
    const correct = items.filter(e => answers[e.key] === e.correct_answer);
    const points = correct.reduce((s, e) => s + (e.points ?? 0), 0);
    const maxPoints = items.reduce((s, e) => s + (e.points ?? 0), 0);
    return { correct: correct.length, total: items.length, points, maxPoints };
  }, [items, answers]);

  const Icon = typeIcons[lesson.type] ?? FileText;
  const embed = lesson.media_url ? toEmbed(lesson.media_url) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display font-bold leading-tight break-words">
            {lesson.title || "Sem título"}
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span className="px-2 py-0.5 rounded-full bg-muted">{typeLabels[lesson.type] ?? lesson.type}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{lesson.duration_minutes ?? 0} min</span>
          </div>
        </div>
      </div>

      {lesson.description && <p className="text-muted-foreground">{lesson.description}</p>}

      {lesson.media_url && (
        lesson.type === "audio" ? (
          <audio controls src={lesson.media_url} className="w-full" />
        ) : embed ? (
          <div className="aspect-video rounded-2xl overflow-hidden border border-border">
            <iframe src={embed} title={lesson.title} className="w-full h-full" allowFullScreen />
          </div>
        ) : (
          <video controls src={lesson.media_url} className="w-full rounded-2xl border border-border" />
        )
      )}

      {lesson.content && (
        <div className="p-6 rounded-2xl bg-card border border-border">
          <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{lesson.content}</p>
        </div>
      )}

      {lesson.type === "speaking" && (
        <div className="p-6 rounded-2xl bg-card border border-border">
          <h3 className="font-display font-bold mb-2">Grave sua pronúncia</h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </span>
            O aluno verá aqui o gravador de voz (gravação desativada na pré-visualização).
          </div>
        </div>
      )}

      {lesson.type === "writing" && (
        <div className="p-6 rounded-2xl bg-card border border-border">
          <h3 className="font-display font-bold mb-3">Sua resposta</h3>
          <Textarea rows={6} value={writing} onChange={e => setWriting(e.target.value)} placeholder="Escreva aqui em inglês..." />
          <p className="text-xs text-muted-foreground mt-2">
            {writing.trim().split(/\s+/).filter(Boolean).length} palavras
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-display font-bold">Exercícios</h3>
          {items.map((ex, i) => {
            const opts: string[] = Array.isArray(ex.options) ? (ex.options as string[]) : [];
            const chosen = answers[ex.key];
            return (
              <div key={ex.key} className="p-5 rounded-2xl bg-card border border-border">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="font-medium">{i + 1}. {ex.question}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{ex.points ?? 0} pts</span>
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
                          type="button"
                          disabled={submitted}
                          onClick={() => setAnswers({ ...answers, [ex.key]: opt })}
                          className={`text-left p-3 rounded-xl border transition-colors ${cls}`}
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
                      onChange={e => setAnswers({ ...answers, [ex.key]: e.target.value })}
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
              disabled={Object.keys(answers).length < items.length}
              onClick={() => setSubmitted(true)}
            >
              Enviar respostas
            </Button>
          ) : (
            result && (
              <div className="p-6 rounded-2xl border-2 border-primary bg-primary/5 text-center">
                <p className="text-3xl font-display font-bold text-primary">{result.correct}/{result.total}</p>
                <p className="text-muted-foreground">acertos · {result.points} de {result.maxPoints} pontos</p>
                <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setAnswers({}); }}>
                  Refazer
                </Button>
              </div>
            )
          )}
        </div>
      )}

      {!items.length && lesson.type !== "speaking" && lesson.type !== "writing" && (
        <Button className="w-full" variant="secondary" disabled>
          Marcar como concluída
        </Button>
      )}
    </div>
  );
}
