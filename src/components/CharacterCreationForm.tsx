"use client";

import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Player, PlayerStats } from '@/lib/types';
import StatDisplay from './StatDisplay';
import { initialPlayerStats } from '@/lib/game-logic';
import { User } from 'lucide-react';

const characterSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères." }).max(50, { message: "Le nom ne peut pas dépasser 50 caractères." }),
  background: z.string().min(10, { message: "L'historique doit contenir au moins 10 caractères." }).max(500, { message: "L'historique ne peut pas dépasser 500 caractères." }),
});

type CharacterFormData = z.infer<typeof characterSchema>;

interface CharacterCreationFormProps {
  onCharacterCreate: (player: Player) => void;
}

const CharacterCreationForm: React.FC<CharacterCreationFormProps> = ({ onCharacterCreate }) => {
  const form = useForm<CharacterFormData>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      name: '',
      background: '',
    },
  });

  const onSubmit: SubmitHandler<CharacterFormData> = (data) => {
    const newPlayer: Player = {
      name: data.name,
      background: data.background,
      stats: { ...initialPlayerStats },
    };
    onCharacterCreate(newPlayer);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
          <User className="w-12 h-12 text-primary" />
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
                  <FormLabel>Nom du Personnage</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Alex Dubois" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="background"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Historique du Personnage</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Décrivez brièvement qui est votre personnage, son passé, ses aspirations..." {...field} rows={5} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <h3 className="text-lg font-semibold mb-2 font-headline text-center text-primary/90">Statistiques de Départ</h3>
              <StatDisplay stats={initialPlayerStats} />
            </div>
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
