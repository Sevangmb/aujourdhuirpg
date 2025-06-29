
"use client";
import React from 'react';
import type { HistoricalContact } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { defaultAvatarUrl } from '@/data/initial-game-data';

interface ContactCardProps {
  contact: HistoricalContact;
  onSelect: (contactId: string) => void;
  isSelected: boolean;
}

const ContactCard: React.FC<ContactCardProps> = ({ contact, onSelect, isSelected }) => {
  return (
    <Card
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors",
        isSelected && "bg-muted border-primary"
      )}
      onClick={() => onSelect(contact.id)}
    >
      <CardHeader className="flex flex-row items-center gap-4 p-3">
        <Avatar>
          <AvatarImage src={contact.historical.thumbnail || defaultAvatarUrl} alt={contact.modern.name} />
          <AvatarFallback>{contact.modern.name.substring(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="grid gap-1">
          <CardTitle className="text-sm font-semibold">{contact.modern.name}</CardTitle>
          <CardDescription className="text-xs">
            Lié à {contact.historical.name}
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
};

export default ContactCard;
