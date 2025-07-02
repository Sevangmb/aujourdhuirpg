
"use client";

import React, { useState } from 'react';
import type { Player, Clue, GameDocument } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Search, FileText as DocumentIcon, Lightbulb, MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import Image from "next/image";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from './ui/button';
import { useGame } from '@/contexts/GameContext';
import { useToast } from '@/hooks/use-toast';


interface EvidenceLogDisplayProps {
  player: Player;
}

const ClueCard: React.FC<{ clue: Clue }> = ({ clue }) => (
 <Card className="mb-3">
    <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-3">
        {clue.imageUrl && (
            <Image 
                src={clue.imageUrl}
                alt={`Image for ${clue.title}`}
                width={60}
                height={60}
                className="aspect-square w-16 h-16 rounded-md object-cover"
                data-ai-hint="evidence photo"
            />
        )}
        <div className="space-y-1">
            <CardTitle className="text-sm font-semibold">{clue.title}</CardTitle>
            <CardDescription className="text-xs">Type: {clue.type} | Trouvé: {clue.dateFound ? new Date(clue.dateFound).toLocaleDateString('fr-FR') : 'N/A'}</CardDescription>
        </div>
    </CardHeader>
    <CardContent className="p-3 pt-0">
        <p className="text-xs text-muted-foreground">{clue.description}</p>
        {clue.source && <p className="text-xs mt-1"><span className="font-semibold">Source:</span> {clue.source}</p>}
        {clue.keywords && clue.keywords.length > 0 && <p className="text-xs mt-1"><span className="font-semibold">Mots-clés:</span> {clue.keywords.join(', ')}</p>}
    </CardContent>
 </Card>
);

const DocumentCard: React.FC<{ documentItem: GameDocument }> = ({ documentItem }) => (
 <Card className="mb-3">
    <CardHeader className="p-3">
        <CardTitle className="text-sm font-semibold">{documentItem.title}</CardTitle>
        <CardDescription className="text-xs">Type: {documentItem.type} | Acquis: {documentItem.dateAcquired ? new Date(documentItem.dateAcquired).toLocaleDateString('fr-FR') : 'N/A'}</CardDescription>
    </CardHeader>
    <CardContent className="p-3 pt-0">
        <ScrollArea className="max-h-40">
            <div className="prose prose-sm dark:prose-invert text-xs p-1" dangerouslySetInnerHTML={{ __html: documentItem.content }}></div>
        </ScrollArea>
        {documentItem.source && <p className="text-xs mt-2 border-t pt-2"><span className="font-semibold">Source:</span> {documentItem.source}</p>}
    </CardContent>
 </Card>
);


const EvidenceLogDisplay: React.FC<EvidenceLogDisplayProps> = ({ player }) => {
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
      // Lazy import the server action
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
          <TabsTrigger value="documents" className="text-xs sm:text-sm"><DocumentIcon className="w-3 h-3 mr-1 sm:mr-2" />Documents ({documents.length})</TabsTrigger>
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
                <Button onClick={handleSynthesizeClick} disabled={isSynthesizing || clues.length === 0} className="w-full">
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
