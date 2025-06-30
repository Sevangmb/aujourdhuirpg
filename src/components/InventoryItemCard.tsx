
"use client";

import React from 'react';
import type { IntelligentItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import * as LucideIcons from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Euro, Star } from 'lucide-react';

interface InventoryItemCardProps {
  item: IntelligentItem;
}

const InventoryItemCard: React.FC<InventoryItemCardProps> = ({ item }) => {
  const IconComponent = (LucideIcons as any)[item.iconName] || LucideIcons.Package;
  const xpPercentage = item.xpToNextItemLevel > 0 ? (item.itemXp / item.xpToNextItemLevel) * 100 : 0;

  const localValue = item.contextual_properties.local_value;
  const baseValue = item.economics.base_value;
  const valueColor = localValue > baseValue 
    ? 'text-green-600 bg-green-100/50' 
    : localValue < baseValue 
    ? 'text-red-600 bg-red-100/50' 
    : 'text-muted-foreground bg-muted/50';

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-150 flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between space-x-3 pb-2 pt-3 px-4">
        <div className="flex items-center space-x-3">
            <IconComponent className="w-6 h-6 text-primary" />
            <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-md font-semibold cursor-help">{item.name}</CardTitle>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start">
                    <div className="max-w-xs text-xs space-y-1">
                        <p><strong>Acquis :</strong> {item.memory.acquisitionStory}</p>
                        {item.memory.usageHistory.length > 0 && (
                            <p>
                                <strong>Dernier usage :</strong> {item.memory.usageHistory[item.memory.usageHistory.length - 1].event}
                            </p>
                        )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {item.stackable && item.quantity > 1 && (
                <CardDescription className="text-xs">Quantité: {item.quantity}</CardDescription>
              )}
            </div>
        </div>
         <div className={`flex items-center text-xs font-semibold rounded-full px-2 py-0.5 ${valueColor}`}>
            <Euro className="w-3 h-3 mr-1" />
            {localValue.toFixed(2)}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 flex-grow flex flex-col justify-between">
        <p className="text-xs text-muted-foreground mb-2 min-h-[40px]">{item.description}</p>
        <div className="space-y-2">
           <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Type:</span> {item.type} | <span className="font-medium text-foreground">Usages:</span> {item.memory.usageHistory.length}</p>
           <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">État</Label>
                      <Progress value={item.condition.durability} className="h-1.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Durabilité: {item.condition.durability}%</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
           </div>
            {item.xpToNextItemLevel > 0 && (
            <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                       <div className="flex justify-between items-center">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center">
                          <Star className="w-3 h-3 mr-1 text-yellow-500" />
                          Niveau {item.itemLevel}
                        </Label>
                        <Label className="text-xs font-medium text-muted-foreground">
                          XP: {item.itemXp}/{item.xpToNextItemLevel}
                        </Label>
                      </div>
                      <Progress value={xpPercentage} className="h-1.5 [&>div]:bg-yellow-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Expérience de l'objet: {item.itemXp} / {item.xpToNextItemLevel}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
           </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryItemCard;
