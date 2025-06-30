
"use client";

import React, { useState, useEffect } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { CharacterSummary } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { PlusCircle, Trash2, Loader2, Save, User, MapPin, Clock, Star, History } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { defaultAvatarUrl } from '@/data/initial-game-data';
import { listSavesForCharacter, type SaveSummary } from '@/services/firestore-service';
import { ScrollArea } from './ui/scroll-area';
import { formatGameTime } from '@/lib/utils/time-utils';
import CharacterCreationForm, { FullCharacterFormData } from './CharacterCreationForm';

type ViewMode = 'list' | 'create';

interface CharacterSelectionScreenProps {
  user: FirebaseUser;
  characters: CharacterSummary[];
  onSelectCharacterAndSave: (characterId: string, saveId: string) => void;
  onCharacterCreate: (data: FullCharacterFormData) => void;
  onDeleteCharacter: (characterId: string) => void;
  isDeleting: string | null;
}

export const CharacterSelectionScreen: React.FC<CharacterSelectionScreenProps> = ({
  user,
  characters,
  onSelectCharacterAndSave,
  onCharacterCreate,
  onDeleteCharacter,
  isDeleting,
}) => {
  const [view, setView] = useState<ViewMode>('list');
  const [isSavesModalOpen, setIsSavesModalOpen] = useState(false);
  const [saves, setSaves] = useState<SaveSummary[]>([]);
  const [selectedCharForSaves, setSelectedCharForSaves] = useState<CharacterSummary | null>(null);
  const [isLoadingSaves, setIsLoadingSaves] = useState(false);
  const [isSubmittingCreation, setIsSubmittingCreation] = useState(false);

  useEffect(() => {
    // If there are no characters, automatically switch to creation view.
    // Otherwise, show the list.
    if (characters.length === 0) {
      setView('create');
    } else {
      setView('list');
    }
  }, [characters]);

  const handleShowSaves = async (character: CharacterSummary) => {
    if (!user) return;
    setIsLoadingSaves(true);
    setSelectedCharForSaves(character);
    setIsSavesModalOpen(true);
    try {
      const savesList = await listSavesForCharacter(user.uid, character.id);
      setSaves(savesList);
    } catch (error) {
      console.error("Failed to load saves:", error);
      setSaves([]);
    } finally {
      setIsLoadingSaves(false);
    }
  };

  const handleLoadSave = (saveId: string) => {
    if (selectedCharForSaves) {
      onSelectCharacterAndSave(selectedCharForSaves.id, saveId);
      setIsSavesModalOpen(false);
    }
  };
  
  const handleCreate = async (data: FullCharacterFormData) => {
    setIsSubmittingCreation(true);
    await onCharacterCreate(data);
    setIsSubmittingCreation(false);
  };
  
  if (view === 'create') {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto bg-background min-h-screen">
        <CharacterCreationForm 
          onCharacterCreate={handleCreate} 
          isSubmitting={isSubmittingCreation}
        />
      </main>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-headline text-primary">Choisissez votre Destin</h1>
          <p className="text-muted-foreground mt-2">Sélectionnez un personnage pour continuer votre aventure ou en commencer une nouvelle.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl w-full">
          {characters.map(char => (
            <Card key={char.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-primary/20 hover:scale-105 transition-all duration-300 bg-card">
              <CardHeader className="p-0 relative">
                <Image
                  src={char.avatarUrl || defaultAvatarUrl}
                  alt={`Avatar de ${char.name}`}
                  width={300}
                  height={300}
                  className="w-full h-48 object-cover"
                  unoptimized={!!char.avatarUrl && char.avatarUrl.startsWith('data:')}
                  data-ai-hint="character portrait"
                />
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                <h3 className="text-lg font-headline">{char.name}</h3>
                <p className="text-sm text-muted-foreground">Niveau {char.level}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Dernière partie : {new Date(char.lastPlayed).toLocaleString('fr-FR')}
                </p>
              </CardContent>
              <CardFooter className="p-2 bg-muted/50 flex justify-between items-center gap-1">
                <Button onClick={() => handleShowSaves(char)} className="flex-grow">Jouer</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon" disabled={isDeleting === char.id}>
                      {isDeleting === char.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Le personnage "{char.name}" et toutes ses sauvegardes seront supprimés définitivement.
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
            onClick={() => setView('create')}
            className="flex flex-col items-center justify-center border-2 border-dashed hover:border-primary hover:text-primary cursor-pointer transition-colors duration-200 min-h-[340px] bg-card/50"
          >
            <PlusCircle className="w-16 h-16 text-muted-foreground group-hover:text-primary" />
            <p className="mt-4 font-semibold">Nouveau Personnage</p>
          </Card>
        </div>
      </div>

      <Dialog open={isSavesModalOpen} onOpenChange={setIsSavesModalOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Charger une partie pour {selectedCharForSaves?.name}</DialogTitle>
                <DialogDescription>
                    Choisissez un point de sauvegarde pour continuer votre aventure.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] -mx-6 px-6">
              <div className="space-y-3 py-4">
                {isLoadingSaves ? (
                  <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : saves.length > 0 ? (
                  saves.map(save => {
                      let Icon = Save;
                      let label = 'Sauvegarde Manuelle';
                      let iconColor = 'text-primary';

                      if (save.type === 'auto') {
                          Icon = History;
                          label = 'Sauvegarde Auto';
                          iconColor = 'text-muted-foreground';
                      } else if (save.type === 'checkpoint') {
                          Icon = Star;
                          label = 'Point de Contrôle';
                          iconColor = 'text-yellow-500';
                      }

                      return (
                        <Button
                          key={save.id}
                          variant="outline"
                          className="w-full flex justify-between items-center h-auto p-3 text-left"
                          onClick={() => handleLoadSave(save.id)}
                        >
                          <div className="flex items-center gap-4">
                              <Icon className={`w-8 h-8 ${iconColor} shrink-0`} />
                              <div className="flex-grow">
                                  <p className="font-semibold capitalize">{label}</p>
                                  {save.aiSummary && <p className="text-sm font-normal text-foreground italic my-1">"{save.aiSummary}"</p>}
                                  <p className="text-xs text-muted-foreground">{new Date(save.timestamp).toLocaleString('fr-FR')}</p>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-2 text-muted-foreground">
                                      <span className="flex items-center gap-1"><User className="w-3 h-3"/>Niv. {save.level}</span>
                                      <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3"/>{save.locationName}</span>
                                      <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{formatGameTime(save.playTimeInMinutes)}</span>
                                  </div>
                              </div>
                          </div>
                        </Button>
                      );
                  })
                ) : (
                  <p className="text-center text-muted-foreground p-8">Aucune sauvegarde trouvée pour ce personnage.</p>
                )}
              </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
