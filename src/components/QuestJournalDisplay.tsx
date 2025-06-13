
"use client";

import type { Player, Quest, PNJ, MajorDecision, QuestObjective } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CircleDot, CircleCheck, CircleX, BookUser, Landmark, Swords, Users, Speech, Lightbulb, ShieldAlert, History, MapPin, Info } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface QuestJournalDisplayProps {
  player: Player;
}

const QuestObjectiveDisplay: React.FC<{ objective: QuestObjective }> = ({ objective }) => (
  <li className="flex items-center text-sm py-1">
    {objective.isCompleted ? (
      <CircleCheck className="w-4 h-4 mr-2 text-green-500 shrink-0" />
    ) : (
      <CircleDot className="w-4 h-4 mr-2 text-yellow-500 shrink-0" />
    )}
    <span className={objective.isCompleted ? "line-through text-muted-foreground" : ""}>
      {objective.description}
    </span>
  </li>
);

const QuestCard: React.FC<{ quest: Quest }> = ({ quest }) => {
  let statusBadgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  let StatusIcon = Lightbulb;
  if (quest.status === 'completed') { statusBadgeVariant = "default"; StatusIcon = ShieldAlert; } // Using ShieldAlert for 'completed' as 'default' is green
  else if (quest.status === 'failed') { statusBadgeVariant = "destructive"; StatusIcon = CircleX; }
  else if (quest.status === 'active') { statusBadgeVariant = "outline"; StatusIcon = Lightbulb; }


  return (
    <Card className="mb-4 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-headline text-primary/90">{quest.title}</CardTitle>
            <CardDescription className="text-xs">
              Type: {quest.type === 'main' ? 'Principale' : 'Secondaire'} - Ajoutée le: {format(new Date(quest.dateAdded), 'PPP', { locale: fr })}
            </CardDescription>
          </div>
           <Badge variant={statusBadgeVariant} className="flex items-center gap-1 text-xs">
            <StatusIcon className="w-3 h-3" />
            {quest.status.charAt(0).toUpperCase() + quest.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <p className="italic text-muted-foreground">"{quest.description}"</p>
        {quest.giver && <p><span className="font-semibold">Donnée par:</span> {quest.giver}</p>}
        {quest.relatedLocation && <p className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-muted-foreground" /> <span className="font-semibold">Lieu lié:</span> {quest.relatedLocation}</p>}

        {quest.objectives && quest.objectives.length > 0 && (
          <div>
            <h4 className="font-semibold mt-2 mb-1">Objectifs :</h4>
            <ul className="list-none pl-1 space-y-0.5">
              {quest.objectives.map(obj => <QuestObjectiveDisplay key={obj.id} objective={obj} />)}
            </ul>
          </div>
        )}
      </CardContent>
      {(quest.reward || quest.moneyReward) && (
        <CardFooter className="text-xs pt-3">
            <p>
                <span className="font-semibold">Récompense :</span>
                {quest.reward ? ` ${quest.reward}` : ""}
                {quest.moneyReward ? ` ${quest.moneyReward}€` : ""}
            </p>
        </CardFooter>
      )}
      {quest.status === 'completed' && quest.dateCompleted && (
        <CardFooter className="text-xs pt-1 text-green-600">
            Terminée le: {format(new Date(quest.dateCompleted), 'PPP', { locale: fr })}
        </CardFooter>
      )}
       {quest.status === 'failed' && (
        <CardFooter className="text-xs pt-1 text-red-600">
            Échouée
        </CardFooter>
      )}
    </Card>
  );
};


const PNJCard: React.FC<{ pnj: PNJ }> = ({ pnj }) => {
  let relationColor = "text-foreground";
  if (['friendly', 'allied'].includes(pnj.relationStatus)) relationColor = "text-green-600";
  else if (pnj.relationStatus === 'hostile' || pnj.relationStatus === 'rival') relationColor = "text-red-600";
  else if (pnj.relationStatus === 'neutral') relationColor = "text-yellow-600";

  return (
    <Card className="mb-4 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-headline text-primary/90">{pnj.name}</CardTitle>
        <CardDescription className="text-xs">
          Importance: {pnj.importance} - Rencontré(e): {pnj.firstEncountered}
          {pnj.lastSeen && ` - Vu(e) pour la dernière fois: ${format(new Date(pnj.lastSeen), 'PPP p', { locale: fr })}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <p className="italic text-muted-foreground">"{pnj.description}"</p>
        <p><span className="font-semibold">Relation:</span> <span className={relationColor}>{pnj.relationStatus}</span></p>
        {typeof pnj.trustLevel === 'number' && <p><span className="font-semibold">Confiance:</span> {pnj.trustLevel}/100</p>}
        {pnj.notes && pnj.notes.length > 0 && (
          <div>
            <h4 className="font-semibold mt-2 mb-1">Notes:</h4>
            <ul className="list-disc list-inside text-xs">
              {pnj.notes.map((note, index) => <li key={index}>{note}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DecisionCard: React.FC<{ decision: MajorDecision }> = ({ decision }) => (
  <Card className="mb-4 shadow-md hover:shadow-lg transition-shadow">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg font-headline text-primary/90">{decision.summary}</CardTitle>
      <CardDescription className="text-xs">
        Date: {format(new Date(decision.dateMade), 'PPP p', { locale: fr })}
      </CardDescription>
    </CardHeader>
    <CardContent className="text-sm space-y-2">
      <p><span className="font-semibold">Contexte:</span> {decision.scenarioContext}</p>
      <p><span className="font-semibold">Conséquence:</span> {decision.outcome}</p>
    </CardContent>
  </Card>
);


const QuestJournalDisplay: React.FC<QuestJournalDisplayProps> = ({ player }) => {
  if (!player) return <p className="p-4 text-muted-foreground">Données du joueur non disponibles.</p>;

  const mainQuests = player.questLog?.filter(q => q.type === 'main') || [];
  const secondaryQuests = player.questLog?.filter(q => q.type === 'secondary') || [];
  const decisions = player.decisionLog || [];
  const pnjs = player.encounteredPNJs || [];

  return (
    <div className="p-1 h-full flex flex-col flex-grow">
      <Tabs defaultValue="main" className="w-full flex-grow flex flex-col">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 shrink-0 mb-2">
          <TabsTrigger value="main"><Landmark className="w-4 h-4 mr-2" />Principales</TabsTrigger>
          <TabsTrigger value="secondary"><Swords className="w-4 h-4 mr-2" />Secondaires</TabsTrigger>
          <TabsTrigger value="decisions"><Speech className="w-4 h-4 mr-2" />Décisions</TabsTrigger>
          <TabsTrigger value="pnj"><Users className="w-4 h-4 mr-2" />PNJ & Relations</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-grow pr-3 min-h-0">
          <TabsContent value="main" className="mt-0 pt-2">
            {mainQuests.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {mainQuests.map(quest => (
                  <AccordionItem value={quest.id} key={quest.id} className="border-b-0 mb-1">
                     <QuestCard quest={quest} />
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <Card className="mt-4"><CardContent className="pt-6 text-center text-muted-foreground">Aucune quête principale en cours.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="secondary" className="mt-0 pt-2">
            {secondaryQuests.length > 0 ? (
               <Accordion type="single" collapsible className="w-full">
                {secondaryQuests.map(quest => (
                  <AccordionItem value={quest.id} key={quest.id} className="border-b-0 mb-1">
                     <QuestCard quest={quest} />
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <Card className="mt-4"><CardContent className="pt-6 text-center text-muted-foreground">Aucune quête secondaire.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="decisions" className="mt-0 pt-2">
            {decisions.length > 0 ? (
              decisions.map(decision => <DecisionCard key={decision.id} decision={decision} />)
            ) : (
              <Card className="mt-4"><CardContent className="pt-6 text-center text-muted-foreground">Aucune décision majeure enregistrée.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="pnj" className="mt-0 pt-2">
            {pnjs.length > 0 ? (
              pnjs.map(pnj => <PNJCard key={pnj.id} pnj={pnj} />)
            ) : (
              <Card className="mt-4"><CardContent className="pt-6 text-center text-muted-foreground">Aucun PNJ notable rencontré pour l'instant.</CardContent></Card>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default QuestJournalDisplay;
