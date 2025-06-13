
"use client";

import type { Player, InventoryItem, InventoryItemType } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InventoryItemCard from './InventoryItemCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Shirt, Utensils, KeyRound, MonitorSmartphone, Archive, Drama /* For quest items as Drama/theater masks */ } from 'lucide-react';

interface InventoryDisplayProps {
  inventory: InventoryItem[];
}

const itemTypeCategories: InventoryItemType[] = ['wearable', 'consumable', 'key', 'electronic', 'quest', 'misc'];

const categoryIcons: Record<InventoryItemType, React.ElementType> = {
  wearable: Shirt,
  consumable: Utensils,
  key: KeyRound,
  electronic: MonitorSmartphone,
  quest: Drama, // Using Drama icon for quest items
  misc: Archive,
};

const categoryLabels: Record<InventoryItemType, string> = {
  wearable: "Équipable",
  consumable: "Consommable",
  key: "Clés",
  electronic: "Électronique",
  quest: "Quête",
  misc: "Divers",
};

const InventoryDisplay: React.FC<InventoryDisplayProps> = ({ inventory }) => {
  if (!inventory) return <p className="p-4 text-muted-foreground">Inventaire non disponible.</p>;

  const itemsByType = (type: InventoryItemType) => inventory.filter(item => item.type === type);

  return (
    <div className="p-1 h-full flex flex-col flex-grow"> {/* Added flex-grow */}
      <Tabs defaultValue="all" className="w-full flex-grow flex flex-col">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 mb-2 shrink-0"> {/* Adjusted grid for more tabs */}
          <TabsTrigger value="all" className="text-xs sm:text-sm"><Package className="w-4 h-4 mr-1 sm:mr-2 inline-block" />Tout</TabsTrigger>
          {itemTypeCategories.map(catType => {
            const Icon = categoryIcons[catType];
            return (
              <TabsTrigger key={catType} value={catType} className="text-xs sm:text-sm">
                <Icon className="w-4 h-4 mr-1 sm:mr-2 inline-block" />{categoryLabels[catType]}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <ScrollArea className="flex-grow pr-3 min-h-0"> {/* Added min-h-0 for flexbox scroll */}
          <TabsContent value="all">
            {inventory.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Votre inventaire est vide.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {inventory.map(item => <InventoryItemCard key={item.id + '-' + item.quantity} item={item} />)}
              </div>
            )}
          </TabsContent>

          {itemTypeCategories.map(catType => (
            <TabsContent key={catType} value={catType}>
              {itemsByType(catType).length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucun objet de type "{categoryLabels[catType]}".</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {itemsByType(catType).map(item => <InventoryItemCard key={item.id + '-' + item.quantity} item={item} />)}
                </div>
              )}
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default InventoryDisplay;
