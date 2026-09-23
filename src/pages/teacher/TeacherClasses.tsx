import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Pencil, UserPlus, Users, X, Copy, RefreshCw, Ticket } from "lucide-react";
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
  join_code_expires_at: string | null;
  join_code_max_uses: number | null;
  join_code_uses: number;
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
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeForm, setCodeForm] = useState({ validDays: "", maxUses: "" });

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

  const codeStatus = (c: ClassRow) => {
    const expired = c.join_code_expires_at ? new Date(c.join_code_expires_at) < new Date() : false;
    const exhausted = c.join_code_max_uses != null && c.join_code_uses >= c.join_code_max_uses;
    return { expired, exhausted, valid: !expired && !exhausted };
  };

  const copyInvite = async (c: ClassRow) => {
    const { expired, exhausted } = codeStatus(c);
    if (expired || exhausted) {
      return toast({
        title: expired ? "Código expirado" : "Limite de usos atingido",
        description: "Gere um novo código antes de compartilhar.",
        variant: "destructive",
      });
    }
    const text = `Entre na turma "${c.name}" no Inglês Hope usando o código: ${c.join_code}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Convite copiado" });
    } catch {
      toast({ title: "Código", description: c.join_code });
    }
  };

  const regenerate = async () => {
    if (!selected) return;
    const validDays = codeForm.validDays.trim() ? Number(codeForm.validDays) : null;
    const maxUses = codeForm.maxUses.trim() ? Number(codeForm.maxUses) : null;
    if ((validDays !== null && (!Number.isFinite(validDays) || validDays <= 0)) ||
        (maxUses !== null && (!Number.isFinite(maxUses) || maxUses <= 0))) {
      return toast({ title: "Valores inválidos", description: "Use números maiores que zero.", variant: "destructive" });
    }
    const { data, error } = await supabase.rpc("regenerate_class_join_code", {
      _class_id: selected.id,
      _valid_days: validDays,
      _max_uses: maxUses,
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Novo código gerado", description: String(data) });
    setCodeOpen(false);
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
      <div className="mx-auto w-full max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
        <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-1.5 text-xs font-semibold text-primary"><Users className="h-3.5 w-3.5" /> Gestão de turmas</div>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Turmas</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">Crie turmas, organize alunos e compartilhe códigos de convite de forma simples.</p>
            </div>
            <Button onClick={openNew} size="lg"><Plus className="mr-2 h-4 w-4" /> Nova turma</Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card p-5 shadow-sm"><Users className="mb-3 h-5 w-5 text-primary"/><p className="text-2xl font-bold">{classes.length}</p><p className="text-sm text-muted-foreground">Turmas criadas</p></div>
          <div className="rounded-2xl border bg-card p-5 shadow-sm"><UserPlus className="mb-3 h-5 w-5 text-accent"/><p className="text-2xl font-bold">{enrollments.length}</p><p className="text-sm text-muted-foreground">Matrículas</p></div>
          <div className="rounded-2xl border bg-card p-5 shadow-sm"><Ticket className="mb-3 h-5 w-5 text-secondary"/><p className="text-2xl font-bold">{classes.filter(c=>codeStatus(c).valid).length}</p><p className="text-sm text-muted-foreground">Convites ativos</p></div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <section className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="font-display font-semibold">Minhas turmas</h2><p className="text-xs text-muted-foreground">{classes.length} turma(s)</p></div><Button size="icon" variant="ghost" onClick={openNew}><Plus className="h-4 w-4"/></Button></div>
            <div className="space-y-2">
              {classes.map(c=><button key={c.id} onClick={()=>setSelectedId(c.id)} className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedId===c.id?"border-primary bg-primary/5":"hover:bg-muted/50"}`}>
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-semibold">{c.name}</p><p className="mt-1 text-xs text-muted-foreground">{c.level_code??"—"} · {countFor(c.id)} aluno(s)</p></div><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.is_active?"bg-primary/10 text-primary":"bg-muted text-muted-foreground"}`}>{c.is_active?"Ativa":"Inativa"}</span></div>
                {c.description&&<p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>}
                <div className="mt-3 flex gap-1"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={e=>{e.stopPropagation();openEdit(c)}}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" className="h-7 w-7" onClick={e=>{e.stopPropagation();removeClass(c)}}><Trash2 className="h-3.5 w-3.5 text-destructive"/></Button></div>
              </button>)}
              {!classes.length&&<div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma turma criada ainda.</div>}
            </div>
          </section>

          <section className="rounded-2xl border bg-card shadow-sm">
            {!selected ? <div className="flex min-h-[360px] items-center justify-center p-8 text-center"><div><Users className="mx-auto h-9 w-9 text-muted-foreground"/><h2 className="mt-3 font-semibold">Selecione uma turma</h2><p className="mt-1 text-sm text-muted-foreground">Escolha uma turma à esquerda ou crie uma nova.</p></div></div> : <>
              <div className="border-b p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><h2 className="font-display text-xl font-semibold">{selected.name}</h2><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{selected.level_code}</span></div><p className="mt-1 text-sm text-muted-foreground">{selected.description||"Sem descrição."}</p></div><Button onClick={()=>{setSearch("");setEnrollOpen(true)}}><UserPlus className="mr-2 h-4 w-4"/> Adicionar aluno</Button></div></div>
              <div className="border-b p-5 sm:p-6"><div className="flex flex-col gap-4 rounded-2xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Ticket className="h-5 w-5"/></div><div><p className="text-xs font-medium text-muted-foreground">Código de convite</p><p className="font-mono text-xl font-bold tracking-[0.25em]">{selected.join_code}</p><p className="mt-1 text-xs text-muted-foreground">{selected.join_code_expires_at?`Expira em ${new Date(selected.join_code_expires_at).toLocaleString("pt-PT")}`:"Sem expiração"} · {selected.join_code_max_uses!=null?`${selected.join_code_uses}/${selected.join_code_max_uses} usos`:`${selected.join_code_uses} usos (ilimitado)`}</p></div></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>copyInvite(selected)}><Copy className="mr-2 h-4 w-4"/> Copiar convite</Button><Button size="sm" variant="ghost" onClick={()=>{setCodeForm({validDays:"",maxUses:""});setCodeOpen(true)}}><RefreshCw className="mr-2 h-4 w-4"/> Novo código</Button></div></div></div>
              <div className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-display font-semibold">Alunos matriculados</h3><p className="text-xs text-muted-foreground">{enrolled.length} aluno(s)</p></div></div>
                {enrolled.length===0?<div className="rounded-xl border border-dashed p-8 text-center"><UserPlus className="mx-auto h-7 w-7 text-muted-foreground"/><p className="mt-2 text-sm font-medium">Nenhum aluno matriculado</p><p className="mt-1 text-xs text-muted-foreground">Adicione alunos manualmente ou compartilhe o código de convite.</p></div>:<div className="divide-y">{enrolled.map(s=><div key={s.id} className="flex items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="truncate text-sm font-medium">{s.full_name??"Aluno"}</p><p className="text-xs text-muted-foreground">Nível {s.current_level??"—"} · {s.points??0} pts</p></div><Button size="sm" variant="ghost" onClick={()=>removeStudent(s.id)}><X className="mr-1 h-4 w-4"/> Remover</Button></div>)}</div>}
              </div>
            </>}
          </section>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editing?"Editar turma":"Nova turma"}</DialogTitle></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Turma Manhã A1"/></div><div className="space-y-2"><Label>Nível</Label><Select value={form.level_code} onValueChange={v=>setForm({...form,level_code:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{LEVELS.map(l=><SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div><Button className="w-full" onClick={save}>{editing?"Salvar":"Criar turma"}</Button></div></DialogContent>
      </Dialog>
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}><DialogContent><DialogHeader><DialogTitle>Adicionar alunos</DialogTitle></DialogHeader><Input placeholder="Buscar aluno..." value={search} onChange={e=>setSearch(e.target.value)}/><div className="max-h-72 overflow-y-auto divide-y">{available.length===0&&<p className="py-4 text-sm text-muted-foreground">Nenhum aluno disponível.</p>}{available.map(s=><div key={s.id} className="flex items-center justify-between py-3"><div><p className="text-sm font-medium">{s.full_name??"Aluno"}</p><p className="text-xs text-muted-foreground">Nível {s.current_level??"—"}</p></div><Button size="sm" variant="outline" onClick={()=>addStudent(s.id)}><Plus className="mr-1 h-4 w-4"/> Adicionar</Button></div>)}</div></DialogContent></Dialog>
      <Dialog open={codeOpen} onOpenChange={setCodeOpen}><DialogContent><DialogHeader><DialogTitle>Gerar novo código de convite</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">O código anterior deixará de funcionar. Deixe em branco para não definir expiração ou limite.</p><div className="space-y-4"><div className="space-y-2"><Label>Validade (dias)</Label><Input type="number" min={1} value={codeForm.validDays} placeholder="Ex: 7" onChange={e=>setCodeForm({...codeForm,validDays:e.target.value})}/></div><div className="space-y-2"><Label>Limite de usos</Label><Input type="number" min={1} value={codeForm.maxUses} placeholder="Ex: 30" onChange={e=>setCodeForm({...codeForm,maxUses:e.target.value})}/></div><Button className="w-full" onClick={regenerate}>Gerar código</Button></div></DialogContent></Dialog>

    </AppLayout>
  );
}
