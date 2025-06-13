
"use client";

import type { Player, Quest, PNJ, MajorDecision, QuestObjective } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { CircleDot, CircleCheck, CircleX, BookUser, Landmark, Swords, Users, Speech, Lightbulb, ShieldAlert, History, MapPin, Info } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface QuestJournalDisplayProps {
  player: Player;
}

const QuestObjectiveDisplay: React.FC<{ objective: QuestObjective }> = ({ objective }) => (
  <li className="flex items-center text-xs py-0.5">
    {objective.isCompleted ? (
      <CircleCheck className="w-3 h-3 mr-1.5 text-green-500 shrink-0" />
    ) : (
      <CircleDot className="w-3 h-3 mr-1.5 text-yellow-500 shrink-0" />
    )}
    <span className={objective.isCompleted ? "line-through text-muted-foreground" : ""}>
      {objective.description}
    </span>
  </li>
);

const QuestCard: React.FC<{ quest: Quest }> = ({ quest }) => {
  let statusBadgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  let StatusIcon = Lightbulb;
  if (quest.status === 'completed') { statusBadgeVariant = "default"; StatusIcon = ShieldAlert; } 
  else if (quest.status === 'failed') { statusBadgeVariant = "destructive"; StatusIcon = CircleX; }
  else if (quest.status === 'active') { statusBadgeVariant = "outline"; StatusIcon = Lightbulb; }


  return (
    <Card className="mb-2 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-2.5 pb-1.5">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-md font-headline text-primary/90">{quest.title}</CardTitle>
            <CardDescription className="text-xs">
              {quest.type === 'main' ? 'Principale' : 'Secondaire'} - {format(new Date(quest.dateAdded), 'dd/MM/yy', { locale: fr })}
            </CardDescription>
          </div>
           <Badge variant={statusBadgeVariant} className="flex items-center gap-1 text-xs px-1.5 py-0.5">
            <StatusIcon className="w-2.5 h-2.5" />
            {quest.status.charAt(0).toUpperCase() + quest.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="text-xs p-2.5 space-y-1">
        <p className="italic text-muted-foreground">"{quest.description}"</p>
        {quest.giver && <p><span className="font-semibold">Donnée par:</span> {quest.giver}</p>}
        {quest.relatedLocation && <p className="flex items-center"><MapPin className="w-3 h-3 mr-1 text-muted-foreground" /> <span className="font-semibold">Lieu:</span> {quest.relatedLocation}</p>}

        {quest.objectives && quest.objectives.length > 0 && (
          <Accordion type="single" collapsible className="w-full mt-1">
            <AccordionItem value="objectives" className="border-b-0">
              <AccordionTrigger className="text-xs py-1 hover:no-underline font-semibold">Objectifs ({quest.objectives.filter(o => o.isCompleted).length}/{quest.objectives.length})</AccordionTrigger>
              <AccordionContent className="pt-0 pb-1">
                <ul className="list-none pl-1 space-y-0">
                  {quest.objectives.map(obj => <QuestObjectiveDisplay key={obj.id} objective={obj} />)}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
      {(quest.reward || quest.moneyReward) && (
        <CardFooter className="text-xs p-2.5 pt-1">
            <p>
                <span className="font-semibold">Récompense:</span>
                {quest.reward ? ` ${quest.reward}` : ""}
                {quest.moneyReward ? ` ${quest.moneyReward}€` : ""}
            </p>
        </CardFooter>
      )}
      {quest.status === 'completed' && quest.dateCompleted && (
        <CardFooter className="text-xs p-2.5 pt-0 text-green-600">
            Terminée le: {format(new Date(quest.dateCompleted), 'dd/MM/yy', { locale: fr })}
        </CardFooter>
      )}
       {quest.status === 'failed' && (
        <CardFooter className="text-xs p-2.5 pt-0 text-red-600">
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
    <Card className="mb-2 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-2.5 pb-1.5">
        <CardTitle className="text-md font-headline text-primary/90">{pnj.name}</CardTitle>
        <CardDescription className="text-xs">
          {pnj.importance} - Rencontré: {pnj.firstEncountered}
          {pnj.lastSeen && ` - Vu: ${format(new Date(pnj.lastSeen), 'dd/MM/yy HH:mm', { locale: fr })}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-xs p-2.5 space-y-1">
        <p className="italic text-muted-foreground">"{pnj.description}"</p>
        <p><span className="font-semibold">Relation:</span> <span className={relationColor}>{pnj.relationStatus}</span></p>
        {typeof pnj.trustLevel === 'number' && <p><span className="font-semibold">Confiance:</span> {pnj.trustLevel}/100</p>}
        {pnj.notes && pnj.notes.length > 0 && (
          <Accordion type="single" collapsible className="w-full mt-1">
            <AccordionItem value="notes" className="border-b-0">
                <AccordionTrigger className="text-xs py-1 hover:no-underline font-semibold">Notes</AccordionTrigger>
                <AccordionContent className="pt-0 pb-1">
                    <ul className="list-disc list-inside text-xs">
                    {pnj.notes.map((note, index) => <li key={index}>{note}</li>)}
                    </ul>
                </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

const DecisionCard: React.FC<{ decision: MajorDecision }> = ({ decision }) => (
  <Card className="mb-2 shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="p-2.5 pb-1.5">
      <CardTitle className="text-md font-headline text-primary/90">{decision.summary}</CardTitle>
      <CardDescription className="text-xs">
        Date: {format(new Date(decision.dateMade), 'dd/MM/yy HH:mm', { locale: fr })}
      </CardDescription>
    </CardHeader>
    <CardContent className="text-xs p-2.5 space-y-1">
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
    <Tabs defaultValue="main" className="w-full flex flex-col h-full"> {/* Removed flex-grow */}
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 shrink-0 mb-1">
          <TabsTrigger value="main" className="text-xs p-1.5"><Landmark className="w-3 h-3 mr-1" />Principales ({mainQuests.filter(q=>q.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="secondary" className="text-xs p-1.5"><Swords className="w-3 h-3 mr-1" />Secondaires ({secondaryQuests.filter(q=>q.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="decisions" className="text-xs p-1.5"><Speech className="w-3 h-3 mr-1" />Décisions ({decisions.length})</TabsTrigger>
          <TabsTrigger value="pnj" className="text-xs p-1.5"><Users className="w-3 h-3 mr-1" />PNJ ({pnjs.length})</TabsTrigger>
        </TabsList>
        
          <TabsContent value="main" className="mt-0 pt-1 flex-1"> {/* Use flex-1 */}
            {mainQuests.length > 0 ? (
                mainQuests.map(quest => <QuestCard quest={quest} key={quest.id} />)
            ) : (
              <Card className="mt-2"><CardContent className="pt-6 text-center text-muted-foreground">Aucune quête principale.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="secondary" className="mt-0 pt-1 flex-1"> {/* Use flex-1 */}
            {secondaryQuests.length > 0 ? (
                secondaryQuests.map(quest => <QuestCard quest={quest} key={quest.id} />)
            ) : (
              <Card className="mt-2"><CardContent className="pt-6 text-center text-muted-foreground">Aucune quête secondaire.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="decisions" className="mt-0 pt-1 flex-1"> {/* Use flex-1 */}
            {decisions.length > 0 ? (
              decisions.map(decision => <DecisionCard key={decision.id} decision={decision} />)
            ) : (
              <Card className="mt-2"><CardContent className="pt-6 text-center text-muted-foreground">Aucune décision majeure.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="pnj" className="mt-0 pt-1 flex-1"> {/* Use flex-1 */}
            {pnjs.length > 0 ? (
              pnjs.map(pnj => <PNJCard key={pnj.id} pnj={pnj} />)
            ) : (
              <Card className="mt-2"><CardContent className="pt-6 text-center text-muted-foreground">Aucun PNJ rencontré.</CardContent></Card>
            )}
          </TabsContent>
    </Tabs>
  );
};

export default QuestJournalDisplay;

