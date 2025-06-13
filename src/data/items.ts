
/**
 * @fileOverview Master list of all items available in the game.
 * This acts as the "item database".
 */
import type { MasterInventoryItem } from '@/lib/types';

export const ALL_ITEMS: MasterInventoryItem[] = [
  {
    id: 'smartphone_01',
    name: 'Smartphone',
    description: 'Un smartphone moderne, batterie presque pleine. Accès à internet limité en fonction du scénario.',
    type: 'electronic',
    iconName: 'Smartphone',
    stackable: false,
  },
  {
    id: 'wallet_01',
    name: 'Portefeuille',
    description: 'Contient une carte bancaire avec un solde modeste et quelques pièces d\'identité.',
    type: 'misc',
    iconName: 'Wallet',
    stackable: false,
  },
  {
    id: 'keys_apartment_01',
    name: "Clés d'appartement",
    description: "Un trousseau de clés qui semble ouvrir une porte quelque part dans votre ville de départ.",
    type: 'key',
    iconName: 'KeyRound',
    stackable: false,
  },
  {
    id: 'energy_bar_01',
    name: 'Barre énergétique',
    description: 'Une barre chocolatée aux céréales. Redonne un peu de vitalité.',
    type: 'consumable',
    iconName: 'Cookie', // Using Cookie as a stand-in for a food bar
    stackable: true,
  },
  {
    id: 'water_bottle_01',
    name: 'Bouteille d\'eau',
    description: 'Une petite bouteille d\'eau minérale (50cl).',
    type: 'consumable',
    iconName: 'GlassWater',
    stackable: true,
  },
  {
    id: 'notebook_pen_01',
    name: 'Carnet et Stylo',
    description: 'Un petit carnet et un stylo bille, utiles pour prendre des notes.',
    type: 'misc',
    iconName: 'NotebookPen',
    stackable: false,
  },
   {
    id: 'map_paris_01',
    name: 'Carte de Paris',
    description: 'Une carte touristique détaillée de Paris.',
    type: 'misc',
    iconName: 'Map',
    stackable: false,
  },
  {
    id: 'medkit_basic_01',
    name: 'Petite Trousse de Soins',
    description: 'Contient des pansements, un antiseptique. Pour les blessures légères.',
    type: 'consumable',
    iconName: 'BriefcaseMedical',
    stackable: true,
  },
  {
    id: 'mysterious_key_01',
    name: 'Clé Mystérieuse',
    description: 'Une vieille clé en fer ornée. Vous ne savez pas ce qu\'elle ouvre.',
    type: 'key',
    iconName: 'Key',
    stackable: false,
  },
  {
    id: 'data_stick_01',
    name: 'Clé USB Chiffrée',
    description: 'Une clé USB qui semble contenir des données protégées.',
    type: 'electronic',
    iconName: 'Usb',
    stackable: false,
  }
];

export function getMasterItemById(itemId: string): MasterInventoryItem | undefined {
  return ALL_ITEMS.find(item => item.id === itemId);
}
