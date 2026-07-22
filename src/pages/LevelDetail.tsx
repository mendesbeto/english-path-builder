import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Loader2, Play, FileText, Headphones, Mic, PenLine, HelpCircle, Award, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const typeIcons: Record<string, any> = {
  text: FileText, video: Play, audio: Headphones, quiz: HelpCircle,
  speaking: Mic, writing: PenLine, assessment: Award,
};

export default function LevelDetail() {
  const { levelId } = useParams();
  const { user } = useAuth();
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

  const markComplete = async (lessonId: string) => {
    if (!user) return;
    await supabase.from("lesson_progress").upsert({
      student_id: user.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString(),
    }, { onConflict: "student_id,lesson_id" });
    setCompleted(new Set([...completed, lessonId]));
  };

  if (loading) return <AppLayout><div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div></AppLayout>;
  if (!level) return <AppLayout><div className="p-8">Nível não encontrado</div></AppLayout>;

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-5xl">
        <Link to="/levels" className="text-sm text-muted-foreground hover:text-foreground">← Voltar aos níveis</Link>
        <h1 className="text-3xl font-display font-bold mt-2 mb-2">{level.code} — {level.title}</h1>
        <p className="text-muted-foreground mb-8">{level.description}</p>

        {modules.length === 0 && (
          <div className="p-8 rounded-2xl border border-dashed text-center text-muted-foreground">
            Nenhum módulo cadastrado ainda para este nível.
          </div>
        )}

        <div className="space-y-8">
          {modules.map(mod => {
            const modLessons = lessons.filter(l => l.module_id === mod.id);
            return (
              <div key={mod.id}>
                <h2 className="text-xl font-display font-bold mb-1">{mod.title}</h2>
                {mod.description && <p className="text-sm text-muted-foreground mb-3">{mod.description}</p>}
                <div className="space-y-2">
                  {modLessons.length === 0 && <p className="text-sm text-muted-foreground italic">Sem aulas ainda.</p>}
                  {modLessons.map(lesson => {
                    const Icon = typeIcons[lesson.type] ?? FileText;
                    const isDone = completed.has(lesson.id);
                    return (
                      <div key={lesson.id} className="p-4 rounded-xl border border-border bg-card flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDone ? "bg-primary/20" : "bg-muted"}`}>
                          {isDone ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Icon className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{lesson.title}</h4>
                          <p className="text-xs text-muted-foreground">{lesson.type} · {lesson.duration_minutes} min</p>
                        </div>
                        <Button variant={isDone ? "outline" : "default"} size="sm" onClick={() => markComplete(lesson.id)}>
                          {isDone ? "Concluído" : "Marcar concluído"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
