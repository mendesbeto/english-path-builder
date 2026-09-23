import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Search, ShieldCheck, UserCheck, Users, XCircle, Loader2 } from "lucide-react";

type Role = "admin" | "teacher" | "student";
type Row = { id: string; full_name: string | null; current_level: string; points: number; is_approved: boolean; role: Role; created_at?: string };

export default function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending">("all");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [{ data: profiles, error: profileError }, { data: roles, error: roleError }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, current_level, points, is_approved, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (profileError || roleError) {
      toast({ title: "Erro ao carregar usuários", description: (profileError || roleError)?.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const roleMap = new Map<string, Role>();
    (roles ?? []).forEach((r) => {
      const current = roleMap.get(r.user_id) as Role | undefined;
      const next = r.role as Role;
      if (!current || next === "admin" || (next === "teacher" && current === "student")) {
        roleMap.set(r.user_id, next);
      }
    });
    setRows((profiles ?? []).map(p => ({ ...p, role: roleMap.get(p.id) ?? "student" })) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setRole = async (userId: string, newRole: Role) => {
    const { error } = await supabase.rpc("set_user_role", {
      target_user_id: userId,
      new_role: newRole,
    });
    if (error) return toast({ title: "Erro ao atualizar papel", description: error.message, variant: "destructive" });
    toast({ title: "Papel atualizado" });
    load();
  };

  const toggleApprove = async (userId: string, approved: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_approved: !approved }).eq("id", userId);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: !approved ? "Usuário aprovado" : "Usuário suspenso" });
    load();
  };

  const filtered = useMemo(() => rows.filter(r => {
    const text = (r.full_name ?? "").toLowerCase();
    return text.includes(query.toLowerCase()) &&
      (roleFilter === "all" || r.role === roleFilter) &&
      (statusFilter === "all" || (statusFilter === "approved" ? r.is_approved : !r.is_approved));
  }), [rows, query, roleFilter, statusFilter]);

  const counts = useMemo(() => ({
    total: rows.length,
    students: rows.filter(r => r.role === "student").length,
    teachers: rows.filter(r => r.role === "teacher").length,
    pending: rows.filter(r => r.role === "teacher" && !r.is_approved).length,
  }), [rows]);

  const roleLabel: Record<Role, string> = { student: "Aluno", teacher: "Professor", admin: "Admin" };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><Badge variant="secondary" className="mb-2">Administração</Badge><h1 className="text-3xl font-bold tracking-tight">Usuários</h1><p className="mt-1 text-muted-foreground">Pesquise contas, ajuste papéis e controle aprovações.</p></div>
          <Button variant="outline" onClick={load} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Atualizar</Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total", counts.total, Users], ["Alunos", counts.students, UserCheck], ["Professores", counts.teachers, ShieldCheck], ["Pendentes", counts.pending, XCircle],
          ].map(([label, value, Icon]) => <Card key={String(label)} className="rounded-2xl"><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-muted p-2.5"><Icon className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div></CardContent></Card>)}
        </div>

        <Card className="rounded-2xl">
          <CardContent className="flex flex-col gap-3 p-4 lg:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar por nome..." className="pl-9" /></div>
            <Select value={roleFilter} onValueChange={v => setRoleFilter(v as typeof roleFilter)}><SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Papel" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os papéis</SelectItem><SelectItem value="student">Alunos</SelectItem><SelectItem value="teacher">Professores</SelectItem><SelectItem value="admin">Administradores</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}><SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os estados</SelectItem><SelectItem value="approved">Aprovados</SelectItem><SelectItem value="pending">Pendentes</SelectItem></SelectContent></Select>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-4 text-left">Usuário</th><th className="p-4 text-left">Nível</th><th className="p-4 text-left">Pontos</th><th className="p-4 text-left">Papel</th><th className="p-4 text-left">Estado</th><th className="p-4 text-right">Ação</th></tr></thead>
              <tbody>
                {filtered.map(r => <tr key={r.id} className="border-t transition-colors hover:bg-muted/30">
                  <td className="p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{(r.full_name ?? "?").slice(0,1).toUpperCase()}</div><div><p className="font-medium">{r.full_name ?? "Sem nome"}</p><p className="text-xs text-muted-foreground">{r.id.slice(0, 8)}…</p></div></div></td>
                  <td className="p-4 font-medium">{r.current_level}</td><td className="p-4">{r.points}</td>
                  <td className="p-4"><Select value={r.role} onValueChange={v => setRole(r.id, v as Role)}><SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger><SelectContent>{(["student","teacher","admin"] as Role[]).map(role => <SelectItem key={role} value={role}>{roleLabel[role]}</SelectItem>)}</SelectContent></Select></td>
                  <td className="p-4">{r.is_approved ? <Badge className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Aprovado</Badge> : <Badge variant="outline" className="gap-1 text-amber-700 dark:text-amber-300"><XCircle className="h-3.5 w-3.5" /> Pendente</Badge>}</td>
                  <td className="p-4 text-right"><Button size="sm" variant={r.is_approved ? "outline" : "default"} onClick={() => toggleApprove(r.id, r.is_approved)}>{r.is_approved ? "Suspender" : "Aprovar"}</Button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">Nenhum usuário encontrado com estes filtros.</div>}
        </Card>
      </div>
    </AppLayout>
  );
}
