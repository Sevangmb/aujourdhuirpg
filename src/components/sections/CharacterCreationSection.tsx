
"use client";

import React from 'react';
import CharacterCreationForm from '@/components/CharacterCreationForm';
import type { Player } from '@/lib/types';

interface CharacterCreationSectionProps {
  onCharacterCreate: (playerDataFromForm: Omit<Player, 'currentLocation' | 'uid' | 'stats' | 'skills' | 'traitsMentalStates' | 'progression' | 'alignment' | 'inventory' | 'avatarUrl' | 'questLog' | 'encounteredPNJs' | 'decisionLog' | 'clues' | 'documents' | 'investigationNotes' | 'money' >) => void;
}

const CharacterCreationSection: React.FC<CharacterCreationSectionProps> = ({ onCharacterCreate }) => {
  return (
    <div className="flex-grow flex items-center justify-center p-4">
      <CharacterCreationForm onCharacterCreate={onCharacterCreate} />
    </div>
  );
};

export default CharacterCreationSection;
