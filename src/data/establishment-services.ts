import type { POIService } from '@/lib/types/poi-types';

export const ESTABLISHMENT_SERVICES: Record<string, POIService[]> = {
  // Boulangerie
  boulangerie: [
    {
      id: 'buy_sandwich',
      name: 'Acheter un sandwich',
      description: 'Un sandwich frais pour satisfaire votre faim',
      cost: { min: 4, max: 8 },
      duration: 3,
      availability: { openingHours: '06:00-19:00', daysOfWeek: 'Mon-Sat' }
    },
    {
      id: 'buy_pastry',
      name: 'Prendre une pâtisserie',
      description: 'Croissant, pain au chocolat ou autre délice matinal',
      cost: { min: 1, max: 3 },
      duration: 2,
      availability: { openingHours: '06:00-12:00', daysOfWeek: 'Mon-Sun' }
    },
    {
      id: 'order_birthday_cake',
      name: 'Commander un gâteau personnalisé',
      description: 'Passer commande pour un événement spécial',
      cost: { min: 25, max: 80 },
      duration: 10,
      requirements: [{ type: 'advance_notice', value: '24h' }],
      availability: { openingHours: '08:00-18:00', daysOfWeek: 'Mon-Sat' }
    }
  ],
  
  // Boucherie
  boucherie: [
    {
      id: 'buy_sausages',
      name: 'Acheter des saucisses artisanales',
      description: 'Saucisses fraîches du jour, spécialité locale',
      cost: { min: 8, max: 15 },
      duration: 5,
      availability: { openingHours: '08:00-19:00', daysOfWeek: 'Tue-Sat' }
    },
    {
      id: 'buy_meat_selection',
      name: 'Sélectionner une pièce de viande',
      description: 'Choisir et faire préparer une belle pièce de bœuf ou porc',
      cost: { min: 15, max: 45 },
      duration: 8,
      availability: { openingHours: '08:00-19:00', daysOfWeek: 'Tue-Sat' }
    },
    {
      id: 'get_cooking_advice',
      name: 'Demander des conseils de cuisson',
      description: 'Obtenir les secrets du boucher pour réussir votre plat',
      cost: { min: 0, max: 0 },
      duration: 5,
      availability: { openingHours: '08:00-19:00', daysOfWeek: 'Tue-Sat' }
    }
  ],
  
  // Magasin de meubles
  meubles: [
    {
      id: 'browse_furniture',
      name: 'Parcourir la collection',
      description: 'Explorer les dernières tendances en mobilier',
      cost: { min: 0, max: 0 },
      duration: 15,
      availability: { openingHours: '09:00-19:00', daysOfWeek: 'Mon-Sat' }
    },
    {
      id: 'buy_small_furniture',
      name: 'Acheter un accessoire déco',
      description: 'Lampe, coussin, ou petit meuble pour embellir votre espace',
      cost: { min: 20, max: 150 },
      duration: 10,
      availability: { openingHours: '09:00-19:00', daysOfWeek: 'Mon-Sat' }
    },
    {
      id: 'order_custom_furniture',
      name: 'Commander du mobilier sur mesure',
      description: 'Faire concevoir une pièce unique selon vos goûts',
      cost: { min: 300, max: 2000 },
      duration: 25,
      requirements: [{ type: 'deposit', value: '30%' }, { type: 'delivery_time', value: '6-8 semaines' }],
      availability: { openingHours: '09:00-19:00', daysOfWeek: 'Mon-Sat' }
    }
  ],
  
  // Hôtel
  hotel: [
    {
      id: 'book_room_night',
      name: 'Réserver une chambre pour la nuit',
      description: 'Une nuit de repos dans un lit confortable',
      cost: { min: 60, max: 200 },
      duration: 5,
      availability: { openingHours: '00:00-23:59', daysOfWeek: 'Mon-Sun' }
    },
    {
      id: 'take_power_nap',
      name: 'Faire une sieste dans le lobby',
      description: 'Se reposer discrètement dans les espaces communs',
      cost: { min: 0, max: 0 },
      duration: 30,
      requirements: [{ type: 'stealth_check', difficulty: 40 }],
      availability: { openingHours: '00:00-23:59', daysOfWeek: 'Mon-Sun' }
    },
    {
      id: 'use_hotel_services',
      name: 'Utiliser les services de l\'hôtel',
      description: 'Spa, restaurant, ou conciergerie selon disponibilité',
      cost: { min: 15, max: 80 },
      duration: 45,
      availability: { openingHours: '07:00-22:00', daysOfWeek: 'Mon-Sun' }
    }
  ],
  
  // Agence immobilière
  agence_immo: [
    {
      id: 'browse_rental_offers',
      name: 'Consulter les offres de location',
      description: 'Parcourir les appartements disponibles dans le quartier',
      cost: { min: 0, max: 0 },
      duration: 20,
      availability: { openingHours: '09:00-18:00', daysOfWeek: 'Mon-Fri' }
    },
    {
      id: 'schedule_apartment_visit',
      name: 'Programmer une visite',
      description: 'Prendre rendez-vous pour visiter un bien immobilier',
      cost: { min: 0, max: 0 },
      duration: 10,
      requirements: [{ type: 'appointment', value: 'required' }],
      availability: { openingHours: '09:00-18:00', daysOfWeek: 'Mon-Fri' }
    },
    {
      id: 'rent_apartment',
      name: 'Louer un appartement',
      description: 'Finaliser la location d\'un logement',
      cost: { min: 500, max: 2500 },
      duration: 60,
      requirements: [
        { type: 'income_proof', value: 'required' },
        { type: 'deposit', value: '1-2 mois de loyer' },
        { type: 'guarantor', value: 'recommended' }
      ],
      availability: { openingHours: '09:00-18:00', daysOfWeek: 'Mon-Fri' }
    }
  ],
  
  // Café
  cafe: [
    {
      id: 'order_coffee',
      name: 'Commander un café',
      description: 'Expresso, cappuccino ou café au lait selon votre humeur',
      cost: { min: 2, max: 5 },
      duration: 3,
      availability: { openingHours: '07:00-19:00', daysOfWeek: 'Mon-Sun' }
    },
    {
      id: 'work_with_wifi',
      name: 'Travailler avec le WiFi gratuit',
      description: 'S\'installer confortablement pour quelques heures de productivité',
      cost: { min: 5, max: 10 }, // Coût d'une consommation
      duration: 120,
      requirements: [{ type: 'laptop', value: 'recommended' }],
      availability: { openingHours: '07:00-19:00', daysOfWeek: 'Mon-Sun' }
    },
    {
      id: 'people_watch',
      name: 'Observer les passants en terrasse',
      description: 'Art de vivre parisien : contempler la vie urbaine',
      cost: { min: 3, max: 8 },
      duration: 45,
      availability: { openingHours: '07:00-22:00', daysOfWeek: 'Mon-Sun' }
    }
  ],
  
  // Pharmacie
  pharmacie: [
    {
      id: 'buy_basic_medicine',
      name: 'Acheter des médicaments de base',
      description: 'Aspirine, pansements, désinfectant...',
      cost: { min: 3, max: 15 },
      duration: 5,
      availability: { openingHours: '08:30-19:30', daysOfWeek: 'Mon-Sat' }
    },
    {
      id: 'health_consultation',
      name: 'Demander conseil au pharmacien',
      description: 'Consultation gratuite pour des maux bénins',
      cost: { min: 0, max: 0 },
      duration: 10,
      availability: { openingHours: '08:30-19:30', daysOfWeek: 'Mon-Sat' }
    }
  ],
  
  // Banque
  banque: [
    {
      id: 'withdraw_money',
      name: 'Retirer de l\'argent au DAB',
      description: 'Retrait d\'espèces au distributeur automatique',
      cost: { min: 0, max: 2 }, // Frais éventuels
      duration: 2,
      requirements: [{ type: 'bank_card', value: 'required' }],
      availability: { openingHours: '00:00-23:59', daysOfWeek: 'Mon-Sun' }
    },
    {
      id: 'meet_advisor',
      name: 'Rencontrer un conseiller',
      description: 'Prendre rendez-vous pour discuter finances',
      cost: { min: 0, max: 0 },
      duration: 30,
      requirements: [{ type: 'appointment', value: 'recommended' }],
      availability: { openingHours: '09:00-17:00', daysOfWeek: 'Mon-Fri' }
    }
  ]
};
