
"use client";

import type { Player, Quest, PNJ, MajorDecision } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { CircleDot, CircleCheck, CircleX, BookUser, Landmark, Swords, Users, Speech, Lightbulb, ShieldAlert, History, MapPin, Info, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { getMasterItemById } from '@/data/items';

interface QuestJournalDisplayProps {
  player: Player;
}

const QuestObjectiveDisplay: React.FC<{ objective: { id: string; description: string; isCompleted: boolean } }> = ({ objective }) => (
  <li className="flex items-center text-xs py-0.5">
    {objective.isCompleted ? <CircleCheck className="w-3 h-3 mr-1.5 text-green-500 shrink-0" /> : <CircleDot className="w-3 h-3 mr-1.5 text-yellow-500 shrink-0" />}
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
  else if (quest.status === 'inactive') { statusBadgeVariant = "secondary"; StatusIcon = Info; }


  const getQuestTypeLabel = (type: Quest['type']) => {
    switch(type) {
      case 'main': return 'Principale';
      case 'secondary': return 'Secondaire';
      case 'job': return 'Job';
      default: return 'Quête';
    }
  }


  return (
    <Card className="mb-2 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-2.5 pb-1.5">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-md font-headline text-primary/90">{quest.title}</CardTitle>
            <CardDescription className="text-xs">
              {getQuestTypeLabel(quest.type)} - {quest.dateAdded ? format(new Date(quest.dateAdded), 'dd/MM/yy', { locale: fr }) : ''}
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
        {(quest.rewardDescription || quest.rewards) && (
            <CardFooter className="text-xs p-2.5 pt-1 flex-col items-start space-y-1">
                <p className="font-semibold">Récompense:</p>
                <div className="pl-2">
                    {quest.rewardDescription && <p className="italic text-muted-foreground">"{quest.rewardDescription}"</p>}
                    {quest.rewards?.money && <p>+ {quest.rewards.money}€</p>}
                    {quest.rewards?.xp && <p>+ {quest.rewards.xp} XP</p>}
                    {quest.rewards?.reputation && <p>+ {quest.rewards.reputation} Réputation</p>}
                    {quest.rewards?.items && quest.rewards.items.map(item => <p key={item.itemId}>+ {item.quantity}x {getMasterItemById(item.itemId)?.name || item.itemId}</p>)}
                </div>
            </CardFooter>
        )}
        {quest.status === 'completed' && quest.dateCompleted && (
                <CardFooter className="text-xs p-2.5 pt-0 text-green-600">
                    Terminée le: {format(new Date(quest.dateCompleted), 'dd/MM/yy', { locale: fr })}
                </CardFooter>
            )}
        {quest.status === 'failed' && quest.dateCompleted && (
            <CardFooter className="text-xs p-2.5 pt-0 text-red-600">
                Échouée le: {format(new Date(quest.dateCompleted), 'dd/MM/yy', { locale: fr })}
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
        <CardDescription className="text-xs flex flex-wrap gap-x-2">
          {pnj.importance}
          {pnj.firstEncountered && ` - Rencontré: ${pnj.firstEncountered}`}
          {pnj.lastSeen && ` - Vu: ${format(new Date(pnj.lastSeen), 'dd/MM/yy HH:mm', { locale: fr })}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-xs p-2.5 space-y-1">
        <p className="italic text-muted-foreground">"{pnj.description}"</p>
        <p><span className="font-semibold">Relation:</span> <span className={relationColor}>{pnj.relationStatus}</span></p>
        {typeof pnj.trustLevel === 'number' && <p><span className="font-semibold">Confiance:</span> {pnj.trustLevel}/100</p>}

        {typeof pnj.dispositionScore === 'number' && (
          <p>
            <span className="font-semibold">Disposition: </span>
            <span className={
              pnj.dispositionScore > 50 ? "text-green-500 font-medium" :
              pnj.dispositionScore > 0 ? "text-lime-600 font-medium" :
              pnj.dispositionScore === 0 ? "text-yellow-600 font-medium" :
              pnj.dispositionScore < -50 ? "text-red-600 font-medium" :
              "text-orange-500 font-medium" // For scores between -1 and -50
            }>
              {
                pnj.dispositionScore > 50 ? "Amical" :
                pnj.dispositionScore > 0 ? "Positif" :
                pnj.dispositionScore === 0 ? "Neutre" :
                pnj.dispositionScore < -50 ? "Hostile" :
                "Méfiance"
              }
            </span>
            <span className="text-muted-foreground text-xs"> ({pnj.dispositionScore})</span>
          </p>
        )}

        {pnj.interactionHistory && pnj.interactionHistory.length > 0 && (
          <p className="mt-0.5">
            <span className="font-semibold">Dernière interaction:</span>
            <span className="italic text-muted-foreground"> "{pnj.interactionHistory[pnj.interactionHistory.length - 1]}"</span>
          </p>
        )}

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
      <CardDescription className="text-xs flex flex-wrap">
        Date: {decision.dateMade ? format(new Date(decision.dateMade), 'dd/MM/yy HH:mm', { locale: fr }) : ''}
      </CardDescription>
    </CardHeader>
    <CardContent className="text-xs p-2.5 space-y-1">
      <p><span className="font-semibold">Contexte:</span> {decision.scenarioContext}</p>
      <p><span className="font-semibold">Conséquence:</span> {decision.outcome}</p>
    </CardContent>
  </Card>
);

const QuestCategorySection: React.FC<{ quests: Quest[]; categoryTitle: string }> = ({ quests, categoryTitle }) => {
  const active = quests.filter(q => q.status === 'active');
  const inactive = quests.filter(q => q.status === 'inactive');
  const archived = quests.filter(q => q.status === 'completed' || q.status === 'failed');

  if (quests.length === 0) {
    return <Card className="mt-2"><CardContent className="pt-6 text-center text-muted-foreground">Aucune quête de type {categoryTitle}.</CardContent></Card>;
  }

  return (
    <Accordion type="multiple" defaultValue={['active_quests']} className="w-full">
      {active.length > 0 && (
        <AccordionItem value="active_quests">
          <AccordionTrigger className="text-sm">Actives ({active.length})</AccordionTrigger>
          <AccordionContent className="p-1">
            {active.map(q => <QuestCard quest={q} key={q.id} />)}
          </AccordionContent>
        </AccordionItem>
      )}
      {inactive.length > 0 && (
        <AccordionItem value="available_quests">
          <AccordionTrigger className="text-sm">Disponibles ({inactive.length})</AccordionTrigger>
           <AccordionContent className="p-1">
            {inactive.map(q => <QuestCard quest={q} key={q.id} />)}
          </AccordionContent>
        </AccordionItem>
      )}
      {archived.length > 0 && (
        <AccordionItem value="archived_quests">
          <AccordionTrigger className="text-sm">Archivées ({archived.length})</AccordionTrigger>
           <AccordionContent className="p-1">
            {archived.map(q => <QuestCard quest={q} key={q.id} />)}
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
};


const QuestJournalDisplay: React.FC<QuestJournalDisplayProps> = ({ player }) => {
  if (!player) return <p className="p-4 text-muted-foreground">Données du joueur non disponibles.</p>;

  const mainQuests = player.questLog?.filter(q => q.type === 'main') || [];
  const secondaryQuests = player.questLog?.filter(q => q.type === 'secondary') || [];
  const jobs = player.questLog?.filter(q => q.type === 'job') || [];
  const decisions = player.decisionLog || [];
  const pnjs = player.encounteredPNJs || [];

  return (
    <Tabs defaultValue="main" className="w-full flex flex-col h-full"> 
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 shrink-0 mb-1">
            <TabsTrigger value="main" className="text-xs p-1.5" aria-label={`Quêtes Principales actives (${mainQuests.filter(q=>q.status === 'active').length})`}><Landmark className="w-4 h-4 mr-1" />Principales</TabsTrigger>
            <TabsTrigger value="secondary" className="text-xs p-1.5" aria-label={`Quêtes Secondaires actives (${secondaryQuests.filter(q=>q.status === 'active').length})`}><Swords className="w-4 h-4 mr-1" />Secondaires</TabsTrigger>
            <TabsTrigger value="jobs" className="text-xs p-1.5" aria-label={`Jobs disponibles (${jobs.filter(q=>q.status === 'active' || q.status === 'inactive').length})`}><Briefcase className="w-4 h-4 mr-1" />Jobs</TabsTrigger>
            <TabsTrigger value="decisions" className="text-xs p-1.5" aria-label={`Décisions prises (${decisions.length})`}><Speech className="w-4 h-4 mr-1" />Décisions</TabsTrigger>
            <TabsTrigger value="pnj" className="text-xs p-1.5" aria-label={`PNJ rencontrés (${pnjs.length})`}><Users className="w-4 h-4 mr-1" />PNJ</TabsTrigger>
        </TabsList>
        
        <TabsContent value="main" className="mt-0 pt-1 flex-1 min-h-0"> 
          <QuestCategorySection quests={mainQuests} categoryTitle="principale" />
        </TabsContent>

        <TabsContent value="secondary" className="mt-0 pt-1 flex-1 min-h-0"> 
           <QuestCategorySection quests={secondaryQuests} categoryTitle="secondaire" />
        </TabsContent>

        <TabsContent value="jobs" className="mt-0 pt-1 flex-1 min-h-0"> 
           <QuestCategorySection quests={jobs} categoryTitle="de job" />
        </TabsContent>

        <TabsContent value="decisions" className="mt-0 pt-1 flex-1 min-h-0"> 
            {decisions.length > 0 ? (
              [...decisions].sort((a,b) => new Date(b.dateMade).getTime() - new Date(a.dateMade).getTime()).map(decision => <DecisionCard key={decision.id} decision={decision} />)
            ) : (
              <Card className="mt-2"><CardContent className="pt-6 text-center text-muted-foreground">Aucune décision majeure.</CardContent></Card>
            )}
        </TabsContent>

        <TabsContent value="pnj" className="mt-0 pt-1 flex-1 min-h-0"> 
            {pnjs.length > 0 ? (
              [...pnjs].sort((a,b) => new Date(b.lastSeen || 0).getTime() - new Date(a.lastSeen || 0).getTime()).map(pnj => <PNJCard key={pnj.id} pnj={pnj} />)
            ) : (
              <Card className="mt-2"><CardContent className="pt-6 text-center text-muted-foreground">Aucun PNJ rencontré.</CardContent></Card>
            )}
        </TabsContent>
    </Tabs>
  );
};

export default QuestJournalDisplay;
