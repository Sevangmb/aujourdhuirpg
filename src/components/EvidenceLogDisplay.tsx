
"use client";

import type { Player, Clue, GameDocument } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, FileText as DocumentIcon, Lightbulb, MessageSquare } from 'lucide-react'; 
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';


interface EvidenceLogDisplayProps {
  player: Player;
}

const ClueCard: React.FC<{ clue: Clue }> = ({ clue }) => (
  <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="pb-2 pt-3 px-4">
      <CardTitle className="text-md font-semibold text-primary/90">{clue.title}</CardTitle>
      <CardDescription className="text-xs">
        Type: {clue.type} - Trouvé le: {format(new Date(clue.dateFound), 'PPP', { locale: fr })}
      </CardDescription>
    </CardHeader>
    <CardContent className="text-sm px-4 pb-3 space-y-1">
      <p className="italic text-muted-foreground">"{clue.description}"</p>
      {clue.source && <p><span className="font-semibold">Source:</span> {clue.source}</p>}
      {clue.imageUrl && (
        <div className="mt-2">
          <Image src={clue.imageUrl} alt={`Image pour ${clue.title}`} width={200} height={150} className="rounded-md border" data-ai-hint={clue.keywords?.join(' ') || 'clue image'}/>
        </div>
      )}
      {clue.keywords && clue.keywords.length > 0 && (
        <p className="text-xs"><span className="font-semibold">Mots-clés:</span> {clue.keywords.join(', ')}</p>
      )}
    </CardContent>
  </Card>
);

const DocumentCard: React.FC<{ documentItem: GameDocument }> = ({ documentItem }) => (
  <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="pb-2 pt-3 px-4">
      <CardTitle className="text-md font-semibold text-primary/90">{documentItem.title}</CardTitle>
      <CardDescription className="text-xs">
        Type: {documentItem.type} - Obtenu le: {format(new Date(documentItem.dateAcquired), 'PPP', { locale: fr })}
      </CardDescription>
    </CardHeader>
    <CardContent className="text-sm px-4 pb-3 space-y-1">
      {documentItem.source && <p><span className="font-semibold">Source:</span> {documentItem.source}</p>}
      <div className="text-xs mt-1 prose prose-sm max-h-48 overflow-y-auto" dangerouslySetInnerHTML={{ __html: documentItem.content }} />
      {documentItem.keywords && documentItem.keywords.length > 0 && (
        <p className="text-xs mt-1"><span className="font-semibold">Mots-clés:</span> {documentItem.keywords.join(', ')}</p>
      )}
    </CardContent>
  </Card>
);


const EvidenceLogDisplay: React.FC<EvidenceLogDisplayProps> = ({ player }) => {
  if (!player) return <p className="p-4 text-muted-foreground">Données d'enquête non disponibles.</p>;

  const clues = player.clues || [];
  const documents = player.documents || [];
  const investigationNotes = player.investigationNotes || "Aucune note d'enquête pour le moment.";

  return (
    <Tabs defaultValue="clues" className="w-full flex flex-col h-full"> 
        <TabsList className="grid w-full grid-cols-3 shrink-0 mb-2">
          <TabsTrigger value="clues" className="text-xs sm:text-sm"><Lightbulb className="w-3 h-3 mr-1 sm:mr-2" />Indices ({clues.length})</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm"><DocumentIcon className="w-3 h-3 mr-1 sm:mr-2" />Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="summary" className="text-xs sm:text-sm"><MessageSquare className="w-3 h-3 mr-1 sm:mr-2" />Résumé</TabsTrigger>
        </TabsList>

          <TabsContent value="clues" className="mt-0 pt-1 flex-1 min-h-0"> 
            {clues.length > 0 ? (
              clues.map(clue => <ClueCard key={clue.id} clue={clue} />)
            ) : (
              <Card className="mt-4"><CardContent className="pt-6 text-center text-muted-foreground">Aucun indice découvert.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-0 pt-1 flex-1 min-h-0"> 
            {documents.length > 0 ? (
              documents.map(doc => <DocumentCard key={doc.id} documentItem={doc} />)
            ) : (
              <Card className="mt-4"><CardContent className="pt-6 text-center text-muted-foreground">Aucun document obtenu.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="summary" className="mt-0 pt-1 flex-1 min-h-0"> 
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-primary/90 flex items-center"><Search className="w-5 h-5 mr-2"/>Résumé de l'Enquête</CardTitle>
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
