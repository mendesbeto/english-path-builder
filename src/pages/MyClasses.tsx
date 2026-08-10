import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import JoinClassCard from "@/components/JoinClassCard";
import ClassReport from "@/components/ClassReport";

import { Loader2, Users } from "lucide-react";

type ClassRow = {
  id: string;
  name: string;
  description: string | null;
  level_code: string | null;
};

export default function MyClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("class_students")
      .select("enrolled_at, classes(id, name, description, level_code)")
      .eq("student_id", user.id)
      .order("enrolled_at", { ascending: false });
    setClasses(((data ?? []).map((r: any) => r.classes).filter(Boolean)) as ClassRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Minhas turmas</h1>
          <p className="text-sm text-muted-foreground">
            Use o código de convite do seu professor para entrar em uma turma.
          </p>
        </div>

        <JoinClassCard onJoined={load} />

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não está matriculado em nenhuma turma.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {classes.map((c) => (
              <div key={c.id} className="rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold">{c.name}</h2>
                </div>
                <p className="text-xs text-muted-foreground">Nível {c.level_code ?? "—"}</p>
                {c.description && <p className="text-sm text-muted-foreground mt-2">{c.description}</p>}
              </div>
            ))}
          </div>
        )}

        {!loading && classes.length > 0 && user && (
          <ClassReport
            studentId={user.id}
            classes={classes.map((c) => ({ id: c.id, name: c.name, level_code: c.level_code }))}
          />
        )}

      </div>
    </AppLayout>
  );
}
