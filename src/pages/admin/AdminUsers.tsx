import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function AdminUsers() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);
    const merged = (profiles ?? []).map(p => ({
      ...p,
      role: roles?.find(r => r.user_id === p.id)?.role ?? "student",
    }));
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setRole = async (userId: string, newRole: "admin" | "teacher" | "student") => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Papel atualizado" });
    load();
  };

  const toggleApprove = async (userId: string, approved: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_approved: !approved }).eq("id", userId);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  };

  if (loading) return <AppLayout><div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <h1 className="text-3xl font-display font-bold mb-2">Usuários</h1>
        <p className="text-muted-foreground mb-6">Gerencie papéis e aprove professores.</p>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 text-sm">
              <tr>
                <th className="text-left p-3">Nome</th>
                <th className="text-left p-3">Nível</th>
                <th className="text-left p-3">Pontos</th>
                <th className="text-left p-3">Papel</th>
                <th className="text-left p-3">Aprovado</th>
                <th className="text-right p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{r.full_name ?? "—"}</td>
                  <td className="p-3">{r.current_level}</td>
                  <td className="p-3">{r.points}</td>
                  <td className="p-3">
                    <Select value={r.role} onValueChange={v => setRole(r.id, v as any)}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Aluno</SelectItem>
                        <SelectItem value="teacher">Professor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    {r.is_approved
                      ? <CheckCircle2 className="w-5 h-5 text-primary" />
                      : <XCircle className="w-5 h-5 text-muted-foreground" />}
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => toggleApprove(r.id, r.is_approved)}>
                      {r.is_approved ? "Suspender" : "Aprovar"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
