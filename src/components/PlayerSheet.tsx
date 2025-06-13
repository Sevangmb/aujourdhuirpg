
"use client";

import type { Player } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { User, Shield, Brain, Sparkles, BarChart3, TrendingUp, Palette } from 'lucide-react';

interface PlayerSheetProps {
  player: Player;
}

const PlayerSheet: React.FC<PlayerSheetProps> = ({ player }) => {
  if (!player) return null;

  return (
    <div className="p-4 h-full overflow-y-auto">
      <Tabs defaultValue="identity" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-4">
          <TabsTrigger value="identity"><User className="w-4 h-4 mr-2 inline-block" />Identité</TabsTrigger>
          <TabsTrigger value="stats"><Shield className="w-4 h-4 mr-2 inline-block" />Stats</TabsTrigger>
          <TabsTrigger value="skills"><Sparkles className="w-4 h-4 mr-2 inline-block" />Compétences</TabsTrigger>
          <TabsTrigger value="traits"><Brain className="w-4 h-4 mr-2 inline-block" />Traits</TabsTrigger>
          <TabsTrigger value="progression"><TrendingUp className="w-4 h-4 mr-2 inline-block" />Progression</TabsTrigger>
          <TabsTrigger value="alignment"><Palette className="w-4 h-4 mr-2 inline-block" />Alignement</TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <Image 
                  src={player.avatarUrl || 'https://placehold.co/100x100.png'} 
                  alt={`Avatar de ${player.name}`} 
                  width={100} 
                  height={100} 
                  className="rounded-full border-2 border-primary"
                  data-ai-hint="character portrait"
                />
                <div>
                  <CardTitle className="text-2xl font-headline text-primary">{player.name}</CardTitle>
                  <CardDescription>{player.age} ans, {player.gender}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold text-muted-foreground">Origine</h4>
                <p>{player.origin}</p>
              </div>
              <div>
                <h4 className="font-semibold text-muted-foreground">Historique (RP)</h4>
                <p className="whitespace-pre-wrap">{player.background}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-primary">Caractéristiques Principales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(player.stats).map(([stat, value]) => (
                <div key={stat} className="flex justify-between p-2 bg-muted/30 rounded-md">
                  <span className="font-medium">{stat}</span>
                  <span className="font-bold text-primary">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-primary">Compétences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(player.skills).map(([skill, value]) => (
                <div key={skill} className="flex justify-between p-2 bg-muted/30 rounded-md">
                  <span className="font-medium">{skill}</span>
                  <span className="font-bold text-primary">{value}</span>
                </div>
              ))}
               {Object.keys(player.skills).length === 0 && <p className="text-muted-foreground">Aucune compétence acquise.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traits">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-primary">Traits & États Mentaux</CardTitle>
            </CardHeader>
            <CardContent>
              {player.traitsMentalStates.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {player.traitsMentalStates.map((trait, index) => (
                    <li key={index}>{trait}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Aucun trait ou état mental particulier.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progression">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-primary">Progression</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold text-muted-foreground">Niveau</h4>
                <p className="text-xl font-bold text-primary">{player.progression.level}</p>
              </div>
              <div>
                <h4 className="font-semibold text-muted-foreground">Points d'Expérience (XP)</h4>
                <p className="text-xl font-bold text-primary">{player.progression.xp}</p>
              </div>
              <div>
                <h4 className="font-semibold text-muted-foreground">Talents (Perks)</h4>
                {player.progression.perks.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {player.progression.perks.map((perk, index) => (
                      <li key={index}>{perk}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Aucun talent débloqué.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alignment">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-primary">Alignement & Personnalité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold text-muted-foreground">Chaos / Loi</h4>
                <p className="text-lg">Valeur : <span className="font-bold text-primary">{player.alignment.chaosLawful}</span></p>
                <p className="text-xs text-muted-foreground">(-100 Chaos, 0 Neutre, 100 Loi)</p>
              </div>
              <div>
                <h4 className="font-semibold text-muted-foreground">Bien / Mal</h4>
                <p className="text-lg">Valeur : <span className="font-bold text-primary">{player.alignment.goodEvil}</span></p>
                <p className="text-xs text-muted-foreground">(-100 Mal, 0 Neutre, 100 Bien)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlayerSheet;
