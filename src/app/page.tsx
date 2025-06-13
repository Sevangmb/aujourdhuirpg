
"use client";

import React, { useState, useEffect } from 'react';
import CharacterCreationForm from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay';
import type { GameState, Player } from '@/lib/types';
import { loadGameState, saveGameState, clearGameState, getInitialScenario } from '@/lib/game-logic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; 

export default function HomePage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const { user, loadingAuth, signUpWithEmailPassword, signInWithEmailPassword, signInAnonymously, signOutUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const loadedState = loadGameState();
    if (loadedState) {
      setGameState(loadedState);
    } else {
      setGameState({ player: null, currentScenario: null });
    }
    setIsLoadingState(false);
  }, []);

  const handleCharacterCreate = (player: Player) => {
    const firstScenario = getInitialScenario(player);
    const newGameState: GameState = {
      player: {
        ...player,
        // uid: user?.uid 
      },
      currentScenario: firstScenario,
    };
    setGameState(newGameState);
    saveGameState(newGameState);
  };

  const handleRestart = () => {
    clearGameState();
    setGameState({ player: null, currentScenario: null });
  };
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    await signUpWithEmailPassword(email, password);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithEmailPassword(email, password);
  };

  if (loadingAuth || isLoadingState) {
    return (
      <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-xl font-headline">
          {loadingAuth ? "Vérification de l'authentification..." : "Chargement de votre aventure..."}
        </p>
      </main>
    );
  }

  return (
    <main className="flex-grow flex flex-col items-center p-4 md:p-8 bg-background">
      <div className="w-full max-w-4xl">
        <div className="mb-6 p-4 border border-border rounded-lg shadow-md bg-card text-card-foreground">
          {user ? (
            <div className="flex items-center justify-between">
              <div>
                <p>Bienvenue, <span className="font-semibold">{user.isAnonymous ? "Joueur Anonyme" : user.email}</span> !</p>
                {user.isAnonymous && <p className="text-sm text-muted-foreground">Votre progression est sauvegardée localement.</p>}
              </div>
              <Button onClick={signOutUser} variant="outline">Déconnexion</Button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <UserCircle2 className="w-16 h-16 text-primary mb-2" />
              <h2 className="text-2xl font-headline text-primary">Rejoignez l'Aventure</h2>
              <p className="text-center text-muted-foreground">Créez un compte pour sauvegarder votre progression en ligne ou continuez anonymement.</p>
              
              <form className="w-full max-w-sm space-y-3">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="votreadresse@email.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="********" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="mt-1"
                  />
                </div>
                <div className="flex space-x-2 pt-2">
                  <Button onClick={handleSignIn} type="submit" className="flex-1">Se Connecter</Button>
                  <Button onClick={handleSignUp} type="button" variant="secondary" className="flex-1">S'inscrire</Button>
                </div>
              </form>
              
              <div className="relative w-full max-w-sm flex items-center my-4">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-muted-foreground text-xs">OU</span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              <Button onClick={signInAnonymously} variant="outline" className="w-full max-w-sm">
                Continuer en tant qu'anonyme
              </Button>
            </div>
          )}
        </div>

        {gameState && gameState.player && gameState.currentScenario ? (
          <GamePlay initialGameState={gameState} onRestart={handleRestart} />
        ) : (
          <CharacterCreationForm onCharacterCreate={handleCharacterCreate} />
        )}
      </div>
    </main>
  );
}
