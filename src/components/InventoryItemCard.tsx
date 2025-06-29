
"use client";

import React from 'react';
import type { InventoryItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import * as LucideIcons from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InventoryItemCardProps {
  item: InventoryItem;
}

const InventoryItemCard: React.FC<InventoryItemCardProps> = ({ item }) => {
  const IconComponent = (LucideIcons as any)[item.iconName] || LucideIcons.Package;

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-150 flex flex-col">
      <CardHeader className="flex flex-row items-center space-x-3 pb-2 pt-3 px-4">
        <IconComponent className="w-6 h-6 text-primary" />
        <div>
          <CardTitle className="text-md font-semibold">{item.name}</CardTitle>
          {item.stackable && item.quantity > 1 && (
            <CardDescription className="text-xs">Quantité: {item.quantity}</CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 flex-grow flex flex-col justify-between">
        <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
        <div className="space-y-2">
           <p className="text-xs mt-1"><span className="font-medium">Type:</span> {item.type} | <span className="font-medium">Usages:</span> {item.usageCount}</p>
           <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">État</Label>
                      <Progress value={item.condition} className="h-1.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Condition: {item.condition}%</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
           </div>
            <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">Expérience</Label>
                      <Progress value={item.experience % 100} className="h-1.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Expérience: {item.experience}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
           </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryItemCard;
