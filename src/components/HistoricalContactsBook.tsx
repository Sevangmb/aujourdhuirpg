
"use client";

import React, { useState } from 'react';
import type { HistoricalContact } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import ContactCard from './ContactCard';
import ContactDetailView from './ContactDetailView';

interface HistoricalContactsBookProps {
  contacts: HistoricalContact[];
}

const HistoricalContactsBook: React.FC<HistoricalContactsBookProps> = ({ contacts }) => {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const selectedContact = contacts.find(c => c.id === selectedContactId) || null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[75vh]">
      <div className="col-span-1 flex flex-col">
          <h3 className="text-lg font-semibold pl-2 mb-2">Contacts Rencontrés</h3>
          <ScrollArea className="flex-grow pr-2">
            <div className="space-y-2">
              {contacts.length > 0 ? (
                contacts.map(contact => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onSelect={setSelectedContactId}
                    isSelected={contact.id === selectedContactId}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center p-4">
                  Vous n'avez encore rencontré personne d'intéressant. Explorez le monde !
                </p>
              )}
            </div>
          </ScrollArea>
      </div>

      <div className="col-span-1 md:col-span-2">
        <ContactDetailView contact={selectedContact} />
      </div>
    </div>
  );
};

export default HistoricalContactsBook;
