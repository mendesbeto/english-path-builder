import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Pencil, ListChecks, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import ExerciseEditor from "@/components/ExerciseEditor";

const TYPES = ["text","video","audio","quiz","speaking","writing","assessment"] as const;

export default function TeacherLessons() {
  const { user } = useAuth();
  const [levels, setLevels] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selLevel, setSelLevel] = useState<string>("");
  const [selModule, setSelModule] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [exLesson, setExLesson] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", type: "text", content: "", media_url: "", duration_minutes: 10 });
  const { toast } = useToast();

  const load = async () => {
    const [{ data: lv }, { data: mods }, { data: less }] = await Promise.all([
      supabase.from("levels").select("*").order("order_num"),
      supabase.from("modules").select("*").order("order_num"),
      supabase.from("lessons").select("*").order("order_num"),
    ]);
    setLevels(lv ?? []); setModules(mods ?? []); setLessons(less ?? []);
    if (!selLevel && lv?.length) setSelLevel(lv[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const currentModules = modules.filter(m => m.level_id === selLevel);
  useEffect(() => {
    if (currentModules.length && !currentModules.find(m => m.id === selModule)) setSelModule(currentModules[0].id);
  }, [selLevel, modules]);

  const currentLessons = lessons.filter(l => l.module_id === selModule);

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", description: "", type: "text", content: "", media_url: "", duration_minutes: 10 });
    setOpen(true);
  };

  const openEdit = (l: any) => {
    setEditing(l);
    setForm({ title: l.title, description: l.description ?? "", type: l.type, content: l.content ?? "", media_url: l.media_url ?? "", duration_minutes: l.duration_minutes ?? 10 });
    setOpen(true);
  };

  const save = async () => {
    if (!selModule) return toast({ title: "Selecione um módulo", variant: "destructive" });
    const payload: any = { ...form, module_id: selModule, created_by: user?.id };
    const { error } = editing
      ? await supabase.from("lessons").update(payload).eq("id", editing.id)
      : await supabase.from("lessons").insert({ ...payload, order_num: currentLessons.length });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: editing ? "Aula atualizada" : "Aula criada" });
    setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm("Excluir aula?")) return;
    await supabase.from("lessons").delete().eq("id", id);
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const list = [...currentLessons];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[index], b = list[target];
    await Promise.all([
      supabase.from("lessons").update({ order_num: target }).eq("id", a.id),
      supabase.from("lessons").update({ order_num: index }).eq("id", b.id),
    ]);
    load();
  };


  if (loading) return <AppLayout><div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <h1 className="text-3xl font-display font-bold mb-2">Aulas & Conteúdo</h1>
        <p className="text-muted-foreground mb-6">Crie e edite aulas por módulo.</p>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label>Nível</Label>
            <Select value={selLevel} onValueChange={setSelLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {levels.map(lv => <SelectItem key={lv.id} value={lv.id}>{lv.code} — {lv.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Módulo</Label>
            <Select value={selModule} onValueChange={setSelModule}>
              <SelectTrigger><SelectValue placeholder="Selecione um módulo" /></SelectTrigger>
              <SelectContent>
                {currentModules.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-display font-bold">Aulas</h2>
          <Button onClick={openNew} disabled={!selModule}><Plus className="w-4 h-4 mr-1" /> Nova aula</Button>
        </div>

        {!selModule && <p className="text-sm text-muted-foreground">Crie um módulo primeiro (Admin → Níveis & Módulos).</p>}

        <div className="space-y-2">
          {currentLessons.map((l, i) => (
            <div key={l.id} className="p-4 rounded-xl border border-border bg-card flex items-center gap-2">
              <div className="flex flex-col">
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === currentLessons.length - 1} onClick={() => move(i, 1)}><ArrowDown className="w-3.5 h-3.5" /></Button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{l.title}</div>
                <p className="text-xs text-muted-foreground">{l.type} · {l.duration_minutes} min</p>
              </div>
              <Button variant="ghost" size="icon" title="Exercícios" onClick={() => setExLesson(l)}><ListChecks className="w-4 h-4" /></Button>
              <Link to={`/lesson/${l.id}`}><Button variant="ghost" size="icon" title="Pré-visualizar"><Eye className="w-4 h-4" /></Button></Link>
              <Button variant="ghost" size="icon" onClick={() => openEdit(l)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => del(l.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
        </div>

        <Dialog open={!!exLesson} onOpenChange={o => !o && setExLesson(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Exercícios</DialogTitle></DialogHeader>
            {exLesson && <ExerciseEditor lessonId={exLesson.id} lessonTitle={exLesson.title} />}
          </DialogContent>
        </Dialog>


        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} aula</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duração (min)</Label>
                  <Input type="number" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: Number(e.target.value)})} />
                </div>
              </div>
              <div><Label>URL da mídia (vídeo/áudio)</Label><Input value={form.media_url} onChange={e => setForm({...form, media_url: e.target.value})} placeholder="https://..." /></div>
              <div><Label>Conteúdo (texto/enunciado)</Label><Textarea rows={5} value={form.content} onChange={e => setForm({...form, content: e.target.value})} /></div>
              <Button onClick={save} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
