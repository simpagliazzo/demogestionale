import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plane } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [updatePasswordMode, setUpdatePasswordMode] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Controlla se l'utente arriva da un link di recupero password
    const checkRecoveryToken = async () => {
      // Supabase gestisce automaticamente il token dall'URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (type === 'recovery' && accessToken) {
        setUpdatePasswordMode(true);
        toast.info("Inserisci la tua nuova password");
      }
    };
    
    checkRecoveryToken();
  }, []);

  useEffect(() => {
    // Non reindirizzare se siamo in modalità aggiornamento password
    if (user && !updatePasswordMode) {
      navigate("/");
    }
  }, [user, navigate, updatePasswordMode]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      toast.success("Registrazione completata! Puoi ora accedere.");
      setEmail("");
      setPassword("");
      setFullName("");
    } catch (error: any) {
      console.error("Errore durante la registrazione:", error);
      toast.error(error.message || "Errore durante la registrazione");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Accesso effettuato!");
      navigate("/");
    } catch (error: any) {
      console.error("Errore durante l'accesso:", error);
      toast.error(error.message || "Errore durante l'accesso");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Inserisci la tua email");
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast.success("Email di recupero inviata! Controlla la tua casella di posta.");
      setResetMode(false);
    } catch (error: any) {
      console.error("Errore durante il recupero password:", error);
      toast.error(error.message || "Errore durante il recupero password");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Le password non corrispondono");
      return;
    }
    
    if (password.length < 6) {
      toast.error("La password deve essere di almeno 6 caratteri");
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success("Password aggiornata con successo!");
      setUpdatePasswordMode(false);
      setPassword("");
      setConfirmPassword("");
      
      // Pulisci l'URL dal token
      window.history.replaceState({}, document.title, window.location.pathname);
      
      navigate("/");
    } catch (error: any) {
      console.error("Errore durante l'aggiornamento della password:", error);
      toast.error(error.message || "Errore durante l'aggiornamento della password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-secondary to-accent p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-elegant mb-4">
            <Plane className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            TravelManager
          </h1>
          <p className="text-white/80">Gestionale per Agenzia Viaggi</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader>
            <CardTitle>
              {updatePasswordMode ? "Reimposta Password" : "Benvenuto"}
            </CardTitle>
            <CardDescription>
              {updatePasswordMode 
                ? "Inserisci la tua nuova password" 
                : "Accedi al tuo account o registrati per iniziare"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {updatePasswordMode ? (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nuova Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Conferma Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  La password deve essere di almeno 6 caratteri.
                </p>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Aggiornamento..." : "Aggiorna Password"}
                </Button>
              </form>
            ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Accedi</TabsTrigger>
                <TabsTrigger value="signup">Registrati</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                {resetMode ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="tua@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Inserisci la tua email e riceverai un link per reimpostare la password.
                    </p>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Invio in corso..." : "Invia email di recupero"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setResetMode(false)}
                    >
                      Torna al login
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="tua@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Caricamento..." : "Accedi"}
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="w-full text-sm"
                      onClick={() => setResetMode(true)}
                    >
                      Password dimenticata?
                    </Button>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Mario Rossi"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tua@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Caricamento..." : "Registrati"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
