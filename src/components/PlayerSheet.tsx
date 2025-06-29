"use client";

import type { Player, AdvancedSkillSystem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Shield, Brain as BrainIcon, Sparkles, TrendingUp, Palette, Euro, Zap, CloudFog, Anchor, Users as PeopleIcon, Heart, Smile, Dumbbell, BookOpen, UserCog, Stethoscope, Hand, Landmark } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface PlayerSheetProps {
  player: Player;
}

const skillCategoryIcons: { [key in keyof AdvancedSkillSystem]: React.ElementType } = {
  cognitive: BrainIcon,
  social: PeopleIcon,
  physical: Dumbbell,
  technical: UserCog,
  survival: Landmark,
};

const skillCategoryLabels: { [key in keyof AdvancedSkillSystem]: string } = {
  cognitive: "Cognitives",
  social: "Sociales",
  physical: "Physiques",
  technical: "Techniques",
  survival: "Survie",
};

const PlayerSheet: React.FC<PlayerSheetProps> = ({ player }) => {
  if (!player) return null;

  const xpPercentage = player.progression.xpToNextLevel > 0 
    ? (player.progression.xp / player.progression.xpToNextLevel) * 100 
    : 0;

  return (
    <div>
        <Card className="mb-4">
            <CardHeader className="flex flex-row items-center gap-4 p-4">
              <Image 
                src={player.avatarUrl || 'https://placehold.co/80x80.png'} 
                alt={`Avatar de ${player.name}`} 
                width={80} 
                height={80} 
                className="rounded-full border-2 border-primary aspect-square object-cover"
                data-ai-hint="character portrait"
              />
              <div>
                <CardTitle className="text-xl font-headline text-primary">{player.name}</CardTitle>
                <CardDescription>{player.age} ans | {player.gender} | {player.origin}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 text-sm">
               <h4 className="font-semibold text-muted-foreground text-xs mb-1">Historique (RP)</h4>
               <ScrollArea className="h-24 p-2 border rounded-md">
                  <p className="whitespace-pre-wrap text-xs">{player.background}</p>
               </ScrollArea>
            </CardContent>
          </Card>
      
        <Accordion type="multiple" defaultValue={['stats', 'skills']} className="w-full">
            <AccordionItem value="stats">
              <AccordionTrigger>
                <div className="flex items-center gap-2"><Shield className="w-4 h-4" />Caractéristiques Principales</div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm p-2">
                  {Object.entries(player.stats).map(([stat, value]) => {
                    let Icon = Zap; 
                    if (stat === "Sante") Icon = Heart; else if (stat === "Charisme") Icon = Smile; else if (stat === "Intelligence") Icon = BrainIcon; else if (stat === "Force") Icon = Dumbbell; else if (stat === "Energie") Icon = Zap; else if (stat === "Stress") Icon = CloudFog; else if (stat === "Volonte") Icon = Anchor; else if (stat === "Reputation") Icon = PeopleIcon;

                    return (
                      <div key={stat} className="flex flex-col items-center p-1.5 bg-muted/30 rounded-md text-xs">
                        <div className="flex items-center">
                          <Icon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                          <span className="font-medium">{stat}</span>
                        </div>
                        <span className="font-bold text-primary">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="skills">
              <AccordionTrigger>
                <div className="flex items-center gap-2"><Sparkles className="w-4 h-4" />Compétences</div>
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
                                            <div key={skill} className="flex justify-between p-1.5 text-xs">
                                                <span className="font-medium capitalize">{skill.replace(/_/g, ' ')}</span>
                                                <span className="font-bold text-primary">{value}</span>
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
            
            <AccordionItem value="progression">
              <AccordionTrigger>
                <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />Progression & Alignement</div>
              </AccordionTrigger>
              <AccordionContent className="p-2 text-sm space-y-4">
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
                  <div className="flex justify-between gap-4">
                    <div className="flex-1">
                        <h4 className="font-semibold text-muted-foreground text-xs">Chaos / Loi</h4>
                        <p className="text-md text-center"> <span className="font-bold text-primary">{player.alignment.chaosLawful}</span></p>
                    </div>
                     <div className="flex-1">
                        <h4 className="font-semibold text-muted-foreground text-xs">Bien / Mal</h4>
                        <p className="text-md text-center"> <span className="font-bold text-primary">{player.alignment.goodEvil}</span></p>
                    </div>
                  </div>
              </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
  );
};

export default PlayerSheet;
