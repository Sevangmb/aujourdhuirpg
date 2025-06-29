
"use client";

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, Search, Eye, Loader2 } from 'lucide-react';

interface SimplePlayerInputFormProps {
  onSubmit: (actionText: string) => void;
  isLoading: boolean;
}

const SimplePlayerInputForm: React.FC<SimplePlayerInputFormProps> = ({ onSubmit, isLoading }) => {
  const [inputText, setInputText] = useState('');

  const handleQuickAction = (action: string) => {
    if (isLoading) return;
    onSubmit(action);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !inputText.trim()) return;
    onSubmit(inputText);
    setInputText('');
  };

  return (
    <div className="p-2 border-t bg-background">
      <div className="flex gap-2 mb-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1" 
          onClick={() => handleQuickAction('Observer')}
          disabled={isLoading}
        >
          <Eye className="mr-2 h-4 w-4" /> Observer
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1" 
          onClick={() => handleQuickAction('Chercher')}
          disabled={isLoading}
        >
          <Search className="mr-2 h-4 w-4" /> Chercher
        </Button>
      </div>
      <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Que faites-vous d'autre ?"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
          className="flex-grow"
        />
        <Button type="submit" disabled={isLoading || !inputText.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="sr-only">Envoyer</span>
        </Button>
      </form>
    </div>
  );
};

export default SimplePlayerInputForm;
