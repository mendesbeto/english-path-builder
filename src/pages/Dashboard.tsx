 import { motion } from "framer-motion";
 import { Link } from "react-router-dom";
 import { 
   Flame, 
   Trophy, 
   Clock, 
   Target, 
   BookOpen,
   ArrowRight,
   Star,
   Zap,
   Award
 } from "lucide-react";
 import { Navbar } from "@/components/Navbar";
 import { ProgressRing } from "@/components/ProgressRing";
 import { LevelCard } from "@/components/LevelCard";
 import { LessonCard } from "@/components/LessonCard";
 import { Badge } from "@/components/Badge";
 import { Button } from "@/components/ui/button";
 
 const currentLevel = {
   level: "A1" as const,
   title: "Primeiros Passos",
   description: "Alfabeto, cumprimentos e vocabulário básico",
   progress: 35,
 };
 
 const nextLessons = [
   { title: "Pronomes Pessoais", type: "text" as const, duration: "10 min", isCompleted: true },
   { title: "Verb To Be - Afirmativo", type: "video" as const, duration: "15 min", isCompleted: true },
   { title: "Verb To Be - Negativo", type: "video" as const, duration: "12 min", isCompleted: false },
   { title: "Prática de Pronúncia", type: "speaking" as const, duration: "8 min", isLocked: true },
   { title: "Quiz: Verb To Be", type: "quiz" as const, duration: "5 min", isLocked: true },
 ];
 
 const badges = [
   { icon: <Flame className="w-6 h-6" />, title: "Sequência de 7 dias", description: "Estudou 7 dias seguidos", isEarned: true },
   { icon: <Star className="w-6 h-6" />, title: "Primeira Aula", description: "Completou a primeira aula", isEarned: true },
   { icon: <Zap className="w-6 h-6" />, title: "Relâmpago", description: "Quiz perfeito em menos de 2 min", isEarned: false },
   { icon: <Award className="w-6 h-6" />, title: "Certificado A1", description: "Complete o nível A1", isEarned: false },
 ];
 
 const stats = [
   { icon: Flame, label: "Sequência", value: "7 dias", color: "text-secondary" },
   { icon: Trophy, label: "Pontos", value: "1.250", color: "text-level-a2" },
   { icon: Clock, label: "Tempo de estudo", value: "12h", color: "text-accent" },
   { icon: Target, label: "Aulas completas", value: "8", color: "text-primary" },
 ];
 
 export default function Dashboard() {
   return (
     <div className="min-h-screen bg-background">
       <Navbar isLoggedIn userName="Maria Silva" />
       
       <main className="pt-24 pb-16">
         <div className="container mx-auto px-4">
           {/* Welcome Section */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="mb-8"
           >
             <h1 className="text-3xl font-display font-bold text-foreground mb-2">
               Olá, Maria! 👋
             </h1>
             <p className="text-muted-foreground">
               Continue sua jornada de aprendizado. Você está indo muito bem!
             </p>
           </motion.div>
 
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Main Content */}
             <div className="lg:col-span-2 space-y-8">
               {/* Stats Cards */}
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.1 }}
                 className="grid grid-cols-2 md:grid-cols-4 gap-4"
               >
                 {stats.map((stat, index) => (
                   <div
                     key={index}
                     className="p-4 rounded-xl bg-card border border-border"
                   >
                     <stat.icon className={`w-6 h-6 ${stat.color} mb-2`} />
                     <div className="text-2xl font-display font-bold text-foreground">
                       {stat.value}
                     </div>
                     <div className="text-sm text-muted-foreground">{stat.label}</div>
                   </div>
                 ))}
               </motion.div>
 
               {/* Current Level Card */}
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2 }}
               >
                 <div className="flex items-center justify-between mb-4">
                   <h2 className="text-xl font-display font-bold text-foreground">
                     Nível Atual
                   </h2>
                   <Link to="/levels">
                     <Button variant="ghost" size="sm">
                       Ver todos
                       <ArrowRight className="w-4 h-4" />
                     </Button>
                   </Link>
                 </div>
                 <LevelCard {...currentLevel} />
               </motion.div>
 
               {/* Next Lessons */}
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.3 }}
               >
                 <div className="flex items-center justify-between mb-4">
                   <h2 className="text-xl font-display font-bold text-foreground">
                     Próximas Aulas
                   </h2>
                   <Link to="/levels/a1">
                     <Button variant="ghost" size="sm">
                       Ver módulo
                       <ArrowRight className="w-4 h-4" />
                     </Button>
                   </Link>
                 </div>
                 <div className="space-y-3">
                   {nextLessons.map((lesson, index) => (
                     <LessonCard key={index} {...lesson} />
                   ))}
                 </div>
               </motion.div>
             </div>
 
             {/* Sidebar */}
             <div className="space-y-8">
               {/* Progress Overview */}
               <motion.div
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.2 }}
                 className="p-6 rounded-2xl bg-card border border-border"
               >
                 <h3 className="text-lg font-display font-bold text-foreground mb-6 text-center">
                   Progresso Geral
                 </h3>
                 <div className="flex justify-center mb-6">
                   <ProgressRing progress={35} size={140}>
                     <div className="text-center">
                       <div className="text-3xl font-display font-bold text-primary">35%</div>
                       <div className="text-xs text-muted-foreground">A1 Completo</div>
                     </div>
                   </ProgressRing>
                 </div>
                 <div className="space-y-3">
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Aulas completadas</span>
                     <span className="font-semibold text-foreground">8/23</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Exercícios feitos</span>
                     <span className="font-semibold text-foreground">24/65</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Quizzes perfeitos</span>
                     <span className="font-semibold text-foreground">3/8</span>
                   </div>
                 </div>
               </motion.div>
 
               {/* Badges */}
               <motion.div
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.3 }}
               >
                 <h3 className="text-lg font-display font-bold text-foreground mb-4">
                   Conquistas
                 </h3>
                 <div className="grid grid-cols-2 gap-3">
                   {badges.map((badge, index) => (
                     <Badge key={index} {...badge} />
                   ))}
                 </div>
               </motion.div>
 
               {/* Daily Goal */}
               <motion.div
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.4 }}
                 className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20"
               >
                 <div className="flex items-center gap-3 mb-4">
                   <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                     <Target className="w-5 h-5 text-primary-foreground" />
                   </div>
                   <div>
                     <h4 className="font-display font-bold text-foreground">Meta Diária</h4>
                     <p className="text-sm text-muted-foreground">15 minutos por dia</p>
                   </div>
                 </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Progresso de hoje</span>
                     <span className="font-semibold text-foreground">10/15 min</span>
                   </div>
                   <div className="h-2 bg-muted rounded-full overflow-hidden">
                     <div className="h-full w-2/3 bg-primary rounded-full" />
                   </div>
                 </div>
               </motion.div>
             </div>
           </div>
         </div>
       </main>
     </div>
   );
 }