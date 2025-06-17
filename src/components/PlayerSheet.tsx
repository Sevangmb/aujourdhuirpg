
"use client";

import type { Player } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { User, Shield, Brain as BrainIcon, Sparkles, TrendingUp, Palette, Euro, Zap, CloudFog, Anchor, Users as ReputationIcon, Heart, Smile, Dumbbell } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from './ui/scroll-area';


interface PlayerSheetProps {
  player: Player;
}

const PlayerSheet: React.FC<PlayerSheetProps> = ({ player }) => {
  if (!player) return null;

  const xpPercentage = player.progression.xpToNextLevel > 0 
    ? (player.progression.xp / player.progression.xpToNextLevel) * 100 
    : 0;

  return (
    <Tabs defaultValue="identity" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-2">
          <TabsTrigger value="identity" className="p-2" aria-label="Identité"><User className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="stats" className="p-2" aria-label="Stats"><Shield className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="skills" className="p-2" aria-label="Compétences"><Sparkles className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="traits" className="p-2" aria-label="Traits & États"><BrainIcon className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="progression" className="p-2" aria-label="Progression"><TrendingUp className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="alignment" className="p-2" aria-label="Alignement"><Palette className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="money" className="p-2" aria-label="Argent"><Euro className="w-4 h-4" /></TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="mt-0">
          <Card>
            <CardHeader className="p-3">
              <div className="flex items-center space-x-3">
                <Image 
                  src={player.avatarUrl || 'https://placehold.co/80x80.png'} 
                  alt={`Avatar de ${player.name}`} 
                  width={80} 
                  height={80} 
                  className="rounded-full border-2 border-primary"
                  data-ai-hint="character portrait"
                />
                <div>
                  <CardTitle className="text-xl font-headline text-primary">{player.name}</CardTitle>
                  <CardDescription className="text-xs">{player.age} ans, {player.gender}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-3 text-sm">
              <div>
                <h4 className="font-semibold text-muted-foreground text-xs">Origine</h4>
                <p className="text-xs">{player.origin}</p>
              </div>
              <div>
                <h4 className="font-semibold text-muted-foreground text-xs">Historique (RP)</h4>
                <ScrollArea className="h-24">
                   <p className="whitespace-pre-wrap text-xs">{player.background}</p>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-0">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="font-headline text-primary text-lg">Caractéristiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3 text-sm">
              {Object.entries(player.stats).map(([stat, value]) => {
                let Icon = Zap; 
                if (stat === "Sante") Icon = Heart;
                else if (stat === "Charisme") Icon = Smile;
                else if (stat === "Intelligence") Icon = BrainIcon;
                else if (stat === "Force") Icon = Dumbbell;
                else if (stat === "Energie") Icon = Zap;
                else if (stat === "Stress") Icon = CloudFog;
                else if (stat === "Volonte") Icon = Anchor;
                else if (stat === "Reputation") Icon = ReputationIcon;

                return (
                  <div key={stat} className="flex justify-between items-center p-1.5 bg-muted/30 rounded-md text-xs">
                    <div className="flex items-center">
                      <Icon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                      <span className="font-medium">{stat}</span>
                    </div>
                    <span className="font-bold text-primary">{value}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="mt-0">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="font-headline text-primary text-lg">Compétences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3 text-sm">
              {player.skills && Object.keys(player.skills).length > 0 ? Object.entries(player.skills).map(([skill, value]) => (
                <div key={skill} className="flex justify-between p-1.5 bg-muted/30 rounded-md text-xs">
                  <span className="font-medium">{skill}</span>
                  <span className="font-bold text-primary">{value}</span>
                </div>
              )) : <p className="text-muted-foreground text-xs">Aucune compétence acquise.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traits" className="mt-0">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="font-headline text-primary text-lg">Traits & États</CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-sm">
              {player.traitsMentalStates && player.traitsMentalStates.length > 0 ? (
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  {player.traitsMentalStates.map((trait, index) => (
                    <li key={index}>{trait}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-xs">Aucun trait particulier.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progression" className="mt-0">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="font-headline text-primary text-lg">Progression</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3 text-sm">
              <div>
                <h4 className="font-semibold text-muted-foreground text-xs">Niveau</h4>
                <p className="text-xl font-bold text-primary">{player.progression.level}</p>
              </div>
              <div>
                <div className="flex justify-between items-end mb-0.5">
                    <h4 className="font-semibold text-muted-foreground text-xs">Expérience (XP)</h4>
                    <p className="text-xs text-primary/80">{player.progression.xp} / {player.progression.xpToNextLevel}</p>
                </div>
                <Progress value={xpPercentage} className="w-full h-2.5" />
              </div>
              <div>
                <h4 className="font-semibold text-muted-foreground text-xs">Talents (Perks)</h4>
                {player.progression.perks && player.progression.perks.length > 0 ? (
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    {player.progression.perks.map((perk, index) => (
                      <li key={index}>{perk}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-xs">Aucun talent débloqué.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alignment" className="mt-0">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="font-headline text-primary text-lg">Alignement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 text-sm">
              <div>
                <h4 className="font-semibold text-muted-foreground text-xs">Chaos / Loi</h4>
                <p className="text-md">Valeur : <span className="font-bold text-primary">{player.alignment.chaosLawful}</span></p>
                <p className="text-xs text-muted-foreground">(-100 Chaos, 0 Neutre, 100 Loi)</p>
              </div>
              <div>
                <h4 className="font-semibold text-muted-foreground text-xs">Bien / Mal</h4>
                <p className="text-md">Valeur : <span className="font-bold text-primary">{player.alignment.goodEvil}</span></p>
                <p className="text-xs text-muted-foreground">(-100 Mal, 0 Neutre, 100 Bien)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="money" className="mt-0">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="font-headline text-primary text-lg flex items-center">
                <Euro className="w-4 h-4 mr-1" /> Argent
              </CardTitle>
              <CardDescription className="text-xs pt-1">Votre situation financière actuelle.</CardDescription>
            </CardHeader>
            <CardContent className="p-3 text-sm">
              <p className="text-3xl font-bold text-accent text-center">{player.money} €</p>
              <p className="text-xs text-muted-foreground text-center mt-1">Gérez vos dépenses et cherchez des opportunités pour augmenter vos fonds.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
  );
};

export default PlayerSheet;


    