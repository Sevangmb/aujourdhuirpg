
"use client";

import React from 'react';
import type { InventoryItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import * as LucideIcons from 'lucide-react';

interface InventoryItemCardProps {
  item: InventoryItem;
}

const InventoryItemCard: React.FC<InventoryItemCardProps> = ({ item }) => {
  const IconComponent = (LucideIcons as any)[item.iconName] || LucideIcons.Package;

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-150">
      <CardHeader className="flex flex-row items-center space-x-3 pb-2 pt-3 px-4">
        <IconComponent className="w-6 h-6 text-primary" />
        <div>
          <CardTitle className="text-md font-semibold">{item.name}</CardTitle>
          {item.quantity > 1 && (
            <CardDescription className="text-xs">Quantité: {item.quantity}</CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <p className="text-xs text-muted-foreground">{item.description}</p>
        <p className="text-xs mt-1"><span className="font-medium">Type:</span> {item.type}</p>
      </CardContent>
    </Card>
  );
};

export default InventoryItemCard;
