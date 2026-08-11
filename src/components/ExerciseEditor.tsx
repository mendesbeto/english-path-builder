import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Check } from "lucide-react";

interface Props { lessonId: string; lessonTitle: string; }

export default function ExerciseEditor({ lessonId, lessonTitle }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correct, setCorrect] = useState<number>(0);
  const [points, setPoints] = useState(10);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("exercises").select("*").eq("lesson_id", lessonId).order("order_num");
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [lessonId]);

  const add = async () => {
    const opts = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim() || opts.length < 2) {
      return toast({ title: "Preencha a pergunta e ao menos 2 alternativas", variant: "destructive" });
    }
    const answer = options[correct]?.trim();
    if (!answer) return toast({ title: "Selecione a alternativa correta", variant: "destructive" });
    setSaving(true);
    const { error } = await supabase.from("exercises").insert({
      lesson_id: lessonId, question: question.trim(), options: opts,
      correct_answer: answer, points, order_num: items.length,
    });
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setQuestion(""); setOptions(["", "", "", ""]); setCorrect(0); setPoints(10);
    toast({ title: "Exercício adicionado" });
    load();
  };

  const del = async (id: string) => {
    await supabase.from("exercises").delete().eq("id", id);
    load();
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Aula: <span className="font-medium text-foreground">{lessonTitle}</span></p>

      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum exercício ainda.</p>}
        {items.map((ex, i) => (
          <div key={ex.id} className="p-3 rounded-xl border border-border">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="font-medium text-sm">{i + 1}. {ex.question}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(Array.isArray(ex.options) ? ex.options : []).map((o: string) => (
                    <span key={o} className={`text-xs px-2 py-0.5 rounded-full border ${o === ex.correct_answer ? "border-success text-success" : "border-border text-muted-foreground"}`}>
                      {o}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{ex.points} pts</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del(ex.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl border border-dashed border-border space-y-3">
        <h4 className="font-display font-bold text-sm">Novo exercício</h4>
        <div><Label>Pergunta</Label><Textarea value={question} onChange={e => setQuestion(e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Alternativas (clique no ✓ para marcar a correta)</Label>
          {options.map((o, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Button
                type="button"
                variant={correct === i ? "default" : "outline"}
                size="icon"
                onClick={() => setCorrect(i)}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Input
                value={o}
                placeholder={`Alternativa ${i + 1}`}
                onChange={e => setOptions(options.map((v, j) => (j === i ? e.target.value : v)))}
              />
            </div>
          ))}
        </div>
        <div className="w-32"><Label>Pontos</Label><Input type="number" value={points} onChange={e => setPoints(Number(e.target.value))} /></div>
        <Button onClick={add} disabled={saving} className="w-full">
          <Plus className="w-4 h-4 mr-1" /> Adicionar exercício
        </Button>
      </div>
    </div>
  );
}
