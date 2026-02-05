 import { motion } from "framer-motion";
 import { BookOpen, Video, Headphones, Pencil, HelpCircle, Mic, CheckCircle, Lock } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 type ContentType = "text" | "video" | "audio" | "writing" | "quiz" | "speaking";
 
 interface LessonCardProps {
   title: string;
   type: ContentType;
   duration: string;
   isCompleted?: boolean;
   isLocked?: boolean;
   onClick?: () => void;
 }
 
 const typeIcons = {
   text: BookOpen,
   video: Video,
   audio: Headphones,
   writing: Pencil,
   quiz: HelpCircle,
   speaking: Mic,
 };
 
 const typeLabels = {
   text: "Leitura",
   video: "Vídeo",
   audio: "Áudio",
   writing: "Escrita",
   quiz: "Quiz",
   speaking: "Pronúncia",
 };
 
 const typeColors = {
   text: "bg-accent text-accent-foreground",
   video: "bg-secondary text-secondary-foreground",
   audio: "bg-level-b2 text-white",
   writing: "bg-level-a2 text-foreground",
   quiz: "bg-primary text-primary-foreground",
   speaking: "bg-level-c1 text-white",
 };
 
 export function LessonCard({
   title,
   type,
   duration,
   isCompleted = false,
   isLocked = false,
   onClick,
 }: LessonCardProps) {
   const Icon = typeIcons[type];
 
   return (
     <motion.div
       whileHover={!isLocked ? { x: 5 } : {}}
       whileTap={!isLocked ? { scale: 0.98 } : {}}
       className={cn(
         "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200",
         "bg-card border border-border hover:border-primary/50 hover:shadow-md",
         isLocked && "opacity-50 cursor-not-allowed",
         isCompleted && "bg-primary/5 border-primary/30"
       )}
       onClick={!isLocked ? onClick : undefined}
     >
       {/* Icon */}
       <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", typeColors[type])}>
         <Icon className="w-6 h-6" />
       </div>
 
       {/* Content */}
       <div className="flex-1 min-w-0">
         <h4 className="font-display font-semibold text-foreground truncate">{title}</h4>
         <div className="flex items-center gap-2 text-sm text-muted-foreground">
           <span>{typeLabels[type]}</span>
           <span>•</span>
           <span>{duration}</span>
         </div>
       </div>
 
       {/* Status */}
       <div className="shrink-0">
         {isLocked ? (
           <Lock className="w-5 h-5 text-muted-foreground" />
         ) : isCompleted ? (
           <CheckCircle className="w-5 h-5 text-success" />
         ) : (
           <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
         )}
       </div>
     </motion.div>
   );
 }