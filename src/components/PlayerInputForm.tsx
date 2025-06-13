
"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';

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
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(playerInput);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex gap-2 items-center">
      <Input
        type="text"
        value={playerInput}
        onChange={(e) => onPlayerInputChange(e.target.value)}
        placeholder="Que faites-vous ensuite ?"
        className="flex-grow"
        disabled={isLoading}
        aria-label="Action du joueur"
      />
      <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Envoyer
      </Button>
    </form>
  );
};

export default PlayerInputForm;
