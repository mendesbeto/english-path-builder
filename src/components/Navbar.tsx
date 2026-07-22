 import { useState } from "react";
 import { Link, useLocation } from "react-router-dom";
 import { motion } from "framer-motion";
 import { Menu, X, BookOpen, User, LogOut } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { cn } from "@/lib/utils";
 
 interface NavbarProps {
   isLoggedIn?: boolean;
   userName?: string;
 }
 
 export function Navbar({ isLoggedIn = false, userName = "Estudante" }: NavbarProps) {
   const [isMenuOpen, setIsMenuOpen] = useState(false);
   const location = useLocation();
 
   const navLinks = isLoggedIn
     ? [
         { href: "/dashboard", label: "Dashboard" },
         { href: "/levels", label: "Níveis" },
         { href: "/progress", label: "Progresso" },
       ]
     : [
         { href: "#features", label: "Recursos" },
         { href: "#levels", label: "Níveis" },
         { href: "#about", label: "Sobre" },
       ];
 
   return (
     <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
       <div className="container mx-auto px-4">
         <div className="flex items-center justify-between h-16">
           {/* Logo */}
           <Link to="/" className="flex items-center gap-2">
             <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
               <BookOpen className="w-5 h-5 text-white" />
             </div>
              <span className="font-display font-bold text-xl text-foreground">
                Inglês <span className="text-primary">Hope</span>
              </span>
           </Link>
 
           {/* Desktop Navigation */}
           <div className="hidden md:flex items-center gap-8">
             {navLinks.map((link) => (
               <Link
                 key={link.href}
                 to={link.href}
                 className={cn(
                   "text-sm font-medium transition-colors hover:text-primary",
                   location.pathname === link.href
                     ? "text-primary"
                     : "text-muted-foreground"
                 )}
               >
                 {link.label}
               </Link>
             ))}
           </div>
 
           {/* Desktop Auth */}
           <div className="hidden md:flex items-center gap-4">
             {isLoggedIn ? (
               <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                     <User className="w-4 h-4 text-primary-foreground" />
                   </div>
                   <span className="text-sm font-medium text-foreground">{userName}</span>
                 </div>
                 <Button variant="ghost" size="sm">
                   <LogOut className="w-4 h-4" />
                 </Button>
               </div>
             ) : (
               <>
                 <Link to="/login">
                   <Button variant="ghost">Entrar</Button>
                 </Link>
                 <Link to="/register">
                   <Button variant="hero">Começar Grátis</Button>
                 </Link>
               </>
             )}
           </div>
 
           {/* Mobile Menu Button */}
           <button
             className="md:hidden p-2"
             onClick={() => setIsMenuOpen(!isMenuOpen)}
           >
             {isMenuOpen ? (
               <X className="w-6 h-6 text-foreground" />
             ) : (
               <Menu className="w-6 h-6 text-foreground" />
             )}
           </button>
         </div>
 
         {/* Mobile Menu */}
         {isMenuOpen && (
           <motion.div
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             className="md:hidden py-4 border-t border-border"
           >
             <div className="flex flex-col gap-4">
               {navLinks.map((link) => (
                 <Link
                   key={link.href}
                   to={link.href}
                   className="text-sm font-medium text-muted-foreground hover:text-primary"
                   onClick={() => setIsMenuOpen(false)}
                 >
                   {link.label}
                 </Link>
               ))}
               <div className="flex flex-col gap-2 pt-4 border-t border-border">
                 {isLoggedIn ? (
                   <Button variant="ghost" className="justify-start">
                     <LogOut className="w-4 h-4 mr-2" />
                     Sair
                   </Button>
                 ) : (
                   <>
                     <Link to="/login">
                       <Button variant="ghost" className="w-full">Entrar</Button>
                     </Link>
                     <Link to="/register">
                       <Button variant="hero" className="w-full">Começar Grátis</Button>
                     </Link>
                   </>
                 )}
               </div>
             </div>
           </motion.div>
         )}
       </div>
     </nav>
   );
 }