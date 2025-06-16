
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
    value: 150, // Potential resale value
  },
  {
    id: 'wallet_01',
    name: 'Portefeuille',
    description: 'Contient une carte bancaire avec un solde modeste et quelques pièces d\'identité.',
    type: 'misc',
    iconName: 'Wallet',
    stackable: false,
    value: 5, // Value of wallet itself if found/sold empty
  },
  {
    id: 'keys_apartment_01',
    name: "Clés d'appartement",
    description: "Un trousseau de clés qui semble ouvrir une porte quelque part dans votre ville de départ.",
    type: 'key',
    iconName: 'KeyRound',
    stackable: false,
    // No monetary value typically
  },
  {
    id: 'energy_bar_01',
    name: 'Barre énergétique',
    description: 'Une barre chocolatée aux céréales. Redonne un peu de vitalité.',
    type: 'consumable',
    iconName: 'Cookie',
    stackable: true,
    value: 3, // Purchase/sell price per bar
  },
  {
    id: 'water_bottle_01',
    name: 'Bouteille d\'eau',
    description: 'Une petite bouteille d\'eau minérale (50cl).',
    type: 'consumable',
    iconName: 'GlassWater',
    stackable: true,
    value: 1, // Purchase/sell price
  },
  {
    id: 'notebook_pen_01',
    name: 'Carnet et Stylo',
    description: 'Un petit carnet et un stylo bille, utiles pour prendre des notes.',
    type: 'misc',
    iconName: 'NotebookPen',
    stackable: false,
    value: 4, // Purchase/sell price
  },
   {
    id: 'map_paris_01',
    name: 'Carte de Paris',
    description: 'Une carte touristique détaillée de Paris.',
    type: 'misc',
    iconName: 'Map',
    stackable: false,
    value: 7, // Purchase/sell price
  },
  {
    id: 'medkit_basic_01',
    name: 'Petite Trousse de Soins',
    description: 'Contient des pansements, un antiseptique. Pour les blessures légères.',
    type: 'consumable',
    iconName: 'BriefcaseMedical',
    stackable: true, // Typically one kit, but could be multiple small ones
    value: 15, // Purchase/sell price
  },
  {
    id: 'mysterious_key_01',
    name: 'Clé Mystérieuse',
    description: 'Une vieille clé en fer ornée. Vous ne savez pas ce qu\'elle ouvre.',
    type: 'key',
    iconName: 'Key',
    stackable: false,
    // Likely no direct monetary value, tied to quest/progression
  },
  {
    id: 'data_stick_01',
    name: 'Clé USB Chiffrée',
    description: 'Une clé USB qui semble contenir des données protégées.',
    type: 'electronic',
    iconName: 'Usb',
    stackable: false,
    value: 25, // Value if sold, or if it contains valuable data
  },
  {
    id: 'ancient_coin_01',
    name: 'Pièce Ancienne',
    description: 'Une pièce de monnaie usée, d\'une époque révolue. Pourrait avoir de la valeur.',
    type: 'misc',
    iconName: 'CircleDollarSign',
    stackable: true,
    value: 50, // Value if sold to a collector
  },
  {
    id: 'encrypted_laptop_01',
    name: 'Ordinateur Portable Chiffré',
    description: 'Un ordinateur portable qui nécessite un mot de passe pour accéder à son contenu.',
    type: 'electronic',
    iconName: 'Laptop',
    stackable: false,
    // Value depends on content, or if sold as hardware
  },
  {
    id: 'worn_leather_jacket_01',
    name: 'Veste en Cuir Usée',
    description: 'Une veste en cuir qui a vécu, offrant une protection modeste et un certain style.',
    type: 'wearable',
    iconName: 'Shirt', // Placeholder, ideal icon would be specific to jacket
    stackable: false,
    value: 40, // Resale value
  },
  {
    id: 'research_notes_quest_01',
    name: 'Notes de Recherche (Quête)',
    description: 'Des pages de notes griffonnées concernant une affaire ou un mystère en cours.',
    type: 'quest',
    iconName: 'FileText',
    stackable: false,
    // No direct monetary value, quest critical
  },
  {
    id: 'painkillers_01',
    name: 'Antidouleurs',
    description: 'Quelques comprimés pour soulager une douleur modérée.',
    type: 'consumable',
    iconName: 'Pill',
    stackable: true,
    value: 10, // Purchase/sell price
  }
];

export function getMasterItemById(itemId: string): MasterInventoryItem | undefined {
  return ALL_ITEMS.find(item => item.id === itemId);
}
