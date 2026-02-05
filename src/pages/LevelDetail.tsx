 import { useState } from "react";
 import { motion } from "framer-motion";
 import { Link, useParams } from "react-router-dom";
 import { 
   ArrowLeft, 
   BookOpen, 
   CheckCircle, 
   Clock, 
   FileText,
   Play
 } from "lucide-react";
 import { Navbar } from "@/components/Navbar";
 import { LessonCard } from "@/components/LessonCard";
 import { ProgressRing } from "@/components/ProgressRing";
 import { Button } from "@/components/ui/button";
 import { cn } from "@/lib/utils";
 
 const modules = [
   {
     id: 1,
     title: "Introdução ao Inglês",
     lessons: [
      { title: "O Alfabeto em Inglês", type: "video" as const, duration: "8 min", isCompleted: true, isLocked: false },
      { title: "Vogais e Consoantes", type: "audio" as const, duration: "10 min", isCompleted: true, isLocked: false },
      { title: "Prática de Sons", type: "speaking" as const, duration: "5 min", isCompleted: true, isLocked: false },
      { title: "Quiz: Alfabeto", type: "quiz" as const, duration: "3 min", isCompleted: true, isLocked: false },
     ],
   },
   {
     id: 2,
     title: "Cumprimentos e Apresentações",
     lessons: [
      { title: "Hello, Hi, Hey - Quando usar?", type: "text" as const, duration: "7 min", isCompleted: true, isLocked: false },
      { title: "Diálogo: Primeira Conversa", type: "video" as const, duration: "12 min", isCompleted: true, isLocked: false },
      { title: "Listening: Apresentações", type: "audio" as const, duration: "8 min", isCompleted: false, isLocked: false },
      { title: "Escrita: Me Apresentando", type: "writing" as const, duration: "10 min", isCompleted: false, isLocked: true },
      { title: "Quiz: Cumprimentos", type: "quiz" as const, duration: "5 min", isCompleted: false, isLocked: true },
     ],
   },
   {
     id: 3,
     title: "Verb To Be",
     lessons: [
      { title: "Introdução ao Verb To Be", type: "video" as const, duration: "15 min", isCompleted: false, isLocked: true },
      { title: "Afirmativo: I am, You are...", type: "text" as const, duration: "10 min", isCompleted: false, isLocked: true },
      { title: "Negativo: I am not...", type: "text" as const, duration: "10 min", isCompleted: false, isLocked: true },
      { title: "Interrogativo: Are you...?", type: "text" as const, duration: "10 min", isCompleted: false, isLocked: true },
      { title: "Prática de Pronúncia", type: "speaking" as const, duration: "8 min", isCompleted: false, isLocked: true },
      { title: "Quiz: Verb To Be", type: "quiz" as const, duration: "5 min", isCompleted: false, isLocked: true },
     ],
   },
   {
     id: 4,
     title: "Pronomes Pessoais",
     lessons: [
      { title: "I, You, He, She, It", type: "video" as const, duration: "12 min", isCompleted: false, isLocked: true },
      { title: "We, You, They", type: "video" as const, duration: "10 min", isCompleted: false, isLocked: true },
      { title: "Exercícios de Fixação", type: "writing" as const, duration: "15 min", isCompleted: false, isLocked: true },
      { title: "Quiz: Pronomes", type: "quiz" as const, duration: "5 min", isCompleted: false, isLocked: true },
     ],
   },
   {
     id: 5,
     title: "Vocabulário Básico",
     lessons: [
      { title: "Família (Family)", type: "video" as const, duration: "15 min", isCompleted: false, isLocked: true },
      { title: "Cores (Colors)", type: "video" as const, duration: "10 min", isCompleted: false, isLocked: true },
      { title: "Números 1-100", type: "text" as const, duration: "12 min", isCompleted: false, isLocked: true },
      { title: "Listening: Família e Cores", type: "audio" as const, duration: "8 min", isCompleted: false, isLocked: true },
      { title: "Quiz Final: Vocabulário", type: "quiz" as const, duration: "10 min", isCompleted: false, isLocked: true },
     ],
   },
 ];
 
 const levelInfo = {
   a1: { name: "A1", title: "Primeiros Passos", color: "bg-level-a1" },
   a2: { name: "A2", title: "Fundamentos", color: "bg-level-a2" },
   b1: { name: "B1", title: "Conversação", color: "bg-level-b1" },
   b2: { name: "B2", title: "Fluência", color: "bg-level-b2" },
   c1: { name: "C1", title: "Domínio", color: "bg-level-c1" },
   c2: { name: "C2", title: "Proficiência", color: "bg-level-c2" },
 };
 
 export default function LevelDetail() {
   const { levelId } = useParams<{ levelId: string }>();
   const [expandedModule, setExpandedModule] = useState<number | null>(1);
   
   const level = levelInfo[levelId as keyof typeof levelInfo] || levelInfo.a1;
   const completedLessons = 7;
   const totalLessons = 24;
   const progress = Math.round((completedLessons / totalLessons) * 100);
 
   return (
     <div className="min-h-screen bg-background">
       <Navbar isLoggedIn userName="Maria Silva" />
       
       <main className="pt-24 pb-16">
         <div className="container mx-auto px-4">
           {/* Back Link */}
           <Link
             to="/levels"
             className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
           >
             <ArrowLeft className="w-4 h-4" />
             Voltar aos níveis
           </Link>
 
           {/* Level Header */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="flex flex-col lg:flex-row gap-8 mb-12"
           >
             <div className="flex-1">
               <div className="flex items-center gap-4 mb-4">
                 <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", level.color)}>
                   <span className="text-2xl font-display font-bold text-white">{level.name}</span>
                 </div>
                 <div>
                   <h1 className="text-3xl font-display font-bold text-foreground">
                     {level.title}
                   </h1>
                   <p className="text-muted-foreground">Nível Iniciante</p>
                 </div>
               </div>
               <p className="text-muted-foreground mb-6">
                 Neste nível você vai aprender o básico do inglês: alfabeto, cumprimentos, 
                 verb to be, pronomes pessoais e vocabulário essencial para começar a se comunicar.
               </p>
               <div className="flex flex-wrap gap-4">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                   <BookOpen className="w-4 h-4" />
                   <span>{totalLessons} aulas</span>
                 </div>
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                   <Clock className="w-4 h-4" />
                   <span>~4 horas</span>
                 </div>
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                   <FileText className="w-4 h-4" />
                   <span>5 módulos</span>
                 </div>
               </div>
             </div>
 
             {/* Progress Card */}
             <div className="lg:w-80 p-6 rounded-2xl bg-card border border-border">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-display font-bold text-foreground">Seu Progresso</h3>
                 <span className="text-sm text-muted-foreground">{completedLessons}/{totalLessons} aulas</span>
               </div>
               <div className="flex justify-center mb-4">
                 <ProgressRing progress={progress} size={100}>
                   <span className="text-xl font-display font-bold text-primary">{progress}%</span>
                 </ProgressRing>
               </div>
               <Button variant="hero" className="w-full">
                 <Play className="w-4 h-4" />
                 Continuar Estudando
               </Button>
             </div>
           </motion.div>
 
           {/* Modules */}
           <div className="space-y-4">
             {modules.map((module, index) => {
               const moduleCompleted = module.lessons.filter(l => l.isCompleted).length;
               const moduleTotal = module.lessons.length;
               const isExpanded = expandedModule === module.id;
 
               return (
                 <motion.div
                   key={module.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: index * 0.1 }}
                   className="rounded-2xl border border-border overflow-hidden"
                 >
                   {/* Module Header */}
                   <button
                     onClick={() => setExpandedModule(isExpanded ? null : module.id)}
                     className="w-full p-6 bg-card flex items-center justify-between hover:bg-muted/50 transition-colors"
                   >
                     <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                         moduleCompleted === moduleTotal 
                           ? "bg-success text-success-foreground" 
                           : "bg-muted text-muted-foreground"
                       )}>
                         {moduleCompleted === moduleTotal ? (
                           <CheckCircle className="w-5 h-5" />
                         ) : (
                           <span>{module.id}</span>
                         )}
                       </div>
                       <div className="text-left">
                         <h3 className="font-display font-bold text-foreground">
                           {module.title}
                         </h3>
                         <p className="text-sm text-muted-foreground">
                           {moduleCompleted}/{moduleTotal} aulas completas
                         </p>
                       </div>
                     </div>
                     <motion.div
                       animate={{ rotate: isExpanded ? 180 : 0 }}
                       transition={{ duration: 0.2 }}
                     >
                       <ArrowLeft className="w-5 h-5 text-muted-foreground -rotate-90" />
                     </motion.div>
                   </button>
 
                   {/* Module Content */}
                   {isExpanded && (
                     <motion.div
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: "auto", opacity: 1 }}
                       exit={{ height: 0, opacity: 0 }}
                       className="border-t border-border bg-muted/20 p-4"
                     >
                       <div className="space-y-2">
                         {module.lessons.map((lesson, lessonIndex) => (
                           <LessonCard key={lessonIndex} {...lesson} />
                         ))}
                       </div>
                     </motion.div>
                   )}
                 </motion.div>
               );
             })}
           </div>
         </div>
       </main>
     </div>
   );
 }