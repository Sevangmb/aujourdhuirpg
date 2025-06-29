
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle2, LogOut, LogIn, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthScreenProps {
  loadingAuth: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInAnon: () => Promise<void>;
}

const AuthScreen: React.FC<AuthScreenProps> = ({
  // loadingAuth is available if needed for a spinner
  signUp,
  signIn,
  signInAnon,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningInAnon, setIsSigningInAnon] = useState(false);

  const isLoading = isSigningUp || isSigningIn || isSigningInAnon;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningUp(true);
    await signUp(email, password);
    setIsSigningUp(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
    await signIn(email, password);
    setIsSigningIn(false);
  };

  const handleSignInAnon = async () => {
    setIsSigningInAnon(true);
    await signInAnon();
    setIsSigningInAnon(false);
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <UserCircle2 className="w-16 h-16 text-primary mx-auto mb-2" />
        <CardTitle className="text-2xl font-headline text-primary">Rejoignez l'Aventure</CardTitle>
        <CardDescription>Créez un compte pour sauvegarder votre progression sur tous vos appareils, ou continuez anonymement.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-3" onSubmit={handleSignIn}>
          <div>
            <Label htmlFor="email-auth">Email</Label>
            <Input 
              id="email-auth" 
              type="email" 
              placeholder="votreadresse@email.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="mt-1"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password-auth">Mot de passe</Label>
            <Input 
              id="password-auth" 
              type="password" 
              placeholder="********" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="mt-1"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-2">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isSigningIn && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
              <LogIn className="mr-2" /> Se Connecter
            </Button>
            <Button onClick={handleSignUp} type="button" variant="secondary" className="flex-1" disabled={isLoading}>
              {isSigningUp && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>}
              <UserPlus className="mr-2" /> S'inscrire
            </Button>
          </div>
        </form>
        
        <div className="relative flex items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-4 text-muted-foreground text-xs uppercase">Ou</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

      </CardContent>
      <CardFooter>
         <Button onClick={handleSignInAnon} variant="outline" className="w-full" disabled={isLoading}>
           {isSigningInAnon && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground mr-2"></div>}
          Continuer en tant qu'anonyme
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AuthScreen;
