
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Palette, History } from 'lucide-react';
import Image from 'next/image';
import { defaultAvatarUrl } from '@/data/initial-game-data';
import type { GameTone, ToneSettings, GameEra } from '@/lib/types';
import { AVAILABLE_TONES, AVAILABLE_ERAS } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { generatePlayerAvatar } from '@/ai/flows/generate-player-avatar-flow';
import { predefinedLocationsByCountry, countries } from '@/data/locations';
import { ScrollArea } from './ui/scroll-area';

// The full data structure passed up on form submission
export interface FullCharacterFormData {
  name: string;
  age: number;
  gender: string;
  origin: string; // This will be the country
  startingLocation: string;
  background: string;
  avatarUrl: string;
  toneSettings: ToneSettings;
  era: GameEra;
}

interface CharacterCreationFormProps {
  onCharacterCreate: (playerData: FullCharacterFormData) => void;
  isSubmitting: boolean;
}

const CharacterCreationForm: React.FC<CharacterCreationFormProps> = ({ onCharacterCreate, isSubmitting }) => {
  // Form state
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | string>(25);
  const [gender, setGender] = useState('Préfère ne pas préciser');
  const [origin, setOrigin] = useState(countries[0]); // Default to the first country
  const [startingLocation, setStartingLocation] = useState(predefinedLocationsByCountry[countries[0]][0]);
  const [era, setEra] = useState<GameEra>('Époque Contemporaine');
  const [background, setBackground] = useState('');
  const [error, setError] = useState('');
  const [toneSettings, setToneSettings] = useState<ToneSettings>(
    AVAILABLE_TONES.reduce((acc, tone) => ({ ...acc, [tone]: false }), {})
  );

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatarUrl);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const { toast } = useToast();

  // Update city options when country changes
  useEffect(() => {
    setStartingLocation(predefinedLocationsByCountry[origin][0]);
  }, [origin]);

  const handleToneSwitchChange = (tone: GameTone, checked: boolean) => {
    setToneSettings(prev => ({ ...prev, [tone]: checked }));
  };

  const handleGenerateAvatar = async () => {
    if (!name || !background) {
        toast({
            variant: 'destructive',
            title: "Informations manquantes",
            description: "Veuillez renseigner le nom et l'historique du personnage avant de générer l'avatar.",
        });
        return;
    }
    setIsGeneratingAvatar(true);
    try {
        const result = await generatePlayerAvatar({
            name,
            gender,
            age: Number(age),
            origin,
            playerBackground: background,
            era,
        });
        if (result.imageUrl) {
            setAvatarUrl(result.imageUrl);
            toast({ title: "Avatar généré avec succès !" });
        } else {
            throw new Error(result.error || "L'IA n'a pas pu générer l'image.");
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Erreur de génération d'avatar", description: e.message });
    } finally {
        setIsGeneratingAvatar(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name || !age || !origin || !startingLocation || !background) {
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
      gender,
      origin,
      startingLocation,
      background,
      avatarUrl,
      toneSettings,
      era,
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-3xl text-primary">Créez Votre Personnage</CardTitle>
        <CardDescription>Donnez vie à votre avatar pour commencer votre aventure.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <ScrollArea className="max-h-[70vh] p-1">
        <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Left Column: Avatar and Basic Info */}
            <div className="space-y-4 md:col-span-1">
                <div className="flex flex-col items-center mb-4">
                    <Image src={avatarUrl} alt="Avatar du personnage" width={128} height={128} className="rounded-full border-2 border-primary aspect-square object-cover" data-ai-hint="character portrait" unoptimized={avatarUrl.startsWith('data:')}/>
                    <Button type="button" size="sm" onClick={handleGenerateAvatar} disabled={isGeneratingAvatar || isSubmitting} className="mt-3">
                        {isGeneratingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Générer Avatar IA
                    </Button>
                </div>
                 <div>
                    <Label htmlFor="name">Nom du Personnage</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Alex Dubois" disabled={isSubmitting} />
                </div>
                 <div>
                    <Label htmlFor="age">Âge</Label>
                    <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Ex: 28" disabled={isSubmitting} />
                </div>
                 <div>
                    <Label htmlFor="gender">Genre</Label>
                    <Select value={gender} onValueChange={setGender} disabled={isSubmitting}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Homme">Homme</SelectItem>
                            <SelectItem value="Femme">Femme</SelectItem>
                            <SelectItem value="Non-binaire">Non-binaire</SelectItem>
                            <SelectItem value="Préfère ne pas préciser">Préfère ne pas préciser</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
            </div>
            
            {/* Right Column: Location, Background, Tones */}
            <div className="space-y-4 md:col-span-1">
                <div>
                    <Label htmlFor="era" className="flex items-center"><History className="w-4 h-4 mr-2"/> Époque de Départ</Label>
                    <Select value={era} onValueChange={(value) => setEra(value as GameEra)} disabled={isSubmitting}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {AVAILABLE_ERAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="origin">Pays d'Origine</Label>
                    <Select value={origin} onValueChange={setOrigin} disabled={isSubmitting}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><ScrollArea className="h-48">{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</ScrollArea></SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="startingLocation">Lieu de Départ</Label>
                    <Select value={startingLocation} onValueChange={setStartingLocation} disabled={isSubmitting}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><ScrollArea className="h-48">{predefinedLocationsByCountry[origin].map(loc => <SelectItem key={loc} value={loc}>{loc.split(',')[0]}</SelectItem>)}</ScrollArea></SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="background">Historique du Personnage</Label>
                    <Textarea id="background" value={background} onChange={(e) => setBackground(e.target.value)} placeholder="Décrivez qui est votre personnage, son passé, ses aspirations..." rows={4} disabled={isSubmitting} />
                </div>
                 <div className="pt-2">
                    <Label className="flex items-center text-md mb-2"><Palette className="mr-2 h-4 w-4" /> Tonalité Narrative</Label>
                    <div className="space-y-2">
                      {AVAILABLE_TONES.map(tone => (
                          <div key={tone} className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                              <Label htmlFor={`switch-${tone}`} className="text-sm font-medium">
                                  {tone}
                              </Label>
                              <Switch
                                  id={`switch-${tone}`}
                                  checked={toneSettings[tone] ?? false}
                                  onCheckedChange={(checked) => handleToneSwitchChange(tone, checked)}
                                  disabled={isSubmitting}
                              />
                          </div>
                      ))}
                    </div>
                </div>
            </div>
          {error && <p className="md:col-span-2 text-sm font-medium text-destructive text-center">{error}</p>}
        </CardContent>
        </ScrollArea>
        <CardFooter className="p-5">
          <Button type="submit" className="w-full" variant="default" size="lg" disabled={isSubmitting || isGeneratingAvatar}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création en cours...</> : "Commencer l'Aventure"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default CharacterCreationForm;
