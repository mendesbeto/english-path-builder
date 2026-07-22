import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Loader2, Lock } from "lucide-react";

const colors: Record<string, string> = {
  A1: "#22C55E", A2: "#EAB308", B1: "#3B82F6", B2: "#A855F7", C1: "#EF4444", C2: "#0F172A",
};

export default function Levels() {
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("levels").select("*").order("order_num").then(({ data }) => {
      setLevels(data ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <AppLayout><div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-display font-bold mb-2">Níveis CEFR</h1>
          <p className="text-muted-foreground">Progrida do A1 (iniciante) ao C2 (proficiência).</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {levels.map((lv, i) => (
            <motion.div key={lv.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/levels/${lv.code.toLowerCase()}`)}
              className="p-6 rounded-2xl border border-border bg-card cursor-pointer hover:shadow-lg transition">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-bold text-white text-2xl mb-4"
                   style={{ backgroundColor: colors[lv.code] ?? lv.color }}>
                {lv.code}
              </div>
              <h3 className="font-display font-bold text-lg mb-1">{lv.title}</h3>
              <p className="text-sm text-muted-foreground">{lv.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
