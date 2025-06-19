
"use client";

import type { Player, InventoryItem, InventoryItemType } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InventoryItemCard from './InventoryItemCard';
import { Package, Shirt, Utensils, KeyRound, MonitorSmartphone, Wrench, Archive, Drama } from 'lucide-react';

interface InventoryDisplayProps {
  inventory: InventoryItem[];
}

const itemTypeCategories: InventoryItemType[] = ['wearable', 'consumable', 'key', 'electronic', 'tool', 'quest', 'misc'];

const categoryIcons: Record<InventoryItemType, React.ElementType> = {
  wearable: Shirt,
  consumable: Utensils,
  key: KeyRound,
  electronic: MonitorSmartphone,
  tool: Wrench, 
  quest: Drama,
  misc: Archive,
};

const categoryLabels: Record<InventoryItemType, string> = {
  wearable: "Équipable",
  consumable: "Consommable",
  key: "Clés",
  electronic: "Électronique",
  tool: "Outils", 
  quest: "Quête",
  misc: "Divers",
};

const InventoryDisplay: React.FC<InventoryDisplayProps> = ({ inventory }) => {
  if (!inventory) return <p className="p-4 text-muted-foreground">Inventaire non disponible.</p>;

  const itemsByType = (type: InventoryItemType) => inventory.filter(item => item.type === type);

  return (
    <Tabs defaultValue="all" className="w-full flex flex-col h-full"> 
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-1 mb-1 shrink-0">
          <TabsTrigger value="all" className="text-xs p-1 sm:p-1.5"><Package className="w-3 h-3 mr-1 inline-block" />Tout</TabsTrigger>
          {itemTypeCategories.map(catType => {
            const Icon = categoryIcons[catType];
            return (
              <TabsTrigger key={catType} value={catType} className="text-xs p-1 sm:p-1.5">
                <Icon className="w-3 h-3 mr-1 inline-block" />{categoryLabels[catType]}
              </TabsTrigger>
            );
          })}
        </TabsList>
        
          <TabsContent value="all" className="mt-0 flex-1 min-h-0"> 
            {inventory.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Votre inventaire est vide.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 p-1">
                {inventory.map(item => <InventoryItemCard key={item.id + '-' + item.quantity} item={item} />)}
              </div>
            )}
          </TabsContent>

          {itemTypeCategories.map(catType => (
            <TabsContent key={catType} value={catType} className="mt-0 flex-1 min-h-0">  
              {itemsByType(catType).length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucun objet de type "{categoryLabels[catType]}".</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 p-1">
                  {itemsByType(catType).map(item => <InventoryItemCard key={item.id + '-' + item.quantity} item={item} />)}
                </div>
              )}
            </TabsContent>
          ))}
    </Tabs>
  );
};

export default InventoryDisplay;
