"use client";

import type { Player, AdvancedSkillSystem, SkillCategory } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Shield, Sparkles, TrendingUp, Dumbbell, UserCog, Landmark, Users, Book, Heart, Crosshair, Anchor, CloudFog, Dices, Zap } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface PlayerSheetProps {
  player: Player;
}

const PlayerSheet: React.FC<PlayerSheetProps> = ({ player }) => {
  if (!player) return null;

  const skillCategoryIcons: { [key in keyof AdvancedSkillSystem]: React.ElementType } = {
    physiques: Dumbbell,
    techniques: UserCog,
    survie: Landmark,
    sociales: Users,
    savoir: Book,
  };
  
  const skillCategoryLabels: { [key in keyof AdvancedSkillSystem]: string } = {
    physiques: "Compétences Physiques",
    techniques: "Techniques & Artisanat",
    survie: "Survie & Exploration",
    sociales: "Compétences Sociales",
    savoir: "Savoirs & Connaissances",
  };

  const statIcons: { [key in keyof Player['stats']]?: React.ElementType } = {
    Force: Dumbbell,
    Dexterite: UserCog,
    Constitution: Heart,
    Intelligence: Book,
    Perception: Crosshair,
    Charisme: Users,
    Volonte: Anchor,
    Savoir: Book,
    Technique: UserCog,
    MagieOccultisme: Sparkles,
    Discretion: CloudFog,
    ChanceDestin: Dices,
    Sante: Heart,
    Energie: Zap,
    Stress: CloudFog,
  };

  const xpPercentage = player.progression.xpToNextLevel > 0 
    ? (player.progression.xp / player.progression.xpToNextLevel) * 100 
    : 0;

  const coreAttributes: (keyof Player['stats'])[] = [
    'Force', 'Dexterite', 'Constitution', 'Intelligence', 'Perception', 'Charisme', 
    'Volonte', 'Savoir', 'Technique', 'MagieOccultisme', 'Discretion', 'ChanceDestin'
  ];

  return (
    <div>
        <Card className="mb-4 shadow-none border-0">
            <CardHeader className="flex flex-col sm:flex-row items-center gap-4 p-2">
              <Image 
                src={player.avatarUrl || 'https://placehold.co/100x100.png'} 
                alt={`Avatar de ${player.name}`} 
                width={100} 
                height={100} 
                className="rounded-lg border-2 border-primary aspect-square object-cover"
                data-ai-hint="character portrait"
                unoptimized={!!player.avatarUrl && player.avatarUrl.startsWith('data:')}
              />
              <div className='text-center sm:text-left'>
                <CardTitle className="text-2xl font-headline text-primary">{player.name}</CardTitle>
                <CardDescription>{player.age} ans | {player.gender} | {player.origin}</CardDescription>
                <div className="mt-2">
                  <Badge variant="outline">Niveau {player.progression.level}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-2 text-sm">
               <h4 className="font-semibold text-muted-foreground text-xs mb-1">Historique (RP)</h4>
               <ScrollArea className="h-24 p-3 border rounded-lg bg-background/50">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{player.background}</p>
               </ScrollArea>
            </CardContent>
          </Card>
      
        <Accordion type="multiple" defaultValue={['progression', 'stats', 'skills']} className="w-full">
            <AccordionItem value="progression">
              <AccordionTrigger className='font-headline text-lg'>
                <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />Progression & Alignement</div>
              </AccordionTrigger>
              <AccordionContent className="p-2 text-sm space-y-4">
                 <div>
                    <div className="flex justify-between items-end mb-0.5">
                        <h4 className="font-semibold text-muted-foreground text-sm">Expérience (XP)</h4>
                        <p className="text-sm text-primary/80 font-semibold">{player.progression.xp} / {player.progression.xpToNextLevel}</p>
                    </div>
                    <Progress value={xpPercentage} className="w-full h-2.5" />
                  </div>
                  <div className="flex justify-between gap-4">
                    <div className="flex-1 text-center p-2 bg-muted/30 rounded-lg">
                        <h4 className="font-semibold text-muted-foreground text-xs">Chaos / Loi</h4>
                        <p className="text-lg font-bold text-primary">{player.alignment.chaosLawful}</p>
                    </div>
                     <div className="flex-1 text-center p-2 bg-muted/30 rounded-lg">
                        <h4 className="font-semibold text-muted-foreground text-xs">Bien / Mal</h4>
                        <p className="text-lg font-bold text-primary">{player.alignment.goodEvil}</p>
                    </div>
                  </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="stats">
              <AccordionTrigger className='font-headline text-lg'>
                <div className="flex items-center gap-2"><Shield className="w-5 h-5" />Attributs</div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm p-2">
                  {coreAttributes.map((statName) => {
                    const statObj = player.stats[statName];
                    const Icon = statIcons[statName] || Zap;
                    return (
                      <div key={statName} className="flex flex-col items-center p-1.5 bg-muted/30 rounded-md text-xs">
                        <div className="flex items-center">
                          <Icon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                          <span className="font-medium">{statName}</span>
                        </div>
                        <span className="font-bold text-primary text-lg">{statObj.value}</span>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="skills">
              <AccordionTrigger className='font-headline text-lg'>
                <div className="flex items-center gap-2"><Sparkles className="w-5 h-5" />Compétences</div>
              </AccordionTrigger>
              <AccordionContent className="p-2">
                 <Accordion type="multiple" className="w-full">
                    {(Object.keys(player.skills) as Array<keyof AdvancedSkillSystem>).map(category => {
                        const Icon = skillCategoryIcons[category] || Sparkles;
                        const subSkills = player.skills[category];
                        return (
                            <AccordionItem value={category} key={category} className="border-b-0 mb-1">
                                <AccordionTrigger className="text-sm py-2 bg-muted/30 rounded-md px-3 hover:no-underline">
                                    <div className="flex items-center">
                                        <Icon className="w-4 h-4 mr-2" />
                                        {skillCategoryLabels[category]}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-1 pt-2">
                                        {Object.entries(subSkills).map(([skill, value]) => (
                                            <div key={skill} className="flex justify-between items-center p-1.5 text-sm">
                                                <span className="font-medium capitalize">{skill.replace(/_/g, ' ')}</span>
                                                <div className="text-right">
                                                  <span className="font-bold text-primary">{value.level}</span>
                                                  <Progress value={(value.xp / value.xpToNext) * 100} className="w-16 h-1 mt-0.5"/>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
  );
};

export default PlayerSheet;
