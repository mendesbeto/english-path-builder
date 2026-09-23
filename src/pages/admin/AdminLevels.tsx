import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Pencil, BookOpen, Layers3, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminLevels() {
  const [levels, setLevels] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modOpen, setModOpen] = useState(false);
  const [editingMod, setEditingMod] = useState<any>(null);
  const [modTitle, setModTitle] = useState("");
  const [modDesc, setModDesc] = useState("");
  const [editingLevel, setEditingLevel] = useState<any>(null);
  const [lvlTitle, setLvlTitle] = useState("");
  const [lvlDesc, setLvlDesc] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [{ data: lv, error: levelError }, { data: mods, error: moduleError }] = await Promise.all([
      supabase.from("levels").select("*").order("order_num"),
      supabase.from("modules").select("*").order("order_num"),
    ]);
    if (levelError || moduleError) {
      toast({ title: "Erro ao carregar conteúdo", description: (levelError || moduleError)?.message, variant: "destructive" });
    }
    setLevels(lv ?? []); setModules(mods ?? []);
    if (!selectedLevel && lv?.length) setSelectedLevel(lv[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveLevel = async () => {
    if (!editingLevel || !lvlTitle.trim()) return;
    const { error } = await supabase.from("levels").update({ title: lvlTitle.trim(), description: lvlDesc.trim() }).eq("id", editingLevel.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Nível atualizado" }); setEditingLevel(null); load();
  };

  const saveModule = async () => {
    if (!selectedLevel || !modTitle.trim()) return;
    const payload = { level_id: selectedLevel, title: modTitle.trim(), description: modDesc.trim(), order_num: modules.filter(m => m.level_id === selectedLevel).length };
    const { error } = editingMod
      ? await supabase.from("modules").update({ title: modTitle.trim(), description: modDesc.trim() }).eq("id", editingMod.id)
      : await supabase.from("modules").insert(payload);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: editingMod ? "Módulo atualizado" : "Módulo criado" });
    setModOpen(false); setEditingMod(null); setModTitle(""); setModDesc(""); load();
  };

  const deleteModule = async (id: string) => {
    if (!confirm("Excluir módulo e todas as aulas?")) return;
    const { error } = await supabase.from("modules").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Módulo excluído" }); load();
  };

  const currentModules = useMemo(() => modules.filter(m => m.level_id === selectedLevel), [modules, selectedLevel]);
  const selected = levels.find(l => l.id === selectedLevel);

  if (loading) return <AppLayout><div className="mx-auto max-w-7xl p-8"><div className="flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Carregando conteúdo…</div></div></AppLayout>;

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><Badge variant="secondary" className="mb-2">Administração · Conteúdo</Badge><h1 className="text-3xl font-bold tracking-tight">Níveis & módulos</h1><p className="mt-1 text-muted-foreground">Organize o percurso CEFR e a estrutura das aulas.</p></div>
          <Button variant="outline" onClick={load} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Atualizar</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {levels.map(lv => <button key={lv.id} onClick={() => setSelectedLevel(lv.id)} className={`group rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${selectedLevel === lv.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "bg-card"}`}>
            <div className="flex items-start justify-between gap-3"><div><Badge className="mb-3">{lv.code}</Badge><p className="font-semibold">{lv.title}</p><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{lv.description || "Sem descrição."}</p></div><div className="rounded-xl bg-muted p-2"><BookOpen className="h-4 w-4 text-primary" /></div></div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Layers3 className="h-3.5 w-3.5" /> {modules.filter(m => m.level_id === lv.id).length} módulos</div>
          </button>)}
        </div>

        <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle>Resumo do nível</CardTitle></CardHeader>
            <CardContent>
              {selected ? <><Badge>{selected.code}</Badge><h2 className="mt-3 text-2xl font-bold">{selected.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{selected.description || "Sem descrição."}</p><Button variant="outline" className="mt-5 w-full" onClick={() => { setEditingLevel(selected); setLvlTitle(selected.title); setLvlDesc(selected.description ?? ""); }}><Pencil className="mr-2 h-4 w-4" /> Editar nível</Button></> : <p className="text-sm text-muted-foreground">Selecione um nível.</p>}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Módulos</CardTitle><p className="mt-1 text-sm text-muted-foreground">{currentModules.length} módulo(s) neste nível.</p></div>
              <Dialog open={modOpen} onOpenChange={setModOpen}><DialogTrigger asChild><Button onClick={() => { setEditingMod(null); setModTitle(""); setModDesc(""); }} disabled={!selectedLevel}><Plus className="mr-2 h-4 w-4" /> Novo módulo</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>{editingMod ? "Editar módulo" : "Novo módulo"}</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Título</Label><Input value={modTitle} onChange={e => setModTitle(e.target.value)} /></div><div><Label>Descrição</Label><Textarea value={modDesc} onChange={e => setModDesc(e.target.value)} /></div><Button onClick={saveModule} className="w-full">Salvar módulo</Button></div></DialogContent>
              </Dialog>
            </div></CardHeader>
            <CardContent className="space-y-3">
              {currentModules.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center"><Sparkles className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Nenhum módulo neste nível.</p></div>}
              {currentModules.map(m => <div key={m.id} className="flex items-start gap-3 rounded-2xl border p-4 transition-colors hover:bg-muted/30"><div className="rounded-xl bg-primary/10 p-2"><Layers3 className="h-4 w-4 text-primary" /></div><div className="min-w-0 flex-1"><p className="font-medium">{m.title}</p><p className="mt-1 text-sm text-muted-foreground">{m.description || "Sem descrição."}</p></div><Button variant="ghost" size="icon" onClick={() => { setEditingMod(m); setModTitle(m.title); setModDesc(m.description ?? ""); setModOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => deleteModule(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!editingLevel} onOpenChange={() => setEditingLevel(null)}><DialogContent><DialogHeader><DialogTitle>Editar nível {editingLevel?.code}</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Título</Label><Input value={lvlTitle} onChange={e => setLvlTitle(e.target.value)} /></div><div><Label>Descrição</Label><Textarea value={lvlDesc} onChange={e => setLvlDesc(e.target.value)} /></div><Button onClick={saveLevel} className="w-full">Salvar nível</Button></div></DialogContent></Dialog>
      </div>
    </AppLayout>
  );
}
