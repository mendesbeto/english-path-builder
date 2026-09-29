import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Não foi possível enviar o e-mail",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Verifique seu e-mail",
      description: "Se existir uma conta com este endereço, enviaremos um link para redefinir a senha.",
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md mx-auto w-full"
        >
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao login
          </Link>

          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl">
              Inglês <span className="text-primary">Hope</span>
            </span>
          </div>

          <h1 className="text-3xl font-display font-bold mb-2">Esqueci minha senha</h1>
          <p className="text-muted-foreground mb-8">
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Lembrou da senha?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Fazer login
            </Link>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-hero items-center justify-center p-12">
        <div className="text-center text-white">
          <h2 className="text-4xl font-display font-bold mb-4">Recupere seu acesso</h2>
          <p className="text-white/80 text-lg max-w-md">
            Sua jornada de aprendizagem continua.
          </p>
        </div>
      </div>
    </div>
  );
}
