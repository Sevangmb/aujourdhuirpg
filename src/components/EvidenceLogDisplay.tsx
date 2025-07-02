
"use client";

import React, { useState } from 'react';
import type { Player, Clue, GameDocument, ClueType } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Search, FileText, Lightbulb, MessageSquare, RefreshCw, Loader2, Camera, Scan, Fingerprint, AudioWaveform } from 'lucide-react';
import Image from "next/image";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useGame } from '@/contexts/GameContext';
import { useToast } from '@/hooks/use-toast';

const clueTypeIcons: Record<ClueType, React.ElementType> = {
  photo: Camera,
  testimony: MessageSquare,
  text_extract: FileText,
  object_observation: Scan,
  digital_trace: Fingerprint,
  audio_recording: AudioWaveform,
  misc_clue: Lightbulb,
};

const ClueCard: React.FC<{ clue: Clue }> = ({ clue }) => {
  const Icon = clueTypeIcons[clue.type] || Lightbulb;
  return (
    <Card className="mb-3 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start gap-4 p-4">
        <Icon className="w-6 h-6 text-primary shrink-0 mt-1" />
        <div className="flex-grow">
          <CardTitle className="text-md font-semibold">{clue.title}</CardTitle>
          <CardDescription className="text-xs">
            Trouvé le {clue.dateFound ? new Date(clue.dateFound).toLocaleDateString('fr-FR') : 'N/A'}
            {clue.source && ` | Source: ${clue.source}`}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {clue.imageUrl && (
          <div className="relative h-40 w-full mb-3 rounded-md overflow-hidden border">
            <Image
              src={clue.imageUrl}
              alt={`Image de l'indice: ${clue.title}`}
              fill
              className="object-cover"
              data-ai-hint="evidence photo"
            />
          </div>
        )}
        <p className="text-sm text-muted-foreground">{clue.description}</p>
        {clue.keywords && clue.keywords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {clue.keywords.map(kw => <Badge key={kw} variant="secondary">{kw}</Badge>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DocumentCard: React.FC<{ documentItem: GameDocument }> = ({ documentItem }) => (
 <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="p-4 pb-2">
        <CardTitle className="text-md font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-primary"/>{documentItem.title}</CardTitle>
        <CardDescription className="text-xs">Type: {documentItem.type} | Acquis: {documentItem.dateAcquired ? new Date(documentItem.dateAcquired).toLocaleDateString('fr-FR') : 'N/A'}</CardDescription>
    </CardHeader>
    <CardContent className="p-4 pt-0">
        <ScrollArea className="max-h-40 p-2 border rounded-md bg-muted/30">
            <div className="prose prose-sm dark:prose-invert text-xs" dangerouslySetInnerHTML={{ __html: documentItem.content }}></div>
        </ScrollArea>
        {documentItem.source && <p className="text-xs mt-2 border-t pt-2"><span className="font-semibold">Source:</span> {documentItem.source}</p>}
    </CardContent>
 </Card>
);


const EvidenceLogDisplay: React.FC<{ player: Player }> = ({ player }) => {
  const { handleUpdateInvestigationNotes } = useGame();
  const { toast } = useToast();
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  if (!player) return <p className="p-4 text-muted-foreground">Données d'enquête non disponibles.</p>;

  const clues = player.clues || [];
  const documents = player.documents || [];
  const investigationNotes = player.investigationNotes || "Aucune note d'enquête pour le moment. Collectez des indices et cliquez sur 'Synthétiser' pour obtenir une analyse de l'IA.";

  const handleSynthesizeClick = async () => {
    setIsSynthesizing(true);
    toast({ title: "Analyse en cours...", description: "L'IA examine vos indices et documents..." });

    try {
      const { runInvestigationSynthesis } = await import('@/app/actions/run-investigation-synthesis');
      
      const result = await runInvestigationSynthesis({
        playerName: player.name,
        clues: clues.map(c => ({ title: c.title, description: c.description, type: c.type })),
        documents: documents.map(d => ({ title: d.title, content: d.content, type: d.type })),
        activeQuests: player.questLog.filter(q => q.status === 'active' && q.type !== 'job').map(q => q.title),
        previousSummary: player.investigationNotes,
      });

      if (result.summary) {
        handleUpdateInvestigationNotes(result.summary);
        toast({ title: "Synthèse terminée !", description: "Votre dossier d'enquête a été mis à jour." });
      } else {
        throw new Error(result.error || "La synthèse a échoué sans message d'erreur spécifique.");
      }
    } catch (error) {
      console.error("Failed to synthesize investigation:", error);
      toast({
        variant: 'destructive',
        title: "Erreur de synthèse",
        description: (error as Error).message,
      });
    } finally {
      setIsSynthesizing(false);
    }
  };


  return (
    <Tabs defaultValue="clues" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clues" className="text-xs sm:text-sm"><Lightbulb className="w-3 h-3 mr-1 sm:mr-2" />Indices ({clues.length})</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm"><FileText className="w-3 h-3 mr-1 sm:mr-2" />Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="summary" className="text-xs sm:text-sm"><MessageSquare className="w-3 h-3 mr-1 sm:mr-2" />Résumé</TabsTrigger>
        </TabsList>

        <TabsContent value="clues">
            {clues.length > 0 ? (
              clues.map(clue => <ClueCard key={clue.id} clue={clue} />)
            ) : (
              <Card className="mt-4"><CardContent className="pt-6 text-center text-muted-foreground">Aucun indice découvert.</CardContent></Card>
            )}
        </TabsContent>
        <TabsContent value="documents">
            {documents.length > 0 ? (
              documents.map(doc => <DocumentCard key={doc.id} documentItem={doc} />)
            ) : (
              <Card className="mt-4"><CardContent className="pt-6 text-center text-muted-foreground">Aucun document obtenu.</CardContent></Card>
            )}
        </TabsContent>

        <TabsContent value="summary" className="mt-0 pt-1 flex-1 min-h-0"> 
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Search className="w-5 h-5 mr-2"/>Résumé de l'Enquête</CardTitle>
                <CardDescription>Synthèse des informations et hypothèses actuelles, générée par l'IA.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed prose prose-sm dark:prose-invert p-1">
                      {investigationNotes}
                    </div>
                </ScrollArea>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSynthesizeClick} disabled={isSynthesizing || (clues.length === 0 && documents.length === 0)} className="w-full">
                  {isSynthesizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {isSynthesizing ? 'Analyse en cours...' : 'Synthétiser le Dossier'}
                </Button>
              </CardFooter>
            </Card>
        </TabsContent>
    </Tabs>
  );
};

export default EvidenceLogDisplay;
