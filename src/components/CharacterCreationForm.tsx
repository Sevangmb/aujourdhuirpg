
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { defaultAvatarUrl } from '@/data/initial-game-data';

// Simplified data structure passed up
export interface SimpleCharacterFormData {
  name: string;
  age: number;
  startingLocation: string;
  background: string;
}

interface CharacterCreationFormProps {
  onCharacterCreate: (playerData: SimpleCharacterFormData) => void;
  isSubmitting: boolean;
}

const predefinedLocations = [
    "Montmartre, Paris",
    "Le Quartier Latin, Paris",
    "Le Marais, Paris",
    "La Tour Eiffel, Paris",
    "Le Vieux-Port, Marseille",
    "La Place Bellecour, Lyon"
];

const CharacterCreationForm: React.FC<CharacterCreationFormProps> = ({ onCharacterCreate, isSubmitting }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | string>(25);
  const [startingLocation, setStartingLocation] = useState(predefinedLocations[0]);
  const [background, setBackground] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name || !age || !startingLocation || !background) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    if (Number(age) < 15 || Number(age) > 99) {
      setError("L'âge doit être compris entre 15 et 99 ans.");
      return;
    }
    setError('');

    onCharacterCreate({
      name,
      age: Number(age),
      startingLocation,
      background,
    });
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-2xl">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
           <Image src={defaultAvatarUrl} alt="Avatar par défaut" width={100} height={100} className="rounded-full border-2 border-primary" data-ai-hint="avatar placeholder" />
        </div>
        <CardTitle className="font-headline text-3xl text-primary">Créez Votre Personnage</CardTitle>
        <CardDescription>Donnez vie à votre avatar pour commencer votre aventure.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nom du Personnage</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Alex Dubois" disabled={isSubmitting} />
          </div>

          <div>
            <Label htmlFor="age">Âge</Label>
            <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Ex: 28" disabled={isSubmitting} />
          </div>

          <div>
             <Label htmlFor="startingLocation">Lieu de Départ</Label>
             <Select value={startingLocation} onValueChange={setStartingLocation} disabled={isSubmitting}>
                <SelectTrigger id="startingLocation">
                    <SelectValue placeholder="Choisissez un lieu..." />
                </SelectTrigger>
                <SelectContent>
                    {predefinedLocations.map(loc => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                </SelectContent>
             </Select>
          </div>
          
          <div>
            <Label htmlFor="background">Historique du Personnage</Label>
            <Textarea id="background" value={background} onChange={(e) => setBackground(e.target.value)} placeholder="Décrivez qui est votre personnage, son passé, ses aspirations..." rows={4} disabled={isSubmitting} />
          </div>
          
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" variant="default" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              "Commencer l'Aventure"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default CharacterCreationForm;
