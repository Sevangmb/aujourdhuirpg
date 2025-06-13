
"use client";

import type { Player, InventoryItem, InventoryItemType } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InventoryItemCard from './InventoryItemCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Shirt, Utensils, KeyRound, MonitorSmartphone, Archive, Drama } from 'lucide-react';

interface InventoryDisplayProps {
  inventory: InventoryItem[];
}

const itemTypeCategories: InventoryItemType[] = ['wearable', 'consumable', 'key', 'electronic', 'quest', 'misc'];

const categoryIcons: Record<InventoryItemType, React.ElementType> = {
  wearable: Shirt,
  consumable: Utensils,
  key: KeyRound,
  electronic: MonitorSmartphone,
  quest: Drama,
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
    // Removed p-1, flex-grow as parent (RightSidebar -> ScrollArea -> TabsContent) handles padding/layout
    <Tabs defaultValue="all" className="w-full flex-grow flex flex-col h-full"> {/* ensure h-full for flex layout */}
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 mb-1 shrink-0">
          <TabsTrigger value="all" className="text-xs p-1.5"><Package className="w-3 h-3 mr-1 inline-block" />Tout</TabsTrigger>
          {itemTypeCategories.map(catType => {
            const Icon = categoryIcons[catType];
            return (
              <TabsTrigger key={catType} value={catType} className="text-xs p-1.5">
                <Icon className="w-3 h-3 mr-1 inline-block" />{categoryLabels[catType]}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ScrollArea is now parent in RightSidebar. This ScrollArea might be redundant or conflict.
            Let's assume the parent ScrollArea in RightSidebar is sufficient.
            If individual tab content needs to scroll independently, this would be needed inside each TabsContent.
            For now, simplifying by removing this inner ScrollArea.
        */}
        
          <TabsContent value="all" className="mt-0 flex-grow"> {/* Added flex-grow */}
            {inventory.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Votre inventaire est vide.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1">
                {inventory.map(item => <InventoryItemCard key={item.id + '-' + item.quantity} item={item} />)}
              </div>
            )}
          </TabsContent>

          {itemTypeCategories.map(catType => (
            <TabsContent key={catType} value={catType} className="mt-0 flex-grow">  {/* Added flex-grow */}
              {itemsByType(catType).length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucun objet de type "{categoryLabels[catType]}".</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1">
                  {itemsByType(catType).map(item => <InventoryItemCard key={item.id + '-' + item.quantity} item={item} />)}
                </div>
              )}
            </TabsContent>
          ))}
    </Tabs>
  );
};

export default InventoryDisplay;
