import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const [{ data: lv }, { data: mods }] = await Promise.all([
      supabase.from("levels").select("*").order("order_num"),
      supabase.from("modules").select("*").order("order_num"),
    ]);
    setLevels(lv ?? []);
    setModules(mods ?? []);
    if (!selectedLevel && lv?.length) setSelectedLevel(lv[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveLevel = async () => {
    if (!editingLevel) return;
    const { error } = await supabase.from("levels").update({ title: lvlTitle, description: lvlDesc }).eq("id", editingLevel.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Nível atualizado" });
    setEditingLevel(null);
    load();
  };

  const saveModule = async () => {
    if (!selectedLevel) return;
    const payload = { level_id: selectedLevel, title: modTitle, description: modDesc, order_num: modules.filter(m => m.level_id === selectedLevel).length };
    const { error } = editingMod
      ? await supabase.from("modules").update({ title: modTitle, description: modDesc }).eq("id", editingMod.id)
      : await supabase.from("modules").insert(payload);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: editingMod ? "Módulo atualizado" : "Módulo criado" });
    setModOpen(false); setEditingMod(null); setModTitle(""); setModDesc("");
    load();
  };

  const deleteModule = async (id: string) => {
    if (!confirm("Excluir módulo e todas as aulas?")) return;
    await supabase.from("modules").delete().eq("id", id);
    load();
  };

  const currentModules = modules.filter(m => m.level_id === selectedLevel);

  if (loading) return <AppLayout><div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <h1 className="text-3xl font-display font-bold mb-2">Níveis & Módulos</h1>
        <p className="text-muted-foreground mb-6">Edite os níveis CEFR e organize módulos.</p>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {levels.map(lv => (
            <div key={lv.id} className={`p-4 rounded-xl border cursor-pointer ${selectedLevel === lv.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                 onClick={() => setSelectedLevel(lv.id)}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xl font-display font-bold">{lv.code}</div>
                  <div className="font-medium">{lv.title}</div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{lv.description}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setEditingLevel(lv); setLvlTitle(lv.title); setLvlDesc(lv.description ?? ""); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-display font-bold">Módulos</h2>
          <Dialog open={modOpen} onOpenChange={setModOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingMod(null); setModTitle(""); setModDesc(""); }}>
                <Plus className="w-4 h-4 mr-1" /> Novo módulo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingMod ? "Editar" : "Novo"} módulo</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Título</Label><Input value={modTitle} onChange={e => setModTitle(e.target.value)} /></div>
                <div><Label>Descrição</Label><Textarea value={modDesc} onChange={e => setModDesc(e.target.value)} /></div>
                <Button onClick={saveModule} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {currentModules.length === 0 && <p className="text-sm text-muted-foreground">Nenhum módulo neste nível ainda.</p>}
          {currentModules.map(m => (
            <div key={m.id} className="p-4 rounded-xl border border-border bg-card flex items-center gap-3">
              <div className="flex-1">
                <div className="font-medium">{m.title}</div>
                <p className="text-sm text-muted-foreground">{m.description}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setEditingMod(m); setModTitle(m.title); setModDesc(m.description ?? ""); setModOpen(true); }}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteModule(m.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <Dialog open={!!editingLevel} onOpenChange={() => setEditingLevel(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar nível {editingLevel?.code}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Título</Label><Input value={lvlTitle} onChange={e => setLvlTitle(e.target.value)} /></div>
              <div><Label>Descrição</Label><Textarea value={lvlDesc} onChange={e => setLvlDesc(e.target.value)} /></div>
              <Button onClick={saveLevel} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
