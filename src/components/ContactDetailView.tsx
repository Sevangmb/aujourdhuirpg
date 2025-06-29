
"use client";
import React from 'react';
import type { HistoricalContact } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { ScrollArea } from './ui/scroll-area';
import { Building, BookText, Brain, Briefcase, MessagesSquare, ShieldQuestion } from 'lucide-react';

interface ContactDetailViewProps {
  contact: HistoricalContact | null;
}

const ContactDetailView: React.FC<ContactDetailViewProps> = ({ contact }) => {
  if (!contact) {
    return (
      <Card className="h-full flex items-center justify-center col-span-2">
        <CardContent className="text-center text-muted-foreground p-6">
          <p>Sélectionnez un contact pour voir les détails.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 md:col-span-2 h-full">
        <CardHeader className="p-4">
            <div className="flex items-start gap-4">
                <Image src={contact.historical.thumbnail || 'https://placehold.co/100x100.png'} alt={contact.historical.name} width={100} height={100} className="rounded-md border aspect-square object-cover" />
                <div>
                    <CardTitle className="text-lg font-headline">{contact.modern.name}</CardTitle>
                    <CardDescription className="text-xs">
                        {contact.modern.profession} ({contact.modern.age} ans)
                        <br />
                        Lien ({contact.modern.connectionType}) avec <strong>{contact.historical.name}</strong>
                    </CardDescription>
                     <p className="text-sm italic mt-2 text-muted-foreground">"{contact.modern.greeting}"</p>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
             <Tabs defaultValue="knowledge" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="knowledge"><Brain className="w-4 h-4 mr-1"/>Savoir</TabsTrigger>
                    <TabsTrigger value="historical"><Building className="w-4 h-4 mr-1"/>Histoire</TabsTrigger>
                    <TabsTrigger value="quests"><ShieldQuestion className="w-4 h-4 mr-1"/>Quêtes</TabsTrigger>
                </TabsList>
                <ScrollArea className="h-[40vh] mt-2">
                    <TabsContent value="knowledge" className="text-sm space-y-4 p-1">
                        <div>
                            <h4 className="font-semibold text-primary mb-1">Secrets</h4>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                {contact.knowledge.secrets.map((s, i) => <li key={`secret-${i}`}>{s}</li>)}
                            </ul>
                        </div>
                         <div>
                            <h4 className="font-semibold text-primary mb-1">Faits Historiques</h4>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                {contact.knowledge.historicalFacts.map((f, i) => <li key={`fact-${i}`}>{f}</li>)}
                            </ul>
                        </div>
                    </TabsContent>
                    <TabsContent value="historical" className="text-sm space-y-2 p-1">
                        <h4 className="font-semibold text-primary">{contact.historical.name}</h4>
                        <p className="text-xs text-muted-foreground">{contact.historical.occupation?.join(', ')} ({contact.historical.birth?.year} - {contact.historical.death?.year})</p>
                        <p className="text-xs">{contact.historical.extract}</p>
                         <a href={contact.historical.wikipediaUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">Voir sur Wikipedia</a>
                    </TabsContent>
                    <TabsContent value="quests" className="text-sm space-y-2 p-1">
                         <h4 className="font-semibold text-primary mb-1">Pistes de Quêtes</h4>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                {contact.knowledge.availableQuests.map((q, i) => <li key={`quest-${i}`}>{q}</li>)}
                            </ul>
                    </TabsContent>
                </ScrollArea>
             </Tabs>
        </CardContent>
    </Card>
  );
};

export default ContactDetailView;
