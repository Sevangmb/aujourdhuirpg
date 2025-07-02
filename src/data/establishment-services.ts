import type { POIService } from '@/lib/types/poi-types';

export const ESTABLISHMENT_SERVICES: Record<string, POIService[]> = {
  // Boulangerie
  boulangerie: [
    {
      id: 'buy_sandwich',
      name: 'Acheter un sandwich',
      description: 'Un sandwich frais pour satisfaire votre faim.',
      cost: { min: 4, max: 8 },
      duration: 3,
      availability: { openingHours: '06:00-19:00', daysOfWeek: 'Mon-Sat' },
      resultingItemId: 'sandwich_jambon_beurre_01',
    },
    {
      id: 'buy_pastry',
      name: 'Prendre une pâtisserie',
      description: 'Croissant, pain au chocolat ou autre délice.',
      cost: { min: 1, max: 3 },
      duration: 2,
      availability: { openingHours: '06:00-12:00', daysOfWeek: 'Mon-Sun' },
      resultingItemId: 'croissant_01',
    },
  ],
  
  // Boucherie
  boucherie: [
    {
      id: 'buy_sausages',
      name: 'Acheter des saucisses artisanales',
      description: 'Saucisses fraîches du jour, spécialité locale.',
      cost: { min: 8, max: 15 },
      duration: 5,
      availability: { openingHours: '08:00-19:00', daysOfWeek: 'Tue-Sat' }
    },
  ],
  
  // Magasin de meubles
  meubles: [
    {
      id: 'buy_small_furniture',
      name: 'Acheter un accessoire déco',
      description: 'Lampe, coussin, ou petit meuble pour embellir votre espace.',
      cost: { min: 20, max: 150 },
      duration: 10,
      availability: { openingHours: '09:00-19:00', daysOfWeek: 'Mon-Sat' }
    },
  ],
  
  // Hôtel
  hotel: [
    {
      id: 'book_room_night',
      name: 'Réserver une chambre pour la nuit',
      description: 'Une nuit de repos dans un lit confortable.',
      cost: { min: 60, max: 200 },
      duration: 5,
      availability: { openingHours: '00:00-23:59', daysOfWeek: 'Mon-Sun' }
    },
  ],
  
  // Agence immobilière
  agence_immo: [
    {
      id: 'browse_rental_offers',
      name: 'Consulter les offres de location',
      description: 'Parcourir les appartements disponibles dans le quartier.',
      cost: { min: 0, max: 0 },
      duration: 20,
      availability: { openingHours: '09:00-18:00', daysOfWeek: 'Mon-Fri' }
    },
  ],
  
  // Café
  cafe: [
    {
      id: 'order_coffee',
      name: 'Commander un café',
      description: 'Expresso, cappuccino ou café au lait selon votre humeur.',
      cost: { min: 2, max: 5 },
      duration: 3,
      availability: { openingHours: '07:00-19:00', daysOfWeek: 'Mon-Sun' },
      resultingItemId: 'cafe_expresso_01',
    },
  ],
  
  // Pharmacie
  pharmacie: [
    {
      id: 'buy_basic_medicine',
      name: 'Acheter des médicaments de base',
      description: 'Aspirine, pansements, désinfectant...',
      cost: { min: 3, max: 15 },
      duration: 5,
      availability: { openingHours: '08:30-19:30', daysOfWeek: 'Mon-Sat' },
      resultingItemId: 'pansement_boite_01',
    },
  ],
  
  // Banque
  banque: [
    {
      id: 'withdraw_money',
      name: 'Retirer de l\'argent au DAB',
      description: 'Retrait d\'espèces au distributeur automatique.',
      cost: { min: 0, max: 2 }, // Frais éventuels
      duration: 2,
      requirements: [{ type: 'bank_card', value: 'required' }],
      availability: { openingHours: '00:00-23:59', daysOfWeek: 'Mon-Sun' }
    },
  ]
};
