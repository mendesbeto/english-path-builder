import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight, BookOpen, Flame, GraduationCap, Loader2, Play,
  Target, Trophy, Users, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { ProgressRing } from "@/components/ProgressRing";
import JoinClassCard from "@/components/JoinClassCard";

const levelColors: Record<string, string> = {
  A1: "bg-level-a1", A2: "bg-level-a2", B1: "bg-level-b1",
  B2: "bg-level-b2", C1: "bg-level-c1", C2: "bg-level-c2",
};

type Level = { id: string; code: string; title: string; description?: string; order_num: number; color?: string };

export default function Dashboard() {
  const { profile, role } = useAuth();
  const [levels, setLevels] = useState<Level[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [{ data: lv }, { data: lessons }, { data: prog }] = await Promise.all([
        supabase.from("levels").select("*").order("order_num"),
        supabase.from("lessons").select("id"),
        supabase.from("lesson_progress").select("lesson_id").eq("completed", true),
      ]);
      if (!mounted) return;
      setLevels(lv ?? []);
      setProgress({ done: prog?.length ?? 0, total: lessons?.length ?? 0 });
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [profile]);

  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const currentLevel = profile?.current_level ?? "A1";
  const currentIndex = Math.max(0, levels.findIndex((level) => level.code === currentLevel));

  if (loading) {
    return <AppLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl space-y-8 p-4 md:p-6 lg:p-8">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-hero p-6 text-white shadow-lg md:p-8">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative max-w-3xl">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-white/75">Sua jornada de inglês</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
              Olá, {profile?.full_name?.split(" ")[0] ?? "Estudante"}! 👋
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
              Continue de onde parou e avance um passo por vez. A consistência transforma pequenos estudos em progresso real.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={`/levels/${currentLevel.toLowerCase()}`}>
                <Button className="bg-white text-foreground hover:bg-white/90">
                  <Play className="h-4 w-4" /> Continuar aprendizagem
                </Button>
              </Link>
              <Link to="/levels">
                <Button variant="ghost" className="border border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  Ver percurso
                </Button>
              </Link>
            </div>
          </div>
        </motion.section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={Flame} label="Sequência" value={`${profile?.streak_days ?? 0} dias`} />
          <StatCard icon={Trophy} label="Pontos" value={String(profile?.points ?? 0)} />
          <StatCard icon={Target} label="Aulas concluídas" value={String(progress.done)} />
          <StatCard icon={GraduationCap} label="Nível atual" value={currentLevel} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-medium text-primary">Percurso CEFR</p>
                <h2 className="font-display text-2xl font-extrabold">Seu caminho de A1 a C2</h2>
              </div>
              <Link to="/levels" className="hidden text-sm font-semibold text-primary hover:underline sm:block">Ver todos</Link>
            </div>

            <div className="relative space-y-3">
              {levels.map((level, index) => {
                const active = level.code === currentLevel;
                const completed = index < currentIndex;
                return (
                  <Link key={level.id} to={`/levels/${level.code.toLowerCase()}`}>
                    <motion.div whileHover={{ x: 3 }} className={`group flex items-center gap-4 rounded-2xl border p-4 transition-all ${active ? "border-primary/30 bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/20"}`}>
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-sm ${levelColors[level.code] ?? "bg-primary"}`}>
                        {level.code}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display font-bold">{level.title}</h3>
                          {active && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">Atual</span>}
                          {completed && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">Concluído</span>}
                        </div>
                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{level.description}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    </motion.div>
                  </Link>
                );
              })}
              {levels.length === 0 && <EmptyLevels />}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <div className="rounded-xl bg-primary/10 p-2 text-primary"><Zap className="h-4 w-4" /></div>
                <div><h3 className="font-display font-bold">Seu progresso</h3><p className="text-xs text-muted-foreground">Visão geral das aulas</p></div>
              </div>
              <div className="flex justify-center">
                <ProgressRing progress={percent} size={148}>
                  <div className="text-center"><div className="font-display text-3xl font-extrabold text-primary">{percent}%</div><div className="text-xs text-muted-foreground">concluído</div></div>
                </ProgressRing>
              </div>
              <p className="mt-4 text-center text-sm text-muted-foreground"><strong className="text-foreground">{progress.done}</strong> de {progress.total} aulas concluídas</p>
              <Link to="/levels" className="mt-5 block"><Button variant="outline" className="w-full">Continuar estudando <ArrowRight className="h-4 w-4" /></Button></Link>
            </div>
            {role === "student" && <JoinClassCard />}
          </aside>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <QuickAction icon={BookOpen} title="Explorar aulas" text="Encontre conteúdos por nível." to="/levels" />
          <QuickAction icon={Users} title="Minhas turmas" text="Acompanhe suas turmas e atividades." to="/my-classes" />
          <QuickAction icon={Target} title="Próximo passo" text={`Continue no nível ${currentLevel}.`} to={`/levels/${currentLevel.toLowerCase()}`} />
        </section>

        {role === "teacher" && !profile?.is_approved && (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground">
            Sua conta de professor está aguardando aprovação do administrador.
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: string }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <Icon className="mb-3 h-5 w-5 text-primary" />
      <p className="text-2xl font-display font-extrabold tracking-tight">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
    </motion.div>
  );
}

function QuickAction({ icon: Icon, title, text, to }: { icon: typeof BookOpen; title: string; text: string; to: string }) {
  return (
    <Link to={to}>
      <motion.div whileHover={{ y: -2 }} className="h-full rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30">
        <Icon className="mb-4 h-5 w-5 text-primary" />
        <h3 className="font-display font-bold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </motion.div>
    </Link>
  );
}

function EmptyLevels() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
      <BookOpen className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
      <p className="font-semibold">Nenhum nível disponível</p>
      <p className="mt-1 text-sm text-muted-foreground">Os níveis aparecerão aqui quando forem configurados.</p>
    </div>
  );
}
