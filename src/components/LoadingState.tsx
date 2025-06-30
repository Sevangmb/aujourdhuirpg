
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  loadingAuth: boolean;
  isLoadingState: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({ loadingAuth, isLoadingState }) => {
  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-background h-screen">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-xl font-headline">
        {loadingAuth ? "Vérification de l'authentification..." : "Chargement de votre aventure..."}
      </p>
    </main>
  );
};

export default LoadingState;