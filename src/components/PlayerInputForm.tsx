
"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Eye, Search, Hotel } from 'lucide-react';

interface PlayerInputFormProps {
  playerInput: string;
  onPlayerInputChange: (value: string) => void;
  onSubmit: (actionText: string) => void;
  isLoading: boolean;
}

const PlayerInputForm: React.FC<PlayerInputFormProps> = ({
  playerInput,
  onPlayerInputChange,
  onSubmit,
  isLoading,
}) => {

  const handleQuickAction = (actionText: string) => {
    if (isLoading) return;
    onSubmit(actionText);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading || playerInput.trim() === "") return;
    onSubmit(playerInput);
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={() => handleQuickAction("Observer les alentours")} disabled={isLoading}>
          <Eye className="mr-2 h-4 w-4" /> Observer
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleQuickAction("Chercher des objets ou indices intéressants")} disabled={isLoading}>
          <Search className="mr-2 h-4 w-4" /> Chercher
        </Button>
         <Button variant="outline" size="sm" onClick={() => handleQuickAction("Se reposer et reprendre de l'énergie")} disabled={isLoading}>
          <Hotel className="mr-2 h-4 w-4" /> Se reposer
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <Input
          id="playerActionInput"
          type="text"
          value={playerInput}
          onChange={(e) => onPlayerInputChange(e.target.value)}
          placeholder="Que faites-vous ensuite ?"
          className="w-full"
          disabled={isLoading}
          aria-label="Action du joueur"
        />
        <Button type="submit" disabled={isLoading || playerInput.trim() === ""} className="bg-primary hover:bg-primary/90">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Envoyer
        </Button>
      </form>
    </div>
  );
};

export default PlayerInputForm;
