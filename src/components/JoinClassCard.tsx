import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Ticket } from "lucide-react";

export default function JoinClassCard({ onJoined }: { onJoined?: () => void | Promise<void> }) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const join = async () => {
    if (!code.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("join_class_by_code", { _code: code.trim() });
    setLoading(false);
    if (error) {
      return toast({ title: "Não foi possível entrar", description: error.message, variant: "destructive" });
    }
    const name = (data as any)?.[0]?.class_name ?? "turma";
    setCode("");
    toast({ title: "Matrícula concluída", description: `Você entrou na turma ${name}.` });
    await onJoined?.();
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Ticket className="h-4 w-4 text-primary" />
        <h3 className="text-lg font-display font-bold">Entrar em uma turma</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Digite o código de convite fornecido pelo seu professor.
      </p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && join()}
          placeholder="EX: A7K2QP"
          maxLength={10}
          className="uppercase tracking-widest"
        />
        <Button onClick={join} disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
        </Button>
      </div>
    </div>
  );
}
