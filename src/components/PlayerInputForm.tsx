
"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Brain } from 'lucide-react';

interface PlayerInputFormProps {
  playerInput: string;
  onPlayerInputChange: (value: string) => void;
  onSubmit: (actionText: string) => void;
  isLoading: boolean;
}

const PLAYER_ACTION_REFLECT = "[PLAYER_ACTION_REFLECT_INTERNAL_THOUGHTS]";

const PlayerInputForm: React.FC<PlayerInputFormProps> = ({
  playerInput,
  onPlayerInputChange,
  onSubmit,
  isLoading,
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (playerInput.trim() === "") return; // Prevent submitting empty input
    onSubmit(playerInput);
  };

  const handleReflectClick = () => {
    onSubmit(PLAYER_ACTION_REFLECT);
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
      <Button
        type="button"
        variant="outline"
        onClick={handleReflectClick}
        disabled={isLoading}
        aria-label="Réfléchir"
      >
        {isLoading ? <Loader2 className="mr-0 sm:mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-0 sm:mr-2 h-4 w-4" />}
        <span className="hidden sm:inline">Réfléchir</span>
      </Button>
      <Button type="submit" disabled={isLoading || playerInput.trim() === ""} className="bg-primary hover:bg-primary/90">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Envoyer
      </Button>
    </form>
  );
};

export default PlayerInputForm;
