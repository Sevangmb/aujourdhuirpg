
"use client";

import React from 'react';
import type { CharacterSummary } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { PlusCircle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface CharacterSelectionScreenProps {
  characters: CharacterSummary[];
  onSelectCharacter: (characterId: string) => void;
  onCreateNew: () => void;
  onDeleteCharacter: (characterId: string) => void;
  isDeleting: string | null; // ID of the character being deleted
}

export const CharacterSelectionScreen: React.FC<CharacterSelectionScreenProps> = ({
  characters,
  onSelectCharacter,
  onCreateNew,
  onDeleteCharacter,
  isDeleting
}) => {
  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold font-headline text-primary">Choisissez votre Destin</h1>
        <p className="text-muted-foreground mt-2">Sélectionnez un personnage pour continuer votre aventure ou en commencer une nouvelle.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl w-full">
        {characters.map(char => (
          <Card key={char.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-primary/20 hover:scale-105 transition-all duration-300">
            <CardHeader className="p-0 relative">
              <Image
                src={char.avatarUrl}
                alt={`Avatar de ${char.name}`}
                width={300}
                height={300}
                className="w-full h-48 object-cover"
                unoptimized={char.avatarUrl.startsWith('data:')}
                data-ai-hint="character portrait"
              />
            </CardHeader>
            <CardContent className="p-4 flex-grow">
              <CardTitle className="text-lg font-headline">{char.name}</CardTitle>
              <CardDescription>Niveau {char.level}</CardDescription>
              <p className="text-xs text-muted-foreground mt-2">
                Dernière partie : {new Date(char.lastPlayed).toLocaleString('fr-FR')}
              </p>
            </CardContent>
            <CardFooter className="p-2 bg-muted/50 flex justify-between items-center gap-1">
              <Button onClick={() => onSelectCharacter(char.id)} className="flex-grow">Jouer</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" disabled={isDeleting === char.id}>
                    {isDeleting === char.id ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Le personnage "{char.name}" sera supprimé définitivement.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDeleteCharacter(char.id)} className="bg-destructive hover:bg-destructive/90">
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        ))}
        <Card
          onClick={onCreateNew}
          className="flex flex-col items-center justify-center border-2 border-dashed hover:border-primary hover:text-primary cursor-pointer transition-colors duration-200 min-h-[340px]"
        >
          <PlusCircle className="w-16 h-16 text-muted-foreground group-hover:text-primary" />
          <p className="mt-4 font-semibold">Nouveau Personnage</p>
        </Card>
      </div>
    </div>
  );
};
