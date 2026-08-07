import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Pencil, UserPlus, Users, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

type ClassRow = {
  id: string;
  name: string;
  description: string | null;
  level_code: string | null;
  teacher_id: string | null;
  is_active: boolean;
  join_code: string;
};

export default function TeacherClasses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [form, setForm] = useState({ name: "", description: "", level_code: "A1" });

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    const [{ data: cls }, { data: roles }, { data: enr }] = await Promise.all([
      supabase.from("classes").select("*").order("created_at"),
      supabase.from("user_roles").select("user_id, role").eq("role", "student"),
      supabase.from("class_students").select("id, class_id, student_id"),
    ]);
    const studentIds = (roles ?? []).map((r: any) => r.user_id);
    let profs: any[] = [];
    if (studentIds.length) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, current_level, points")
        .in("id", studentIds);
      profs = data ?? [];
    }
    setClasses((cls ?? []) as ClassRow[]);
    setStudents(profs.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "")));
    setEnrollments(enr ?? []);
    setSelectedId((prev) => prev || (cls?.[0]?.id ?? ""));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selected = classes.find((c) => c.id === selectedId) ?? null;
  const enrolledIds = useMemo(
    () => new Set(enrollments.filter((e) => e.class_id === selectedId).map((e) => e.student_id)),
    [enrollments, selectedId]
  );
  const enrolled = students.filter((s) => enrolledIds.has(s.id));
  const available = students.filter(
    (s) => !enrolledIds.has(s.id) && (s.full_name ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const countFor = (id: string) => enrollments.filter((e) => e.class_id === id).length;

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", level_code: "A1" });
    setOpen(true);
  };
  const openEdit = (c: ClassRow) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description ?? "", level_code: c.level_code ?? "A1" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast({ title: "Informe o nome da turma", variant: "destructive" });
    const payload: any = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      level_code: form.level_code,
    };
    const { error } = editing
      ? await supabase.from("classes").update(payload).eq("id", editing.id)
      : await supabase.from("classes").insert({ ...payload, teacher_id: user?.id });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: editing ? "Turma atualizada" : "Turma criada" });
    setOpen(false);
    load();
  };

  const removeClass = async (c: ClassRow) => {
    if (!confirm(`Remover a turma "${c.name}"? As matrículas também serão removidas.`)) return;
    await supabase.from("class_students").delete().eq("class_id", c.id);
    const { error } = await supabase.from("classes").delete().eq("id", c.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    if (selectedId === c.id) setSelectedId("");
    toast({ title: "Turma removida" });
    load();
  };

  const addStudent = async (studentId: string) => {
    const { error } = await supabase
      .from("class_students")
      .insert({ class_id: selectedId, student_id: studentId });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Aluno adicionado à turma" });
    load();
  };

  const removeStudent = async (studentId: string) => {
    const { error } = await supabase
      .from("class_students")
      .delete()
      .eq("class_id", selectedId)
      .eq("student_id", studentId);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Aluno removido da turma" });
    load();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-display font-bold">Turmas</h1>
            <p className="text-muted-foreground text-sm">Crie turmas e matricule seus alunos.</p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Nova turma
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3">
            {classes.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma turma criada ainda.</p>
            )}
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${
                  selectedId === c.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.level_code ?? "—"} · {countFor(c.id)} aluno(s)
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); removeClass(c); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {c.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.description}</p>
                )}
              </button>
            ))}
          </div>

          <div className="lg:col-span-2 rounded-xl border border-border p-5">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Selecione ou crie uma turma para gerenciar alunos.</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold">{selected.name}</h2>
                    <span className="text-xs text-muted-foreground">({enrolled.length} matriculados)</span>
                  </div>
                  <Button size="sm" onClick={() => { setSearch(""); setEnrollOpen(true); }}>
                    <UserPlus className="h-4 w-4 mr-2" /> Adicionar aluno
                  </Button>
                </div>

                {enrolled.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum aluno matriculado nesta turma.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {enrolled.map((s) => (
                      <div key={s.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium">{s.full_name ?? "Aluno"}</p>
                          <p className="text-xs text-muted-foreground">
                            Nível {s.current_level ?? "—"} · {s.points ?? 0} pts
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeStudent(s.id)}>
                          <X className="h-4 w-4 mr-1" /> Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar turma" : "Nova turma"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Turma Manhã A1" />
            </div>
            <div className="space-y-2">
              <Label>Nível</Label>
              <Select value={form.level_code} onValueChange={(v) => setForm({ ...form, level_code: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <Button className="w-full" onClick={save}>{editing ? "Salvar" : "Criar turma"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar alunos</DialogTitle>
          </DialogHeader>
          <Input placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-72 overflow-y-auto divide-y divide-border">
            {available.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">Nenhum aluno disponível.</p>
            )}
            {available.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{s.full_name ?? "Aluno"}</p>
                  <p className="text-xs text-muted-foreground">Nível {s.current_level ?? "—"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => addStudent(s.id)}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
