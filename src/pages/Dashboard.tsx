import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Flame, Trophy, Target, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { ProgressRing } from "@/components/ProgressRing";

const levelColors: Record<string, string> = {
  A1: "#22C55E", A2: "#EAB308", B1: "#3B82F6", B2: "#A855F7", C1: "#EF4444", C2: "#0F172A",
};

export default function Dashboard() {
  const { profile, role } = useAuth();
  const [levels, setLevels] = useState<any[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: lv } = await supabase.from("levels").select("*").order("order_num");
      setLevels(lv ?? []);
      if (profile) {
        const { data: lessons } = await supabase.from("lessons").select("id");
        const { data: prog } = await supabase.from("lesson_progress").select("lesson_id").eq("completed", true);
        setProgress({ done: prog?.length ?? 0, total: lessons?.length ?? 0 });
      }
      setLoading(false);
    };
    load();
  }, [profile]);

  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  if (loading) return <AppLayout><div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-display font-bold">Olá, {profile?.full_name ?? "Estudante"}! 👋</h1>
          <p className="text-muted-foreground">
            Papel: <span className="font-semibold uppercase">{role}</span>
            {role === "teacher" && !profile?.is_approved && (
              <span className="ml-2 text-secondary">· Aguardando aprovação do admin</span>
            )}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Flame} label="Streak" value={`${profile?.streak_days ?? 0} dias`} color="text-secondary" />
          <StatCard icon={Trophy} label="Pontos" value={String(profile?.points ?? 0)} color="text-level-a2" />
          <StatCard icon={Target} label="Aulas concluídas" value={String(progress.done)} color="text-primary" />
          <StatCard icon={Target} label="Nível atual" value={profile?.current_level ?? "A1"} color="text-accent" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-display font-bold">Seus Níveis</h2>
            {levels.length === 0 && <p className="text-muted-foreground">Nenhum nível cadastrado ainda.</p>}
            {levels.map(lv => (
              <Link key={lv.id} to={`/levels/${lv.code.toLowerCase()}`}>
                <motion.div whileHover={{ scale: 1.01 }} className="p-5 rounded-2xl border border-border bg-card flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center font-display font-bold text-white text-lg" style={{ backgroundColor: levelColors[lv.code] ?? lv.color }}>
                    {lv.code}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold">{lv.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{lv.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              </Link>
            ))}
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border">
            <h3 className="text-lg font-display font-bold mb-4 text-center">Progresso Geral</h3>
            <div className="flex justify-center mb-4">
              <ProgressRing progress={percent} size={140}>
                <div className="text-center">
                  <div className="text-3xl font-display font-bold text-primary">{percent}%</div>
                  <div className="text-xs text-muted-foreground">completo</div>
                </div>
              </ProgressRing>
            </div>
            <div className="text-sm text-center text-muted-foreground">
              {progress.done} de {progress.total} aulas concluídas
            </div>
            <Link to="/levels" className="block mt-4">
              <Button variant="outline" className="w-full">Ver todos os níveis</Button>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <Icon className={`w-6 h-6 ${color} mb-2`} />
      <div className="text-2xl font-display font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
