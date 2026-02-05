 import { useState } from "react";
 import { Link, useNavigate } from "react-router-dom";
 import { motion } from "framer-motion";
 import { BookOpen, Mail, Lock, Eye, EyeOff, ArrowLeft, User, GraduationCap, Users } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { useToast } from "@/hooks/use-toast";
 import { cn } from "@/lib/utils";
 
 type UserRole = "student" | "teacher";
 
 export default function Register() {
   const [step, setStep] = useState<1 | 2>(1);
   const [role, setRole] = useState<UserRole | null>(null);
   const [name, setName] = useState("");
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [showPassword, setShowPassword] = useState(false);
   const [isLoading, setIsLoading] = useState(false);
   const navigate = useNavigate();
   const { toast } = useToast();
 
   const handleRoleSelect = (selectedRole: UserRole) => {
     setRole(selectedRole);
     setStep(2);
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsLoading(true);
     
     setTimeout(() => {
       setIsLoading(false);
       toast({
         title: "Conta criada com sucesso!",
         description: "Bem-vindo ao English Path. Vamos começar!",
       });
       navigate("/dashboard");
     }, 1500);
   };
 
   return (
     <div className="min-h-screen bg-background flex">
       {/* Left Side - Form */}
       <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16">
         <motion.div
           key={step}
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           className="max-w-md mx-auto w-full"
         >
           {/* Back Link */}
           <button
             onClick={() => step === 2 ? setStep(1) : navigate("/")}
             className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
           >
             <ArrowLeft className="w-4 h-4" />
             {step === 2 ? "Voltar" : "Voltar ao início"}
           </button>
 
           {/* Logo */}
           <div className="flex items-center gap-2 mb-8">
             <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
               <BookOpen className="w-5 h-5 text-white" />
             </div>
             <span className="font-display font-bold text-xl text-foreground">
               English <span className="text-primary">Path</span>
             </span>
           </div>
 
           {step === 1 ? (
             <>
               {/* Step 1: Choose Role */}
               <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                 Quem é você?
               </h1>
               <p className="text-muted-foreground mb-8">
                 Escolha como você vai usar o English Path
               </p>
 
               <div className="grid gap-4">
                 <motion.button
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   onClick={() => handleRoleSelect("student")}
                   className="p-6 rounded-2xl border-2 border-border hover:border-primary text-left transition-all bg-card hover:shadow-lg"
                 >
                   <div className="flex items-start gap-4">
                     <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                       <GraduationCap className="w-7 h-7 text-primary" />
                     </div>
                     <div>
                       <h3 className="font-display font-bold text-lg text-foreground mb-1">
                         Sou Aluno
                       </h3>
                       <p className="text-sm text-muted-foreground">
                         Quero aprender inglês e acompanhar meu progresso
                       </p>
                     </div>
                   </div>
                 </motion.button>
 
                 <motion.button
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   onClick={() => handleRoleSelect("teacher")}
                   className="p-6 rounded-2xl border-2 border-border hover:border-secondary text-left transition-all bg-card hover:shadow-lg"
                 >
                   <div className="flex items-start gap-4">
                     <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                       <Users className="w-7 h-7 text-secondary" />
                     </div>
                     <div>
                       <h3 className="font-display font-bold text-lg text-foreground mb-1">
                         Sou Professor
                       </h3>
                       <p className="text-sm text-muted-foreground">
                         Quero criar aulas e gerenciar turmas
                       </p>
                     </div>
                   </div>
                 </motion.button>
               </div>
             </>
           ) : (
             <>
               {/* Step 2: Account Details */}
               <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                 Criar sua conta
               </h1>
               <p className="text-muted-foreground mb-8">
                 {role === "student" 
                   ? "Comece sua jornada de aprendizado" 
                   : "Configure sua conta de professor"}
               </p>
 
               <form onSubmit={handleSubmit} className="space-y-6">
                 <div className="space-y-2">
                   <Label htmlFor="name">Nome completo</Label>
                   <div className="relative">
                     <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                     <Input
                       id="name"
                       type="text"
                       placeholder="Seu nome"
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                       className="pl-10 h-12"
                       required
                     />
                   </div>
                 </div>
 
                 <div className="space-y-2">
                   <Label htmlFor="email">E-mail</Label>
                   <div className="relative">
                     <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                     <Input
                       id="email"
                       type="email"
                       placeholder="seu@email.com"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       className="pl-10 h-12"
                       required
                     />
                   </div>
                 </div>
 
                 <div className="space-y-2">
                   <Label htmlFor="password">Senha</Label>
                   <div className="relative">
                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                     <Input
                       id="password"
                       type={showPassword ? "text" : "password"}
                       placeholder="Mínimo 8 caracteres"
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       className="pl-10 pr-10 h-12"
                       minLength={8}
                       required
                     />
                     <button
                       type="button"
                       onClick={() => setShowPassword(!showPassword)}
                       className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                     >
                       {showPassword ? (
                         <EyeOff className="w-5 h-5" />
                       ) : (
                         <Eye className="w-5 h-5" />
                       )}
                     </button>
                   </div>
                 </div>
 
                 <Button
                   type="submit"
                   variant="hero"
                   size="lg"
                   className="w-full"
                   disabled={isLoading}
                 >
                   {isLoading ? "Criando conta..." : "Criar Conta"}
                 </Button>
               </form>
             </>
           )}
 
           <p className="text-center text-sm text-muted-foreground mt-8">
             Já tem uma conta?{" "}
             <Link to="/login" className="text-primary font-medium hover:underline">
               Fazer login
             </Link>
           </p>
         </motion.div>
       </div>
 
       {/* Right Side - Decorative */}
       <div className="hidden lg:flex flex-1 bg-gradient-hero items-center justify-center p-12 relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
         <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.2 }}
           className="text-center relative z-10"
         >
           <h2 className="text-4xl font-display font-bold text-white mb-4">
             {role === "teacher" 
               ? "Ensine milhares de alunos"
               : "Comece sua jornada"}
           </h2>
           <p className="text-white/80 text-lg max-w-md">
             {role === "teacher"
               ? "Crie aulas interativas e acompanhe o progresso dos seus alunos"
               : "Do A1 ao C2, com certificados reconhecidos internacionalmente"}
           </p>
         </motion.div>
       </div>
     </div>
   );
 }