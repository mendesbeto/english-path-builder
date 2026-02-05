 import { useState } from "react";
 import { Link, useNavigate } from "react-router-dom";
 import { motion } from "framer-motion";
 import { BookOpen, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { useToast } from "@/hooks/use-toast";
 
 export default function Login() {
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [showPassword, setShowPassword] = useState(false);
   const [isLoading, setIsLoading] = useState(false);
   const navigate = useNavigate();
   const { toast } = useToast();
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsLoading(true);
     
     // Simulate login - in production, this would connect to backend
     setTimeout(() => {
       setIsLoading(false);
       toast({
         title: "Login realizado!",
         description: "Bem-vindo de volta ao English Path.",
       });
       navigate("/dashboard");
     }, 1500);
   };
 
   return (
     <div className="min-h-screen bg-background flex">
       {/* Left Side - Form */}
       <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16">
         <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           className="max-w-md mx-auto w-full"
         >
           {/* Back Link */}
           <Link
             to="/"
             className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
           >
             <ArrowLeft className="w-4 h-4" />
             Voltar ao início
           </Link>
 
           {/* Logo */}
           <div className="flex items-center gap-2 mb-8">
             <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
               <BookOpen className="w-5 h-5 text-white" />
             </div>
             <span className="font-display font-bold text-xl text-foreground">
               English <span className="text-primary">Path</span>
             </span>
           </div>
 
           {/* Header */}
           <h1 className="text-3xl font-display font-bold text-foreground mb-2">
             Bem-vindo de volta!
           </h1>
           <p className="text-muted-foreground mb-8">
             Entre na sua conta para continuar aprendendo
           </p>
 
           {/* Form */}
           <form onSubmit={handleSubmit} className="space-y-6">
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
                   placeholder="••••••••"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="pl-10 pr-10 h-12"
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
 
             <div className="flex items-center justify-between">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" className="rounded border-border" />
                 <span className="text-sm text-muted-foreground">Lembrar de mim</span>
               </label>
               <Link
                 to="/forgot-password"
                 className="text-sm text-primary hover:underline"
               >
                 Esqueci a senha
               </Link>
             </div>
 
             <Button
               type="submit"
               variant="hero"
               size="lg"
               className="w-full"
               disabled={isLoading}
             >
               {isLoading ? "Entrando..." : "Entrar"}
             </Button>
           </form>
 
           <p className="text-center text-sm text-muted-foreground mt-8">
             Não tem uma conta?{" "}
             <Link to="/register" className="text-primary font-medium hover:underline">
               Cadastre-se grátis
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
             Continue sua jornada
           </h2>
           <p className="text-white/80 text-lg max-w-md">
             Cada dia de prática te aproxima mais da fluência. Vamos continuar!
           </p>
         </motion.div>
       </div>
     </div>
   );
 }