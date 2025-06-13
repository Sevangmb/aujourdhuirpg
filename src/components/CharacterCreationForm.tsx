
"use client";

import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Player } from '@/lib/types';
import StatDisplay from './StatDisplay';
import { 
  initialPlayerStats, 
  initialPlayerLocation, 
  initialSkills, 
  initialTraitsMentalStates, 
  initialProgression, 
  initialAlignment,
  initialInventory,
  initialPlayerMoney, // Import initial money
  defaultAvatarUrl
} from '@/lib/game-logic';
import { User, Cake, MapPin as OriginIcon, Drama, Briefcase, Euro } from 'lucide-react'; // Added Euro for money
import Image from 'next/image';
import * as LucideIcons from 'lucide-react'; // Import all icons

const characterSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères." }).max(50, { message: "Le nom ne peut pas dépasser 50 caractères." }),
  gender: z.string().min(1, { message: "Veuillez sélectionner un genre." }),
  age: z.coerce.number().min(15, { message: "L'âge doit être d'au moins 15 ans." }).max(99, { message: "L'âge ne peut pas dépasser 99 ans." }),
  origin: z.string().min(5, { message: "L'origine doit contenir au moins 5 caractères." }).max(200, {message: "L'origine ne peut pas dépasser 200 caractères."}),
  background: z.string().min(10, { message: "L'historique doit contenir au moins 10 caractères." }).max(500, { message: "L'historique ne peut pas dépasser 500 caractères." }),
});

type CharacterFormData = z.infer<typeof characterSchema>;

interface CharacterCreationFormProps {
  onCharacterCreate: (playerData: Omit<Player, 'currentLocation' | 'money'>) => void;
}

const CharacterCreationForm: React.FC<CharacterCreationFormProps> = ({ onCharacterCreate }) => {
  const form = useForm<CharacterFormData>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      name: '',
      gender: '',
      age: 25,
      origin: '',
      background: '',
    },
  });

  const onSubmit: SubmitHandler<CharacterFormData> = (data) => {
    // Note: 'money' will be set by page.tsx or hydratePlayer
    const newPlayerData: Omit<Player, 'currentLocation' | 'money'> = {
      name: data.name,
      gender: data.gender,
      age: data.age,
      avatarUrl: defaultAvatarUrl, 
      origin: data.origin,
      background: data.background,
      stats: { ...initialPlayerStats },
      skills: { ...initialSkills },
      traitsMentalStates: [...initialTraitsMentalStates],
      progression: { ...initialProgression },
      alignment: { ...initialAlignment },
      inventory: [ ...initialInventory ],
    };
    onCharacterCreate(newPlayerData);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
           <Image src={defaultAvatarUrl} alt="Avatar par défaut" width={100} height={100} className="rounded-full border-2 border-primary" data-ai-hint="character portrait"/>
        </div>
        <CardTitle className="font-headline text-3xl text-primary">Créez Votre Personnage</CardTitle>
        <CardDescription>Donnez vie à votre avatar pour l'aventure d'aujourd'hui.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><User className="w-4 h-4 mr-2" />Nom du Personnage</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Alex Dubois" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Drama className="w-4 h-4 mr-2" />Genre</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un genre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Homme">Homme</SelectItem>
                        <SelectItem value="Femme">Femme</SelectItem>
                        <SelectItem value="Non-binaire">Non-binaire</SelectItem>
                        <SelectItem value="Préfère ne pas préciser">Préfère ne pas préciser</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Cake className="w-4 h-4 mr-2" />Âge</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 28" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="origin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><OriginIcon className="w-4 h-4 mr-2" />Origine</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Décrivez brièvement les origines de votre personnage (sociales, géographiques...)" {...field} rows={3} />
                  </FormControl>
                  <FormDescription>Ex: Vient d'une petite ville de Bretagne, passionné(e) de technologie.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="background"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Historique du Personnage (RP)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Décrivez plus en détail qui est votre personnage, son passé, ses aspirations..." {...field} rows={5} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 font-headline text-center text-primary/90">Attributs de Départ</h3>
                <StatDisplay stats={initialPlayerStats} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 font-headline text-center text-primary/90">Compétences Initiales</h3>
                {Object.entries(initialSkills).map(([skill, value]) => (
                  <div key={skill} className="flex justify-between text-sm p-1 bg-muted/30 rounded"><span>{skill}</span><span>{value}</span></div>
                ))}
              </div>
               <div>
                <h3 className="text-lg font-semibold mb-2 font-headline text-center text-primary/90">Traits et Progression</h3>
                <p className="text-sm text-center text-muted-foreground">
                  Traits: {initialTraitsMentalStates.join(', ') || "Aucun pour l'instant"} <br />
                  Niveau: {initialProgression.level}, XP: {initialProgression.xp} <br />
                  Alignement (C/L): {initialAlignment.chaosLawful}, Alignement (B/M): {initialAlignment.goodEvil}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 font-headline text-center text-primary/90 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 mr-2" />Inventaire de Départ
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {initialInventory.map(item => {
                    const IconComponent = (LucideIcons as any)[item.iconName] || LucideIcons.Package;
                    return (
                      <div key={item.id} className="p-2 bg-muted/30 rounded flex items-center">
                        <IconComponent className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span>{item.name} ({item.quantity})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 font-headline text-center text-primary/90 flex items-center justify-center">
                  <Euro className="w-5 h-5 mr-2" />Argent de Départ
                </h3>
                <p className="text-center text-lg font-bold text-accent">{initialPlayerMoney} €</p>
              </div>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              Votre aventure commencera à {initialPlayerLocation.placeName}.
            </p>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" variant="default" size="lg">
              Commencer l'Aventure
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default CharacterCreationForm;
