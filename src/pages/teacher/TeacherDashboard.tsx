import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Plus, Users } from "lucide-react";

export default function TeacherDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ myLessons: 0, myModules: 0, students: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: lessons }, { count: modules }, { data: students }] = await Promise.all([
        supabase.from("lessons").select("*", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("modules").select("*", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("user_roles").select("user_id").eq("role", "student"),
      ]);
      setStats({ myLessons: lessons ?? 0, myModules: modules ?? 0, students: students?.length ?? 0 });
    })();
  }, [user]);

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <h1 className="text-3xl font-display font-bold mb-2">Painel do Professor</h1>
        {profile && !profile.is_approved && (
          <div className="p-4 mb-6 rounded-xl bg-secondary/10 border border-secondary/30 text-sm">
            Sua conta ainda não foi aprovada pelo administrador. Você pode navegar, mas suas ações podem ser bloqueadas.
          </div>
        )}
        <p className="text-muted-foreground mb-8">Bem-vindo, {profile?.full_name}.</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-card border">
            <BookOpen className="w-6 h-6 text-primary mb-2" />
            <div className="text-2xl font-display font-bold">{stats.myLessons}</div>
            <div className="text-sm text-muted-foreground">Minhas aulas</div>
          </div>
          <div className="p-4 rounded-xl bg-card border">
            <BookOpen className="w-6 h-6 text-accent mb-2" />
            <div className="text-2xl font-display font-bold">{stats.myModules}</div>
            <div className="text-sm text-muted-foreground">Meus módulos</div>
          </div>
          <div className="p-4 rounded-xl bg-card border">
            <Users className="w-6 h-6 text-secondary mb-2" />
            <div className="text-2xl font-display font-bold">{stats.students}</div>
            <div className="text-sm text-muted-foreground">Alunos na plataforma</div>
          </div>
        </div>

        <Link to="/teacher/lessons" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium">
          <Plus className="w-4 h-4" /> Gerenciar aulas
        </Link>
      </div>
    </AppLayout>
  );
}
