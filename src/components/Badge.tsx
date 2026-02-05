 import { cn } from "@/lib/utils";
 import { motion } from "framer-motion";
 
 interface BadgeProps {
   icon: React.ReactNode;
   title: string;
   description: string;
   isEarned?: boolean;
 }
 
 export function Badge({ icon, title, description, isEarned = false }: BadgeProps) {
   return (
     <motion.div
       whileHover={{ scale: 1.05 }}
       className={cn(
         "flex flex-col items-center p-4 rounded-xl text-center transition-all duration-300",
         isEarned
           ? "bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary"
           : "bg-muted/50 border-2 border-dashed border-muted-foreground/30 opacity-50"
       )}
     >
       <div
         className={cn(
           "w-14 h-14 rounded-full flex items-center justify-center mb-3",
           isEarned ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
         )}
       >
         {icon}
       </div>
       <h4 className="font-display font-bold text-sm text-foreground mb-1">{title}</h4>
       <p className="text-xs text-muted-foreground">{description}</p>
     </motion.div>
   );
 }