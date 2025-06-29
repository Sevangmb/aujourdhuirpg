
"use client";

import React from 'react';
import type { JournalEntry } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatGameTime } from '@/lib/utils/time-utils';
import { MapPin, Sparkles, User, Drama, MessageSquare, BookOpen, AlertCircle, FileText } from 'lucide-react';

interface JournalDisplayProps {
  journal: JournalEntry[];
}

const getEntryIcon = (type: JournalEntry['type']): React.ReactElement => {
    const props = { className: "w-4 h-4 text-muted-foreground" };
    switch (type) {
        case 'location_change': return <MapPin {...props} />;
        case 'event': return <Sparkles {...props} />;
        case 'player_action': return <User {...props} />;
        case 'quest_update': return <Drama {...props} />;
        case 'npc_interaction': return <MessageSquare {...props} />;
        default: return <FileText {...props} />;
    }
};

const JournalDisplay: React.FC<JournalDisplayProps> = ({ journal }) => {
  if (!journal || journal.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Journal de Bord</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aucune entrée dans le journal pour le moment.</p>
        </CardContent>
      </Card>
    );
  }

  const sortedJournal = [...journal].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Card className="flex-grow flex flex-col h-full">
      <CardHeader>
        <CardTitle>Journal de Bord</CardTitle>
        <CardDescription>Les événements récents de votre aventure.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full px-2 md:px-4">
          <div className="relative pl-6">
            <div className="absolute left-[11px] h-full w-0.5 bg-border -z-10"></div>
            {sortedJournal.map((entry, index) => (
              <div key={entry.id} className="relative py-4">
                <div className="absolute left-[-1.2rem] top-4 h-6 w-6 bg-background flex items-center justify-center rounded-full border-2 border-border">
                  {getEntryIcon(entry.type)}
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  {formatGameTime ? formatGameTime(entry.timestamp) : `Temps: ${entry.timestamp}`}
                </p>
                <p className="text-sm font-medium leading-relaxed">{entry.text}</p>
                {entry.location && (
                  <p className="text-xs text-primary/80 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3"/> {entry.location.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default JournalDisplay;
