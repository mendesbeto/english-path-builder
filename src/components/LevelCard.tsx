 import { motion } from "framer-motion";
 import { Lock, CheckCircle, Play } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface LevelCardProps {
   level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
   title: string;
   description: string;
   progress: number;
   isLocked?: boolean;
   isCompleted?: boolean;
   onClick?: () => void;
 }
 
 const levelColors = {
   A1: "bg-level-a1",
   A2: "bg-level-a2",
   B1: "bg-level-b1",
   B2: "bg-level-b2",
   C1: "bg-level-c1",
   C2: "bg-level-c2",
 };
 
 const levelLabels = {
   A1: "Iniciante",
   A2: "Básico",
   B1: "Intermediário",
   B2: "Intermediário Avançado",
   C1: "Avançado",
   C2: "Proficiência",
 };
 
 export function LevelCard({
   level,
   title,
   description,
   progress,
   isLocked = false,
   isCompleted = false,
   onClick,
 }: LevelCardProps) {
   return (
     <motion.div
       whileHover={!isLocked ? { scale: 1.02, y: -5 } : {}}
       whileTap={!isLocked ? { scale: 0.98 } : {}}
       className={cn(
         "relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all duration-300",
         "bg-card border-2 border-border shadow-md hover:shadow-xl",
         isLocked && "opacity-60 cursor-not-allowed"
       )}
       onClick={!isLocked ? onClick : undefined}
     >
       {/* Level Badge */}
       <div
         className={cn(
           "absolute -top-1 -right-1 w-20 h-20 flex items-end justify-start pb-5 pl-4",
           levelColors[level],
           "rounded-bl-[40px]"
         )}
       >
         <span className="text-white font-display font-bold text-lg">{level}</span>
       </div>
 
       {/* Status Icon */}
       <div className="absolute top-4 left-4">
         {isLocked ? (
           <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
             <Lock className="w-5 h-5 text-muted-foreground" />
           </div>
         ) : isCompleted ? (
           <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center">
             <CheckCircle className="w-5 h-5 text-success-foreground" />
           </div>
         ) : (
           <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", levelColors[level])}>
             <Play className="w-5 h-5 text-white fill-white" />
           </div>
         )}
       </div>
 
       {/* Content */}
       <div className="mt-14">
         <p className="text-sm font-medium text-muted-foreground mb-1">
           {levelLabels[level]}
         </p>
         <h3 className="text-xl font-display font-bold text-foreground mb-2">
           {title}
         </h3>
         <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
           {description}
         </p>
 
         {/* Progress Bar */}
         {!isLocked && (
           <div className="space-y-2">
             <div className="flex justify-between text-sm">
               <span className="text-muted-foreground">Progresso</span>
               <span className="font-semibold text-foreground">{progress}%</span>
             </div>
             <div className="h-2 bg-muted rounded-full overflow-hidden">
               <motion.div
                 initial={{ width: 0 }}
                 animate={{ width: `${progress}%` }}
                 transition={{ duration: 0.8, ease: "easeOut" }}
                 className={cn("h-full rounded-full", levelColors[level])}
               />
             </div>
           </div>
         )}
       </div>
     </motion.div>
   );
 }