import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, BookMarked, GraduationCap, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, teachers: 0, students: 0, pendingTeachers: 0, levels: 0, modules: 0, lessons: 0 });
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const [{ count: users }, { data: roles }, { data: profs }, { count: levels }, { count: modules }, { count: lessons }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("role"),
        supabase.from("profiles").select("id, is_approved"),
        supabase.from("levels").select("*", { count: "exact", head: true }),
        supabase.from("modules").select("*", { count: "exact", head: true }),
        supabase.from("lessons").select("*", { count: "exact", head: true }),
      ]);
      const teachers = (roles ?? []).filter(r => r.role === "teacher").length;
      const students = (roles ?? []).filter(r => r.role === "student").length;
      const pendingTeachers = (profs ?? []).filter(p => !p.is_approved).length;
      setStats({ users: users ?? 0, teachers, students, pendingTeachers, levels: levels ?? 0, modules: modules ?? 0, lessons: lessons ?? 0 });
    })();
  }, []);

  const cards = [
    { icon: Users, label: "Usuários", value: stats.users, color: "text-primary" },
    { icon: GraduationCap, label: "Alunos", value: stats.students, color: "text-level-a1" },
    { icon: ShieldCheck, label: "Professores", value: stats.teachers, color: "text-secondary" },
    { icon: Users, label: "Professores pendentes", value: stats.pendingTeachers, color: "text-level-c1" },
    { icon: BookMarked, label: "Níveis", value: stats.levels, color: "text-level-b1" },
    { icon: BookMarked, label: "Módulos", value: stats.modules, color: "text-level-b2" },
    { icon: BookMarked, label: "Aulas", value: stats.lessons, color: "text-accent" },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <h1 className="text-3xl font-display font-bold mb-2">Painel Administrativo</h1>
        <p className="text-muted-foreground mb-8">Visão geral do sistema Inglês Hope</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {cards.map((c, i) => (
            <div key={i} className="p-4 rounded-xl bg-card border border-border">
              <c.icon className={`w-6 h-6 ${c.color} mb-2`} />
              <div className="text-2xl font-display font-bold">{c.value}</div>
              <div className="text-sm text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/admin/users" className="p-6 rounded-2xl border border-border bg-card hover:shadow-md">
            <Users className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-display font-bold text-lg mb-1">Gerenciar Usuários</h3>
            <p className="text-sm text-muted-foreground">Aprovar professores, alterar papéis, remover contas.</p>
          </Link>
          <Link to="/admin/levels" className="p-6 rounded-2xl border border-border bg-card hover:shadow-md">
            <BookMarked className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-display font-bold text-lg mb-1">Níveis & Módulos</h3>
            <p className="text-sm text-muted-foreground">Editar níveis CEFR e criar módulos de conteúdo.</p>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
