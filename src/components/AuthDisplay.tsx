
"use client";

import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle2, LogOut, LogIn, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthDisplayProps {
  user: User | null;
  loadingAuth: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInAnon: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthDisplay: React.FC<AuthDisplayProps> = ({
  user,
  // loadingAuth, // Not directly used in JSX rendering logic here, but good to have if needed
  signUp,
  signIn,
  signInAnon,
  signOut,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    await signUp(email, password);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  if (user) {
    return (
      <Card className="mb-6 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-primary font-headline">
            <UserCircle2 className="w-8 h-8 mr-3" />
            Bienvenue !
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Connecté en tant que : <span className="font-semibold">{user.isAnonymous ? "Joueur Anonyme" : user.email}</span>
          </p>
          {user.isAnonymous && <p className="text-sm text-muted-foreground">Votre progression est sauvegardée localement.</p>}
        </CardContent>
        <CardFooter>
          <Button onClick={signOut} variant="outline" className="w-full">
            <LogOut className="mr-2" /> Déconnexion
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="mb-6 shadow-xl">
      <CardHeader className="text-center">
        <UserCircle2 className="w-16 h-16 text-primary mx-auto mb-2" />
        <CardTitle className="text-2xl font-headline text-primary">Rejoignez l'Aventure</CardTitle>
        <CardDescription>Créez un compte pour sauvegarder votre progression ou continuez anonymement.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-3">
          <div>
            <Label htmlFor="email-auth">Email</Label>
            <Input 
              id="email-auth" 
              type="email" 
              placeholder="votreadresse@email.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="mt-1"
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
            />
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-2">
            <Button onClick={handleSignIn} type="submit" className="flex-1">
              <LogIn className="mr-2" /> Se Connecter
            </Button>
            <Button onClick={handleSignUp} type="button" variant="secondary" className="flex-1">
              <UserPlus className="mr-2" /> S'inscrire
            </Button>
          </div>
        </form>
        
        <div className="relative flex items-center my-4">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-4 text-muted-foreground text-xs uppercase">Ou</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <Button onClick={signInAnon} variant="outline" className="w-full">
          Continuer en tant qu'anonyme
        </Button>
      </CardContent>
    </Card>
  );
};

export default AuthDisplay;
