
"use client";

import type { Player } from '@/lib/types';
import PlayerSheet from './PlayerSheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { ScrollArea } from './ui/scroll-area'; // PlayerSheet handles its own internal scroll areas

interface CharacterProfileViewProps {
  player: Player | null;
}

const CharacterProfileView: React.FC<CharacterProfileViewProps> = ({ player }) => {
  if (!player) {
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Fiche Personnage</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Aucune donnée de personnage disponible.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="m-4 shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary text-center">
          Profil de {player.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        {/*
          PlayerSheet est conçu pour afficher beaucoup d'informations via des onglets
          et gère ses propres zones de défilement internes si nécessaire.
          Si ce composant CharacterProfileView est placé dans une zone qui ne défile pas
          et que le contenu de PlayerSheet devenait exceptionnellement haut,
          il faudrait envisager un ScrollArea ici.
        */}
        <PlayerSheet player={player} />
      </CardContent>
    </Card>
  );
};

export default CharacterProfileView;
