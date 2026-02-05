 import { motion } from "framer-motion";
 import { Link, useNavigate } from "react-router-dom";
 import { ArrowRight } from "lucide-react";
 import { Navbar } from "@/components/Navbar";
 import { LevelCard } from "@/components/LevelCard";
 import { Button } from "@/components/ui/button";
 
 const levels = [
   { 
     level: "A1" as const, 
     title: "Primeiros Passos", 
     description: "Alfabeto, cumprimentos, verb to be, pronomes e vocabulário básico (família, cores, números)", 
     progress: 35,
     isLocked: false,
     isCompleted: false,
   },
   { 
     level: "A2" as const, 
     title: "Fundamentos", 
     description: "Simple Present, rotina diária, perguntas e respostas, vocabulário do cotidiano e pequenos diálogos", 
     progress: 0,
     isLocked: true,
     isCompleted: false,
   },
   { 
     level: "B1" as const, 
     title: "Conversação", 
     description: "Simple Past, Future (will/going to), textos curtos e situações reais de viagem e trabalho", 
     progress: 0,
     isLocked: true,
     isCompleted: false,
   },
   { 
     level: "B2" as const, 
     title: "Fluência", 
     description: "Present Perfect, Passive Voice, Conditionals, debates, opinião e listening com áudios reais", 
     progress: 0,
     isLocked: true,
     isCompleted: false,
   },
   { 
     level: "C1" as const, 
     title: "Domínio", 
     description: "Fluência avançada, phrasal verbs, Academic English, escrita formal e compreensão avançada", 
     progress: 0,
     isLocked: true,
     isCompleted: false,
   },
   { 
     level: "C2" as const, 
     title: "Proficiência", 
     description: "Inglês nativo, expressões idiomáticas, textos acadêmicos, produção oral complexa e análise crítica", 
     progress: 0,
     isLocked: true,
     isCompleted: false,
   },
 ];
 
 export default function Levels() {
   const navigate = useNavigate();
 
   return (
     <div className="min-h-screen bg-background">
       <Navbar isLoggedIn userName="Maria Silva" />
       
       <main className="pt-24 pb-16">
         <div className="container mx-auto px-4">
           {/* Header */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="text-center mb-12"
           >
             <h1 className="text-4xl font-display font-bold text-foreground mb-4">
               Níveis de Proficiência
             </h1>
             <p className="text-muted-foreground max-w-2xl mx-auto">
               Siga o padrão internacional CEFR e progrida do iniciante ao fluente.
               Complete cada nível para desbloquear o próximo e ganhe certificados!
             </p>
           </motion.div>
 
           {/* Progress Overview */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="mb-12 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20"
           >
             <div className="flex flex-col md:flex-row items-center justify-between gap-6">
               <div>
                 <h2 className="text-xl font-display font-bold text-foreground mb-2">
                   Sua Jornada
                 </h2>
                 <p className="text-muted-foreground">
                   Você está no nível <span className="font-bold text-primary">A1</span> com 35% de progresso
                 </p>
               </div>
               <div className="flex items-center gap-4">
                 <div className="text-center">
                   <div className="text-3xl font-display font-bold text-primary">1/6</div>
                   <div className="text-sm text-muted-foreground">Níveis desbloqueados</div>
                 </div>
                 <div className="h-12 w-px bg-border" />
                 <div className="text-center">
                   <div className="text-3xl font-display font-bold text-secondary">0</div>
                   <div className="text-sm text-muted-foreground">Certificados</div>
                 </div>
               </div>
             </div>
           </motion.div>
 
           {/* Levels Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {levels.map((level, index) => (
               <motion.div
                 key={level.level}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: index * 0.1 }}
               >
                 <LevelCard 
                   {...level} 
                   onClick={() => !level.isLocked && navigate(`/levels/${level.level.toLowerCase()}`)}
                 />
               </motion.div>
             ))}
           </div>
 
           {/* Info Section */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.6 }}
             className="mt-12 text-center"
           >
             <p className="text-sm text-muted-foreground mb-4">
               Complete 100% de um nível para desbloquear o próximo e receber seu certificado
             </p>
             <Link to="/dashboard">
               <Button variant="outline">
                 Voltar ao Dashboard
                 <ArrowRight className="w-4 h-4" />
               </Button>
             </Link>
           </motion.div>
         </div>
       </main>
     </div>
   );
 }