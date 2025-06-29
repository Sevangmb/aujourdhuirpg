
"use client";

import React from 'react';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ReceiptText, Banknote, CalendarDays, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

interface FinancialsDisplayProps {
  transactions: Transaction[];
  currentBalance: number;
}

const getCategoryInfo = (category: string) => {
    switch (category) {
        case 'quest_reward': return { label: 'Récompense', color: 'bg-green-100 text-green-800' };
        case 'salary': return { label: 'Salaire', color: 'bg-blue-100 text-blue-800' };
        case 'sold_item': return { label: 'Vente', color: 'bg-yellow-100 text-yellow-800' };
        case 'food_drinks': return { label: 'Nourriture', color: 'bg-orange-100 text-orange-800' };
        case 'shopping': return { label: 'Achat', color: 'bg-purple-100 text-purple-800' };
        case 'transport': return { label: 'Transport', color: 'bg-indigo-100 text-indigo-800' };
        case 'quest_expense': return { label: 'Dépense Quête', color: 'bg-red-100 text-red-800' };
        default: return { label: category, color: 'bg-gray-100 text-gray-800' };
    }
}

const FinancialsDisplay: React.FC<FinancialsDisplayProps> = ({ transactions, currentBalance }) => {
  if (!transactions) {
    return <p className="p-4 text-muted-foreground">Données financières non disponibles.</p>;
  }

  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <Card className="flex flex-col h-full">
        <CardHeader className="flex-shrink-0">
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="text-lg">Relevé de Compte</CardTitle>
                    <CardDescription className="text-xs">Historique de vos transactions.</CardDescription>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Solde Actuel</p>
                    <p className="text-2xl font-bold text-primary">{currentBalance.toFixed(2)} €</p>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-grow p-0 overflow-hidden">
            <ScrollArea className="h-full">
                <Table>
                    <TableHeader className="sticky top-0 bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[80px] text-xs">Type</TableHead>
                            <TableHead className="text-xs">Description</TableHead>
                            <TableHead className="text-right text-xs">Montant</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedTransactions.length > 0 ? sortedTransactions.map(tx => {
                            const isIncome = tx.amount > 0;
                            const categoryInfo = getCategoryInfo(tx.category);
                            return (
                                <TableRow key={tx.id}>
                                    <TableCell>
                                        {isIncome ? 
                                            <TrendingUp className="w-5 h-5 text-green-500" /> : 
                                            <TrendingDown className="w-5 h-5 text-red-500" />
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium text-sm">{tx.description}</p>
                                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                                            <Badge variant="secondary" className={`text-xs font-normal ${categoryInfo.color}`}>{categoryInfo.label}</Badge>
                                            <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3"/>{format(new Date(tx.timestamp), 'dd/MM/yy', { locale: fr })}</span>
                                            {tx.locationName && <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{tx.locationName}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className={`text-right font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                        {isIncome ? '+' : ''}{tx.amount.toFixed(2)} €
                                    </TableCell>
                                </TableRow>
                            )
                        }) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                    Aucune transaction pour le moment.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </CardContent>
    </Card>
  );
};

export default FinancialsDisplay;
