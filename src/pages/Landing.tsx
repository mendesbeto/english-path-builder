 import { motion } from "framer-motion";
 import { Link } from "react-router-dom";
 import { 
   BookOpen, 
   GraduationCap, 
   Trophy, 
   Users, 
   CheckCircle, 
   ArrowRight,
   Sparkles,
   Globe,
   Target,
   Award
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Navbar } from "@/components/Navbar";
 import { LevelCard } from "@/components/LevelCard";
import heroImage from "@/assets/hero-illustration.png";
 
 const features = [
   {
     icon: GraduationCap,
     title: "Metodologia CEFR",
     description: "Aprenda com a estrutura europeia de níveis, do A1 ao C2",
   },
   {
     icon: Trophy,
     title: "Gamificação",
     description: "Conquiste badges, pontos e certificados ao progredir",
   },
   {
     icon: Users,
     title: "Turmas Interativas",
     description: "Professores acompanham e dão feedback personalizado",
   },
   {
     icon: Target,
     title: "Conteúdo Diversificado",
     description: "Vídeos, áudios, quizzes e exercícios de pronúncia",
   },
 ];
 
 const levels = [
   { level: "A1" as const, title: "Primeiros Passos", description: "Alfabeto, cumprimentos, verb to be e vocabulário básico", progress: 0 },
   { level: "A2" as const, title: "Fundamentos", description: "Simple Present, rotina diária e pequenos diálogos", progress: 0 },
   { level: "B1" as const, title: "Conversação", description: "Simple Past, Future e textos sobre viagem e trabalho", progress: 0 },
   { level: "B2" as const, title: "Fluência", description: "Present Perfect, Passive Voice e debates", progress: 0 },
   { level: "C1" as const, title: "Domínio", description: "Phrasal verbs, Academic English e escrita formal", progress: 0 },
   { level: "C2" as const, title: "Proficiência", description: "Inglês nativo, expressões idiomáticas e análise crítica", progress: 0 },
 ];
 
 const stats = [
   { value: "10.000+", label: "Estudantes" },
   { value: "6", label: "Níveis CEFR" },
   { value: "500+", label: "Aulas" },
   { value: "95%", label: "Satisfação" },
 ];
 
 export default function Landing() {
   return (
     <div className="min-h-screen bg-background">
       <Navbar />
       
       {/* Hero Section */}
       <section className="pt-24 pb-16 md:pt-32 md:pb-24 relative overflow-hidden">
         {/* Background decoration */}
         <div className="absolute inset-0 -z-10">
           <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
           <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
         </div>
 
         <div className="container mx-auto px-4">
           <div className="max-w-4xl mx-auto text-center">
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6 }}
             >
               <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                 <Sparkles className="w-4 h-4" />
                 <span>Nova plataforma de aprendizado</span>
               </div>
               
               <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-extrabold text-foreground mb-6 leading-tight">
                 Seu caminho para a{" "}
                 <span className="text-gradient">fluência em inglês</span>
               </h1>
               
               <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                 Aprenda inglês do zero à proficiência com nossa metodologia baseada no CEFR. 
                 Aulas interativas, gamificação e acompanhamento personalizado.
               </p>
               
               <div className="flex flex-col sm:flex-row gap-4 justify-center">
                 <Link to="/register">
                   <Button variant="hero" size="xl">
                     Começar Grátis
                     <ArrowRight className="w-5 h-5" />
                   </Button>
                 </Link>
                 <Link to="/login">
                   <Button variant="outline" size="xl">
                     Já tenho conta
                   </Button>
                 </Link>
               </div>
             </motion.div>
 
             {/* Stats */}
             <motion.div
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.3 }}
               className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-8 border-t border-border"
             >
               {stats.map((stat, index) => (
                 <div key={index} className="text-center">
                   <div className="text-3xl md:text-4xl font-display font-bold text-primary mb-1">
                     {stat.value}
                   </div>
                   <div className="text-sm text-muted-foreground">{stat.label}</div>
                 </div>
               ))}
             </motion.div>

            {/* Hero Image */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-12"
            >
              <img 
                src={heroImage} 
                alt="Estudantes aprendendo inglês juntos"
                className="w-full max-w-4xl mx-auto rounded-2xl shadow-2xl"
              />
            </motion.div>
           </div>
         </div>
       </section>
 
       {/* Features Section */}
       <section id="features" className="py-16 md:py-24 bg-muted/30">
         <div className="container mx-auto px-4">
           <motion.div
             initial={{ opacity: 0 }}
             whileInView={{ opacity: 1 }}
             viewport={{ once: true }}
             className="text-center mb-12"
           >
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Por que escolher o Inglês Hope?
              </h2>
             <p className="text-muted-foreground max-w-2xl mx-auto">
               Uma plataforma completa para você dominar o inglês
             </p>
           </motion.div>
 
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {features.map((feature, index) => (
               <motion.div
                 key={index}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: index * 0.1 }}
                 className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300"
               >
                 <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                   <feature.icon className="w-6 h-6 text-primary" />
                 </div>
                 <h3 className="text-lg font-display font-bold text-foreground mb-2">
                   {feature.title}
                 </h3>
                 <p className="text-sm text-muted-foreground">
                   {feature.description}
                 </p>
               </motion.div>
             ))}
           </div>
         </div>
       </section>
 
       {/* Levels Section */}
       <section id="levels" className="py-16 md:py-24">
         <div className="container mx-auto px-4">
           <motion.div
             initial={{ opacity: 0 }}
             whileInView={{ opacity: 1 }}
             viewport={{ once: true }}
             className="text-center mb-12"
           >
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
               <Globe className="w-4 h-4" />
               <span>Padrão Internacional CEFR</span>
             </div>
             <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
               6 Níveis de Proficiência
             </h2>
             <p className="text-muted-foreground max-w-2xl mx-auto">
               Progrida do iniciante ao fluente com nosso currículo estruturado
             </p>
           </motion.div>
 
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {levels.map((level, index) => (
               <motion.div
                 key={level.level}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: index * 0.1 }}
               >
                 <LevelCard {...level} isLocked={index > 0} />
               </motion.div>
             ))}
           </div>
         </div>
       </section>
 
       {/* CTA Section */}
       <section className="py-16 md:py-24 bg-gradient-hero relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
         <div className="container mx-auto px-4 relative">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="max-w-3xl mx-auto text-center"
           >
             <Award className="w-16 h-16 text-white/80 mx-auto mb-6" />
             <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
               Pronto para começar sua jornada?
             </h2>
             <p className="text-white/80 text-lg mb-8">
               Junte-se a milhares de estudantes e alcance a fluência em inglês
             </p>
             <Link to="/register">
               <Button 
                 size="xl" 
                 className="bg-white text-primary hover:bg-white/90 shadow-xl"
               >
                 Criar Conta Gratuita
                 <ArrowRight className="w-5 h-5" />
               </Button>
             </Link>
           </motion.div>
         </div>
       </section>
 
       {/* Footer */}
       <footer className="py-12 border-t border-border">
         <div className="container mx-auto px-4">
           <div className="flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
                 <BookOpen className="w-4 h-4 text-white" />
               </div>
                <span className="font-display font-bold text-foreground">
                  Inglês Hope
                </span>
             </div>
              <p className="text-sm text-muted-foreground">
                © 2024 Inglês Hope. Projeto Acadêmico.
              </p>
           </div>
         </div>
       </footer>
     </div>
   );
 }