import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Loader2, Play, FileText, Headphones, Mic, PenLine, HelpCircle, Award, CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";

const typeIcons: Record<string, any> = {
  text: FileText, video: Play, audio: Headphones, quiz: HelpCircle,
  speaking: Mic, writing: PenLine, assessment: Award,
};

const typeLabels: Record<string, string> = {
  text: "Leitura", video: "Vídeo", audio: "Áudio", quiz: "Quiz",
  speaking: "Pronúncia", writing: "Escrita", assessment: "Avaliação",
};

const levelColors: Record<string, string> = {
  A1: "#22C55E", A2: "#EAB308", B1: "#3B82F6", B2: "#A855F7", C1: "#EF4444", C2: "#0F172A",
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

  useEffect(() => {
    (async () => {
      if (!levelId) return;
      const { data: lv } = await supabase.from("levels").select("*").eq("code", levelId.toUpperCase() as any).maybeSingle();
      setLevel(lv);
      if (lv) {
        const { data: mods } = await supabase.from("modules").select("*").eq("level_id", lv.id).order("order_num");
        setModules(mods ?? []);
        const modIds = (mods ?? []).map(m => m.id);
        if (modIds.length) {
          const { data: less } = await supabase.from("lessons").select("*").in("module_id", modIds).order("order_num");
          setLessons(less ?? []);
        }
        if (user) {
          const { data: prog } = await supabase.from("lesson_progress").select("lesson_id").eq("student_id", user.id).eq("completed", true);
          setCompleted(new Set((prog ?? []).map(p => p.lesson_id)));
        }
      }
      setLoading(false);
    })();
  }, [levelId, user]);

  if (loading) return <AppLayout><div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div></AppLayout>;
  if (!level) return <AppLayout><div className="p-8">Nível não encontrado</div></AppLayout>;

  const color = levelColors[level.code] ?? level.color;
  const totalDone = lessons.filter(l => completed.has(l.id)).length;
  const overall = lessons.length ? Math.round((totalDone / lessons.length) * 100) : 0;

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-5xl">
        <Link to="/levels" className="text-sm text-muted-foreground hover:text-foreground">← Voltar aos níveis</Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="mt-3 mb-8 p-6 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-bold text-white text-xl shrink-0"
              style={{ backgroundColor: color }}>
              {level.code}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-display font-bold">{level.title}</h1>
              <p className="text-muted-foreground line-clamp-2">{level.description}</p>
            </div>
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">{totalDone} de {lessons.length} aulas concluídas</span>
              <span className="font-semibold">{overall}%</span>
            </div>
            <Progress value={overall} className="h-2" />
          </div>
        </motion.div>

        {modules.length === 0 && (
          <div className="p-8 rounded-2xl border border-dashed text-center text-muted-foreground">
            Nenhum módulo cadastrado ainda para este nível.
          </div>
        )}

        <div className="space-y-8">
          {modules.map((mod, mi) => {
            const modLessons = lessons.filter(l => l.module_id === mod.id);
            const done = modLessons.filter(l => completed.has(l.id)).length;
            const pct = modLessons.length ? Math.round((done / modLessons.length) * 100) : 0;
            return (
              <motion.div key={mod.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: mi * 0.05 }}
                className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-5 border-b border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
                        Módulo {mi + 1}
                      </p>
                      <h2 className="text-lg font-display font-bold">{mod.title}</h2>
                      {mod.description && <p className="text-sm text-muted-foreground">{mod.description}</p>}
                    </div>
                    <span className="text-sm font-semibold shrink-0">{done}/{modLessons.length}</span>
                  </div>
                  <Progress value={pct} className="h-1.5 mt-3" />
                </div>

                <div className="divide-y divide-border">
                  {modLessons.length === 0 && <p className="p-5 text-sm text-muted-foreground italic">Sem aulas ainda.</p>}
                  {modLessons.map(lesson => {
                    const Icon = typeIcons[lesson.type] ?? FileText;
                    const isDone = completed.has(lesson.id);
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => navigate(`/lesson/${lesson.id}`)}
                        className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isDone ? "bg-success/15" : "bg-muted"}`}>
                          {isDone ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Icon className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{lesson.title}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{typeLabels[lesson.type] ?? lesson.type}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lesson.duration_minutes} min</span>
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
