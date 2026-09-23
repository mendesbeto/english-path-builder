import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Pencil, ListChecks, ArrowUp, ArrowDown, Eye, Sparkles, BookOpen, CheckCircle2, FilePenLine, Search, Filter, Clock3, Video, Volume2, Mic2, PenLine, ClipboardCheck } from "lucide-react";
import { LESSON_TEMPLATES, type LessonTemplate } from "@/lib/lessonTemplates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import ExerciseEditor from "@/components/ExerciseEditor";
import StudentLessonPreview from "@/components/StudentLessonPreview";

const TYPES = ["text","video","audio","quiz","speaking","writing","assessment"] as const;
const typeMeta: Record<string, { label: string; icon: typeof BookOpen }> = {
  text: { label: "Texto", icon: BookOpen }, video: { label: "Vídeo", icon: Video }, audio: { label: "Áudio", icon: Volume2 },
  quiz: { label: "Quiz", icon: ClipboardCheck }, speaking: { label: "Speaking", icon: Mic2 }, writing: { label: "Writing", icon: PenLine }, assessment: { label: "Avaliação", icon: CheckCircle2 },
};


export default function TeacherLessons() {
  const { user } = useAuth();
  const [levels, setLevels] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selLevel, setSelLevel] = useState<string>("");
  const [selModule, setSelModule] = useState<string>("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [publicationFilter, setPublicationFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [exLesson, setExLesson] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [previewExercises, setPreviewExercises] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [formPreview, setFormPreview] = useState(false);
  const [template, setTemplate] = useState<LessonTemplate | null>(null);
  const [form, setForm] = useState({ title: "", description: "", type: "text", content: "", media_url: "", duration_minutes: 10, is_published: true });
  const { toast } = useToast();

  const openPreview = async (l: any) => {
    setPreview(l);
    setPreviewLoading(true);
    const { data } = await supabase.from("exercises").select("*").eq("lesson_id", l.id).order("order_num");
    const ids = (data ?? []).map((ex: any) => ex.id);
    const { data: answers } = ids.length
      ? await supabase.from("exercise_answers").select("exercise_id,correct_answer").in("exercise_id", ids)
      : { data: [] as any[] };
    const answerMap = new Map((answers ?? []).map((a: any) => [a.exercise_id, a.correct_answer]));
    setPreviewExercises((data ?? []).map((ex: any) => ({ ...ex, correct_answer: answerMap.get(ex.id) })));
    setPreviewLoading(false);
  };


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

  const currentLessons = useMemo(() => lessons.filter(l => l.module_id === selModule), [lessons, selModule]);
  const filteredLessons = useMemo(() => {
    const q = search.trim().toLowerCase();
    return currentLessons.filter(l => (!q || String(l.title ?? "").toLowerCase().includes(q)) && (typeFilter === "all" || l.type === typeFilter) && (publicationFilter === "all" || (publicationFilter === "published" ? l.is_published : !l.is_published)));
  }, [currentLessons, search, typeFilter, publicationFilter]);
  const publishedCount = currentLessons.filter(l => l.is_published).length;
  const draftCount = currentLessons.length - publishedCount;
  const totalDuration = currentLessons.reduce((sum, l) => sum + Number(l.duration_minutes ?? 0), 0);
  const resetFilters = () => { setSearch(""); setTypeFilter("all"); setPublicationFilter("all"); };

  const openNew = () => {
    setEditing(null);
    setTemplate(null);
    setFormPreview(false);
    setForm({ title: "", description: "", type: "text", content: "", media_url: "", duration_minutes: 10, is_published: true });
    setOpen(true);
  };

  const applyTemplate = (t: LessonTemplate) => {
    setTemplate(t);
    setForm({ ...t.form, is_published: true });
  };

  const openEdit = (l: any) => {
    setEditing(l);
    setTemplate(null);
    setFormPreview(false);
    setForm({ title: l.title, description: l.description ?? "", type: l.type, content: l.content ?? "", media_url: l.media_url ?? "", duration_minutes: l.duration_minutes ?? 10, is_published: l.is_published ?? true });
    setOpen(true);
  };


  const save = async () => {
    if (!selModule) return toast({ title: "Selecione um módulo", variant: "destructive" });
    const payload: any = { ...form, module_id: selModule, created_by: user?.id };
    if (editing) {
      const { error } = await supabase.from("lessons").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      toast({ title: "Aula atualizada" });
    } else {
      const { data, error } = await supabase
        .from("lessons")
        .insert({ ...payload, order_num: currentLessons.length })
        .select("id")
        .single();
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      if (template?.exercises?.length && data?.id) {
        for (const [i, ex] of template.exercises.entries()) {
          const result = await supabase.rpc("create_exercise", {
            p_lesson_id: data.id,
            p_question: ex.question,
            p_options: ex.options,
            p_correct_answer: ex.correct_answer,
            p_points: ex.points,
            p_order_num: i,
          });
          if (result.error) {
            return toast({ title: "Aula criada, mas houve erro nos exercícios", description: result.error.message, variant: "destructive" });
          }
        }
      }
      toast({
        title: "Aula criada",
        description: template?.exercises?.length
          ? `${template.exercises.length} exercícios do template foram adicionados.`
          : undefined,
      });
    }
    setOpen(false); setTemplate(null); load();
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
      <div className="mx-auto w-full max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
        <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-1.5 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" /> Biblioteca de aprendizagem</div><h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Aulas & Conteúdo</h1><p className="mt-2 max-w-2xl text-muted-foreground">Organize aulas por nível e módulo, prepare exercícios e publique experiências prontas para os alunos.</p></div>
            <Button onClick={openNew} disabled={!selModule} size="lg"><Plus className="mr-2 h-4 w-4" /> Nova aula</Button>
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-card p-5 shadow-sm"><BookOpen className="mb-3 h-5 w-5 text-primary" /><p className="text-2xl font-bold">{currentLessons.length}</p><p className="text-sm text-muted-foreground">Aulas no módulo</p></div>
          <div className="rounded-2xl border bg-card p-5 shadow-sm"><CheckCircle2 className="mb-3 h-5 w-5 text-primary" /><p className="text-2xl font-bold">{publishedCount}</p><p className="text-sm text-muted-foreground">Publicadas</p></div>
          <div className="rounded-2xl border bg-card p-5 shadow-sm"><FilePenLine className="mb-3 h-5 w-5 text-secondary" /><p className="text-2xl font-bold">{draftCount}</p><p className="text-sm text-muted-foreground">Rascunhos</p></div>
          <div className="rounded-2xl border bg-card p-5 shadow-sm"><Clock3 className="mb-3 h-5 w-5 text-accent" /><p className="text-2xl font-bold">{totalDuration} min</p><p className="text-sm text-muted-foreground">Carga estimada</p></div>
        </section>
        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Nível</Label><Select value={selLevel} onValueChange={setSelLevel}><SelectTrigger className="mt-2 h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{levels.map(lv=><SelectItem key={lv.id} value={lv.id}>{lv.code} — {lv.title}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Módulo</Label><Select value={selModule} onValueChange={setSelModule} disabled={!currentModules.length}><SelectTrigger className="mt-2 h-11 rounded-xl"><SelectValue placeholder="Selecione um módulo" /></SelectTrigger><SelectContent>{currentModules.map(m=><SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}</SelectContent></Select></div>
          </div>
          {!currentModules.length&&<div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Crie um módulo primeiro em <Link className="font-medium text-primary hover:underline" to="/admin/levels">Níveis & Módulos</Link>.</div>}
        </section>
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="font-display text-lg font-semibold">Aulas do módulo</h2><p className="mt-1 text-sm text-muted-foreground">{selModule ? `${filteredLessons.length} resultado(s) neste módulo` : "Selecione um módulo para começar."}</p></div><span className="flex items-center gap-2 text-xs text-muted-foreground"><Filter className="h-3.5 w-3.5"/> Filtros</span></div>
            <div className="mt-5 grid gap-2 md:grid-cols-[1fr_180px_180px_auto]">
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar aula..." className="h-10 rounded-xl pl-9"/></div>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="h-10 rounded-xl"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem>{TYPES.map(t=><SelectItem key={t} value={t}>{typeMeta[t].label}</SelectItem>)}</SelectContent></Select>
              <Select value={publicationFilter} onValueChange={setPublicationFilter}><SelectTrigger className="h-10 rounded-xl"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os estados</SelectItem><SelectItem value="published">Publicadas</SelectItem><SelectItem value="draft">Rascunhos</SelectItem></SelectContent></Select>
              <Button variant="outline" onClick={resetFilters} disabled={!search&&typeFilter==="all"&&publicationFilter==="all"}>Limpar</Button>
            </div>
          </div>
          <div className="divide-y">
            {filteredLessons.map(l=>{const meta=typeMeta[l.type]??typeMeta.text;const TypeIcon=meta.icon;const i=currentLessons.findIndex(x=>x.id===l.id);return <article key={l.id} className="group flex flex-col gap-4 p-5 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center">
              <div className="flex shrink-0 flex-col items-center"><Button variant="ghost" size="icon" className="h-7 w-7" disabled={i===0} onClick={()=>move(i,-1)}><ArrowUp className="h-3.5 w-3.5"/></Button><span className="text-xs font-semibold text-muted-foreground">{i+1}</span><Button variant="ghost" size="icon" className="h-7 w-7" disabled={i===currentLessons.length-1} onClick={()=>move(i,1)}><ArrowDown className="h-3.5 w-3.5"/></Button></div>
              <div className="flex min-w-0 flex-1 items-start gap-3"><div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex"><TypeIcon className="h-5 w-5"/></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{l.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${l.is_published?"bg-primary/10 text-primary":"bg-muted text-muted-foreground"}`}>{l.is_published?"Publicada":"Rascunho"}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{meta.label}</span></div><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{l.description||"Sem descrição adicionada."}</p><div className="mt-2 flex gap-3 text-xs text-muted-foreground"><span>{l.duration_minutes??0} min</span><span>•</span><span>Posição {i+1}</span></div></div></div>
              <div className="flex flex-wrap items-center gap-1 sm:justify-end"><Button variant="ghost" size="icon" title="Exercícios" onClick={()=>setExLesson(l)}><ListChecks className="h-4 w-4"/></Button><Button variant="ghost" size="icon" title="Pré-visualizar" onClick={()=>openPreview(l)}><Eye className="h-4 w-4"/></Button><Button variant="ghost" size="icon" title="Editar" onClick={()=>openEdit(l)}><Pencil className="h-4 w-4"/></Button><Button variant="ghost" size="icon" title={l.is_published?"Despublicar":"Publicar"} onClick={async()=>{const next=!l.is_published;const{error}=await supabase.from("lessons").update({is_published:next}).eq("id",l.id);if(error)return toast({title:"Erro",description:error.message,variant:"destructive"});toast({title:next?"Aula publicada":"Aula despublicada"});load();}}>{l.is_published?<FilePenLine className="h-4 w-4"/>:<CheckCircle2 className="h-4 w-4 text-primary"/>}</Button><Button variant="ghost" size="icon" title="Excluir" onClick={()=>del(l.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div>
            </article>})}
            {!filteredLessons.length&&<div className="p-10 text-center"><BookOpen className="mx-auto h-8 w-8 text-muted-foreground"/><h3 className="mt-3 font-semibold">{currentLessons.length?"Nenhuma aula encontrada":"Nenhuma aula neste módulo"}</h3><p className="mt-1 text-sm text-muted-foreground">{currentLessons.length?"Altere os filtros ou crie uma nova aula.":"Comece criando a primeira aula deste módulo."}</p>{selModule&&<Button className="mt-4" onClick={openNew}><Plus className="mr-2 h-4 w-4"/> Criar primeira aula</Button>}</div>}
          </div>
        </section>

        <Dialog open={!!exLesson} onOpenChange={o => !o && setExLesson(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Exercícios</DialogTitle></DialogHeader>
            {exLesson && <ExerciseEditor lessonId={exLesson.id} lessonTitle={exLesson.title} />}
          </DialogContent>
        </Dialog>

        {/* Pré-visualização como aluno */}
        <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
          <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pré-visualização — visão do aluno</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground -mt-2 mb-2">
              Conteúdo exatamente como o aluno verá. Nada é salvo nem contabilizado.
            </p>
            {previewLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
            ) : preview ? (
              <>
                <StudentLessonPreview key={preview.id} lesson={preview} exercises={previewExercises} />
                <div className="flex items-center justify-between gap-3 border-t border-border pt-4 mt-6">
                  <span className="text-sm text-muted-foreground">
                    {preview.is_published ? "Publicada para os alunos" : "Rascunho — não visível aos alunos"}
                  </span>
                  <Button
                    variant={preview.is_published ? "outline" : "default"}
                    onClick={async () => {
                      const next = !preview.is_published;
                      const { error } = await supabase.from("lessons").update({ is_published: next }).eq("id", preview.id);
                      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
                      setPreview({ ...preview, is_published: next });
                      toast({ title: next ? "Aula publicada" : "Aula despublicada" });
                      load();
                    }}
                  >
                    {preview.is_published ? "Despublicar" : "Publicar aula"}
                  </Button>
                </div>
                <Link to={`/lesson/${preview.id}`} className="text-xs text-muted-foreground hover:text-foreground">
                  Abrir a página real da aula
                </Link>
              </>
            ) : null}
          </DialogContent>
        </Dialog>



        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className={`${formPreview ? "max-w-3xl" : "max-w-lg"} max-h-[85vh] overflow-y-auto`}>
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} aula</DialogTitle></DialogHeader>

            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <Switch
                  id="publish"
                  checked={form.is_published}
                  onCheckedChange={v => setForm({ ...form, is_published: v })}
                />
                <Label htmlFor="publish" className="cursor-pointer">
                  {form.is_published ? "Publicada" : "Rascunho"}
                </Label>
              </div>
              <Button
                type="button"
                variant={formPreview ? "default" : "outline"}
                size="sm"
                onClick={async () => {
                  const next = !formPreview;
                  setFormPreview(next);
                  if (next) {
                    if (editing) {
                      const { data } = await supabase.from("exercises").select("*").eq("lesson_id", editing.id).order("order_num");
                      setPreviewExercises(data ?? []);
                    } else {
                      setPreviewExercises(template?.exercises ?? []);
                    }
                  }
                }}
              >
                <Eye className="w-4 h-4 mr-1" /> {formPreview ? "Voltar à edição" : "Ver como aluno"}
              </Button>
            </div>

            {formPreview ? (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Pré-visualização da aula {editing ? "com os dados salvos dos exercícios" : "com os exercícios do template"}. Nada é salvo aqui.
                </p>
                <StudentLessonPreview lesson={form} exercises={previewExercises} />
                <Button onClick={save} className="w-full">
                  {form.is_published ? "Salvar e publicar" : "Salvar como rascunho"}
                </Button>
              </div>
            ) : (
            <div className="space-y-3">

              {!editing && (
                <div className="p-3 rounded-xl border border-dashed border-border space-y-2">
                  <Label className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Começar com um template</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {LESSON_TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className={`text-left p-2 rounded-lg border transition-colors ${template?.id === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                      >
                        <span className="text-sm font-medium">{t.emoji} {t.label}</span>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </button>
                    ))}
                  </div>
                  {template?.exercises?.length ? (
                    <p className="text-xs text-muted-foreground">
                      Inclui {template.exercises.length} exercícios prontos, criados junto com a aula.
                    </p>
                  ) : null}
                </div>
              )}
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
            )}
          </DialogContent>

        </Dialog>
      </div>
    </AppLayout>
  );
}
