
"use client";

import type { Player, Clue, GameDocument } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, FileText as DocumentIcon, Lightbulb, MessageSquare } from 'lucide-react';

interface EvidenceLogDisplayProps {
  player: Player;
}

const ClueCard: React.FC<{ clue: Clue }> = ({ clue }) => (
 <Card className="mb-3">
 <CardHeader>
 <CardTitle>{clue.id}</CardTitle> {/* Using ID for now, replace with actual title if available */}
 </CardHeader>
 <CardContent>
 <p>{clue.description}</p>
      {clue.source && <p><span className="font-semibold">Source:</span> {clue.source}</p>}
 {clue.relevance && <p><span className="font-semibold">Relevance:</span> {clue.relevance}</p>}
 </CardContent>
 </Card>
);

const DocumentCard: React.FC<{ documentItem: GameDocument }> = ({ documentItem }) => (
 <Card className="mb-3">
 <CardHeader>
 <CardTitle>{documentItem.title}</CardTitle>
 </CardHeader>
 <CardContent>
 <p><span className="font-semibold">Type:</span> {documentItem.type}</p>
 <p>{documentItem.content}</p>
 </CardContent>
 </Card>
);


const EvidenceLogDisplay: React.FC<EvidenceLogDisplayProps> = ({ player }) => {
  if (!player) return <p className="p-4 text-muted-foreground">Données d'enquête non disponibles.</p>;

  const clues = player.clues || [];
  const documents = player.documents || []; // Assuming 'documents' field exists now
  const investigationNotes = player.investigationNotes || "Aucune note d'enquête pour le moment.";

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
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed prose prose-sm">
                  {investigationNotes}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
    </Tabs>
  );
};

export default EvidenceLogDisplay;
