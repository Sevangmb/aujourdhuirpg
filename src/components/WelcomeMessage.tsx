
"use client";

import React from 'react';
import Image from 'next/image';

const WelcomeMessage: React.FC = () => {
  return (
    <div className="text-center p-8 mt-6 bg-card shadow-xl rounded-lg">
      <h1 className="text-3xl font-bold font-headline mb-4 text-primary">Aujourd'hui RPG</h1>
      <p className="text-lg text-muted-foreground mb-6">
        Bienvenue dans une aventure textuelle se déroulant à notre époque, en France.
      </p>
      <Image
        src="https://placehold.co/600x400.png"
        alt="Illustration du jeu RPG Aujourd'hui"
        data-ai-hint="Paris street adventure"
        className="rounded-lg shadow-md mx-auto mb-6"
        width={600}
        height={400}
      />
      <p className="text-foreground">
        Pour commencer, veuillez vous connecter, créer un compte, ou choisir de jouer anonymement en utilisant les options d'authentification ci-dessus.
      </p>
    </div>
  );
};

export default WelcomeMessage;
