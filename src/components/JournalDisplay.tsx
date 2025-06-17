"use client";

import React from 'react';
import type { JournalEntry } from '@/lib/types'; // Assuming JournalEntry is exported from @/lib/types
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatGameTime } from '@/lib/utils/time-utils'; // Assuming a time formatting utility

interface JournalDisplayProps {
  journal: JournalEntry[];
}

// Helper to get a representative icon or emoji for entry types
const getEntryIcon = (type: JournalEntry['type']): string => {
  switch (type) {
    case 'location_change':
      return '🗺️'; // Map icon
    case 'event':
      return '✨'; // Sparkles for general events
    case 'player_action':
      return '🚶'; // Person walking for player actions
    case 'quest_update':
      return '📜'; // Scroll for quests
    case 'npc_interaction':
      return '💬'; // Speech bubble for NPC interactions
    case 'misc':
      return '📎'; // Paperclip for miscellaneous
    default:
      return '🔹'; // Default bullet
  }
};

const JournalDisplay: React.FC<JournalDisplayProps> = ({ journal }) => {
  if (!journal || journal.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Journal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aucune entrée dans le journal pour le moment.</p>
        </CardContent>
      </Card>
    );
  }

  // Sort journal entries, newest first by timestamp
  const sortedJournal = [...journal].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Journal</CardTitle>
        <CardDescription>Les événements récents de votre aventure.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] sm:h-[250px] md:h-[300px] pr-3">
          {sortedJournal.map((entry, index) => (
            <React.Fragment key={entry.id}>
              <div className="py-3">
                <p className="text-xs text-muted-foreground mb-0.5">
                  {getEntryIcon(entry.type)} {formatGameTime ? formatGameTime(entry.timestamp) : `Temps: ${entry.timestamp}`} - {entry.type}
                </p>
                <p className="text-sm leading-relaxed">{entry.text}</p>
                {entry.location && (
                  <p className="text-xs text-primary/80 mt-0.5">Lieu: {entry.location.name}</p>
                )}
              </div>
              {index < sortedJournal.length - 1 && <Separator />}
            </React.Fragment>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default JournalDisplay;
