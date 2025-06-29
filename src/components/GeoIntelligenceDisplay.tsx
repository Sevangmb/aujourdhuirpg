
"use client";

import React from 'react';
import type { GeoIntelligence } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
    ShieldCheck,
    Landmark,
    Briefcase,
    HeartHandshake,
    Sparkles,
    Lightbulb,
    HelpCircle,
    BookOpen,
    AlertTriangle,
    Loader2,
    Clock,
    ThumbsUp,
    Key,
    UserCheck
} from 'lucide-react';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';


interface GeoIntelligenceDisplayProps {
  data: GeoIntelligence | null;
  isLoading: boolean;
  error: string | null;
  placeName: string;
}

const GeoIntelligenceDisplay: React.FC<GeoIntelligenceDisplayProps> = ({ data, isLoading, error, placeName }) => {
  if (isLoading) {
    return (
      <div className="space-y-4 p-1">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
             <Skeleton className="h-6 w-56" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Erreur d'Analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>L'analyse géospatiale pour "{placeName}" a échoué.</p>
          <p className="text-xs text-destructive/80 mt-1">Détail : {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-muted-foreground">
            <HelpCircle className="w-5 h-5 mr-2" />
            Aucune Donnée
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Aucune donnée d'analyse disponible pour "{placeName}".</p>
        </CardContent>
      </Card>
    );
  }

  const { areaAnalysis, aiRecommendations } = data;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-primary" /> Profil de la Zone
          </CardTitle>
          <CardDescription>{areaAnalysis.dominantAtmosphere}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center"><HeartHandshake className="w-4 h-4 mr-2 text-muted-foreground" />Classe Sociale</span>
            <span className="font-semibold capitalize">{areaAnalysis.socialClass}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center"><Briefcase className="w-4 h-4 mr-2 text-muted-foreground" />Activités</span>
            <span className="font-semibold">{areaAnalysis.economicActivity.join(', ')}</span>
          </div>
          <div>
            <span className="flex items-center text-sm font-medium mb-1"><ShieldCheck className="w-4 h-4 mr-2 text-muted-foreground" />Niveau de Sécurité</span>
            <Progress value={100 - areaAnalysis.criminalityLevel} className="h-2" />
            <p className="text-xs text-right text-muted-foreground mt-1">{100 - areaAnalysis.criminalityLevel}% (Sûr)</p>
          </div>
           <div>
            <span className="flex items-center text-sm font-medium mb-1"><Landmark className="w-4 h-4 mr-2 text-muted-foreground" />Score Culturel</span>
            <Progress value={areaAnalysis.cultureScore} className="h-2" />
            <p className="text-xs text-right text-muted-foreground mt-1">{areaAnalysis.cultureScore}%</p>
          </div>
          <Accordion type="single" collapsible>
            <AccordionItem value="anecdote">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center"><BookOpen className="w-4 h-4 mr-2 text-muted-foreground" />Anecdote Historique</div>
              </AccordionTrigger>
              <AccordionContent className="text-xs italic">
                {areaAnalysis.historicalAnecdote}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="w-5 h-5 mr-2 text-accent" /> Recommandations de l'IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
           <Accordion type="multiple" className="w-full">
            <AccordionItem value="activities">
              <AccordionTrigger className="text-sm"><ThumbsUp className="w-4 h-4 mr-2 text-muted-foreground" />Activités Idéales</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside text-xs space-y-1">
                  {aiRecommendations.idealActivities.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="safety">
              <AccordionTrigger className="text-sm"><AlertTriangle className="w-4 h-4 mr-2 text-muted-foreground" />Conseils de Sécurité</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside text-xs space-y-1">
                  {aiRecommendations.safetyTips.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="gems">
              <AccordionTrigger className="text-sm"><Key className="w-4 h-4 mr-2 text-muted-foreground" />Trésors Cachés</AccordionTrigger>
              <AccordionContent>
                <ul className="list-none space-y-2 text-xs">
                  {aiRecommendations.hiddenGems.map((gem, index) => (
                    <li key={index}>
                      <p className="font-semibold">{gem.name}</p>
                      <p className="italic text-muted-foreground">{gem.description}</p>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
             <AccordionItem value="time">
              <AccordionTrigger className="text-sm"><Clock className="w-4 h-4 mr-2 text-muted-foreground" />Meilleurs Moments</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside text-xs space-y-1">
                  {aiRecommendations.bestTimeToVisit.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeoIntelligenceDisplay;
