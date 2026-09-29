import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;

    const handleAuthState = (event: string) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY") {
        setIsRecoverySession(true);
        setCheckingSession(false);
      }
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      handleAuthState(event);
    });

    const initializeRecovery = async () => {
      const hash = window.location.hash;
      const hasRecoveryHash = hash.includes("access_token=") && hash.includes("type=recovery");
      const hashError = new URLSearchParams(hash.replace(/^#/, "")).get("error_description");

      if (hashError) {
        setCheckingSession(false);
        toast({
          title: "Link de recuperação inválido",
          description: "O link não pôde ser validado. Solicite um novo link quando o limite de envio estiver disponível.",
          variant: "destructive",
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!active) return;

      if (session || hasRecoveryHash) {
        setIsRecoverySession(Boolean(session) || hasRecoveryHash);
      } else {
        setIsRecoverySession(false);
      }

      setCheckingSession(false);
    };

    void initializeRecovery();

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha precisa ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "As senhas não coincidem",
        description: "Digite a mesma senha nos dois campos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toast({
        title: "Não foi possível atualizar a senha",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setCompleted(true);
    await supabase.auth.signOut();
    toast({
      title: "Senha atualizada!",
      description: "Sua senha foi alterada. Agora você pode entrar novamente.",
    });
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <p className="text-muted-foreground">Validando o link de recuperação...</p>
      </div>
    );
  }

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

          {completed ? (
            <>
              <h1 className="text-3xl font-display font-bold mb-2">Senha alterada</h1>
              <p className="text-muted-foreground mb-8">Sua nova senha já está ativa.</p>
              <Button variant="hero" size="lg" className="w-full" onClick={() => navigate("/login")}>
                Ir para o login
              </Button>
            </>
          ) : !isRecoverySession ? (
            <>
              <h1 className="text-3xl font-display font-bold mb-2">Link inválido ou expirado</h1>
              <p className="text-muted-foreground mb-8">
                Solicite uma nova recuperação de senha para receber outro link.
              </p>
              <Button variant="hero" size="lg" className="w-full" onClick={() => navigate("/forgot-password")}>
                Solicitar novo link
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-display font-bold mb-2">Criar nova senha</h1>
              <p className="text-muted-foreground mb-8">Escolha uma nova senha para sua conta.</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      className="pl-10 pr-10 h-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      minLength={6}
                      className="pl-10 pr-10 h-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? "Atualizando..." : "Atualizar senha"}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-hero items-center justify-center p-12">
        <div className="text-center text-white">
          <h2 className="text-4xl font-display font-bold mb-4">Uma nova senha, o mesmo caminho</h2>
          <p className="text-white/80 text-lg max-w-md">Volte ao Inglês Hope e continue seu progresso.</p>
        </div>
      </div>
    </div>
  );
}
